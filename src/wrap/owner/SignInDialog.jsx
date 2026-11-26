import { useEffect, useId, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { useOwner } from "./ownerContext";

const FIELD =
  "mt-2 block w-full rounded-lg border border-border bg-background px-3.5 py-3 font-sans text-[16px] text-text-primary placeholder:text-dim transition-colors focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

// Email and password sign-in for the page's owner, in a native modal dialog (focus stays inside,
// Escape closes it). Beat navigation ignores taps and keys inside a dialog.
export function SignInDialog() {
  const owner = useOwner();
  const ref = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ids = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (owner.dialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!owner.dialogOpen && dialog.open) {
      dialog.close();
    }
  }, [owner.dialogOpen]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const result = await owner.signIn(email.trim(), password);
    setBusy(false);
    setPassword("");
    if (!result.ok) setMessage(result.message);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${ids}-title`}
      aria-describedby={`${ids}-note`}
      onClose={() => {
        // Escape, the close button, a backdrop tap or a successful sign-in: start clean next time.
        setMessage("");
        setPassword("");
        owner.closeSignIn();
      }}
      onClick={(event) => {
        // A tap on the backdrop (the dialog element itself, outside the panel) closes it.
        if (event.target === event.currentTarget) owner.closeSignIn();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm bg-transparent p-0 text-text-primary backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="relative rounded-2xl border border-border bg-surface p-6 font-sans sm:p-7">
        <button
          type="button"
          onClick={owner.closeSignIn}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-2 text-text-muted transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <p className="flex items-center gap-2 text-eyebrow uppercase text-accent">
          <Lock size={14} aria-hidden="true" />
          Owner only
        </p>
        <h2 id={`${ids}-title`} className="mt-4 text-title text-text-primary">
          Owner sign in
        </h2>
        <p id={`${ids}-note`} className="mt-2 text-caption text-secondary">
          Adds the private chapters for the owner of this page. Everyone else sees the public view.
        </p>

        <label className="mt-6 block text-caption font-medium text-secondary" htmlFor={`${ids}-email`}>
          Email
          <input
            id={`${ids}-email`}
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="mt-4 block text-caption font-medium text-secondary" htmlFor={`${ids}-password`}>
          Password
          <input
            id={`${ids}-password`}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={FIELD}
          />
        </label>

        <p role="alert" className={`text-caption text-[#fca5a5] ${message ? "mt-4" : ""}`}>
          {message}
        </p>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-caption font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {busy ? "Signing in" : "Sign in"}
        </button>
      </form>
    </dialog>
  );
}
