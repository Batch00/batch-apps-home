import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captureScrollAnchor } from "../engine/scrollAnchor";
import { OwnerContext } from "./ownerContext";
import {
  SignInError,
  devSampleRequested,
  hasStoredSession,
  loadDevSample,
  loadStoredSession,
  readViewPref,
  signInAndLoad,
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
  unavailable: "Signed in, but the private view could not load. Try again in a moment.",
};

// Runs one of the session flows with a timeout on the private request.
async function withTimeout(run) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await run(controller.signal);
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
    let result;
    try {
      result = await withTimeout((signal) => loadStoredSession(year, signal));
    } catch {
      result = { status: "unavailable" };
    }
    if (!alive.current) return;
    // "idle": no session, or the API said it is not the owner's (session.js cleared it).
    // "unavailable": the session is kept, and the top bar offers a retry.
    update(result.status === "owner" ? { status: "owner", block: result.block } : { status: result.status, block: null });
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
      let result;
      try {
        // The token from signInWithPassword goes straight to the API (session.js).
        result = await withTimeout((signal) => signInAndLoad(year, email, password, signal));
      } catch (err) {
        return { ok: false, message: MESSAGES[err instanceof SignInError ? err.kind : "network"] };
      }
      if (result.status === "owner") {
        writeViewPref("private");
        setViewState("private");
        update({ status: "owner", block: result.block });
        setDialogOpen(false);
        return { ok: true };
      }
      // forbidden: signed out again. unavailable: still signed in, so the top bar shows a retry.
      update({ status: result.status === "forbidden" ? "idle" : "unavailable", block: null });
      return { ok: false, message: MESSAGES[result.status] };
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
