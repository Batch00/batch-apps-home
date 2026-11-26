import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captureScrollAnchor } from "../engine/scrollAnchor";
import { OwnerContext } from "./ownerContext";
import {
  SignInError,
  currentToken,
  devSampleRequested,
  fetchPrivateWrap,
  hasStoredSession,
  loadDevSample,
  readViewPref,
  signIn as signInWithPassword,
  signOut as clearSession,
  writeViewPref,
} from "./session";

const FETCH_TIMEOUT_MS = 10000;
// On load with a stored session, the page waits this long for the private view before showing
// the public one, so the owner does not see the story rebuild under them.
const SETTLE_MS = 4000;

const MESSAGES = {
  credentials: "That email and password do not match an account.",
  rate: "Too many attempts. Wait a minute, then try again.",
  network: "Sign-in could not reach the server. Try again in a moment.",
  forbidden: "That account is not the owner of this page, so it has been signed out. This page stays public.",
  unauthorized: "That sign-in did not hold. Try again.",
  unavailable: "Signed in, but the private view could not load. Try again in a moment.",
};

async function loadBlock(year) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const token = await currentToken();
    if (!token) return { status: "unauthorized" };
    return await fetchPrivateWrap(year, token, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export function OwnerProvider({ year, children }) {
  const [state, setState] = useState(() => ({
    status: devSampleRequested() || hasStoredSession() ? "checking" : "idle",
    block: null,
  }));
  const [view, setViewState] = useState(readViewPref);
  const [settled, setSettled] = useState(() => !hasStoredSession() && !devSampleRequested());
  const [dialogOpen, setDialogOpen] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Any change that adds or removes the private chapters keeps the reader where they are.
  const update = useCallback((next) => {
    captureScrollAnchor();
    setState(next);
  }, []);

  const check = useCallback(async () => {
    if (devSampleRequested()) {
      const block = await loadDevSample();
      if (alive.current) update(block ? { status: "owner", block } : { status: "idle", block: null });
      return;
    }
    try {
      const result = await loadBlock(year);
      if (!alive.current) return;
      if (result.status === "owner") update({ status: "owner", block: result.block });
      else {
        // A stored session that is not the owner's, or one Supabase no longer accepts, is
        // cleared quietly: this page has no other use for it.
        await clearSession();
        if (alive.current) update({ status: "idle", block: null });
      }
    } catch {
      if (alive.current) update({ status: "unavailable", block: null });
    }
  }, [year, update]);

  useEffect(() => {
    if (state.status !== "checking") return undefined;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    check().finally(() => {
      clearTimeout(timer);
      if (alive.current) setSettled(true);
    });
    return () => clearTimeout(timer);
    // Runs once on load; later checks go through signIn and retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      try {
        const token = await signInWithPassword(email, password);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let result;
        try {
          result = await fetchPrivateWrap(year, token, controller.signal);
        } catch {
          // Signed in, but nothing to show yet: keep the session so a retry can load it.
          update({ status: "unavailable", block: null });
          return { ok: false, message: MESSAGES.unavailable };
        } finally {
          clearTimeout(timer);
        }
        if (result.status !== "owner") {
          await clearSession();
          update({ status: "idle", block: null });
          return { ok: false, message: MESSAGES[result.status] };
        }
        writeViewPref("private");
        setViewState("private");
        update({ status: "owner", block: result.block });
        setDialogOpen(false);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: MESSAGES[err instanceof SignInError ? err.kind : "network"] };
      }
    },
    [year, update],
  );

  const signOut = useCallback(async () => {
    update({ status: "idle", block: null });
    await clearSession();
  }, [update]);

  const setView = useCallback((next) => {
    captureScrollAnchor();
    writeViewPref(next);
    setViewState(next);
  }, []);

  const retry = useCallback(() => {
    setState({ status: "checking", block: null });
    check();
  }, [check]);

  const value = useMemo(
    () => ({
      status: state.status,
      block: state.block,
      view,
      showPrivate: state.status === "owner" && view === "private" && Boolean(state.block),
      settled,
      dialogOpen,
      openSignIn: () => setDialogOpen(true),
      closeSignIn: () => setDialogOpen(false),
      signIn,
      signOut,
      setView,
      retry,
    }),
    [state, view, settled, dialogOpen, signIn, signOut, setView, retry],
  );

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
}
