import { Eye, Lock, LogOut, RotateCw } from "lucide-react";
import { useOwner } from "./ownerContext";

const QUIET_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full text-caption font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// Top bar, signed out: a discreet way in. A lock icon on phones, words from sm up.
function SignInButton() {
  const owner = useOwner();
  return (
    <button
      type="button"
      onClick={owner.openSignIn}
      className={`${QUIET_BUTTON} -mr-2 p-2 text-dim hover:text-text-primary sm:mr-0 sm:px-0`}
    >
      <Lock size={14} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Owner sign in</span>
    </button>
  );
}

function SignOutButton() {
  const owner = useOwner();
  return (
    <button
      type="button"
      onClick={owner.signOut}
      className={`${QUIET_BUTTON} p-2 text-text-muted hover:text-text-primary`}
      title="Sign out"
    >
      <LogOut size={16} aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">Sign out</span>
    </button>
  );
}

// One side of the view switch. The active side is filled; the other is a quiet tap target.
function ViewOption({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 py-1.5 text-caption font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active ? "bg-accent text-white" : "bg-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {children}
    </button>
  );
}

// Top bar, signed in as the owner: a segmented [Private | Public] switch, then sign out.
// The choice is remembered on this device (OwnerProvider, localStorage batchwrap:view).
export function OwnerControls() {
  const owner = useOwner();

  if (owner.status === "idle") return <SignInButton />;
  if (owner.status === "checking") return null;

  if (owner.status === "unavailable") {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <button type="button" onClick={owner.retry} className={`${QUIET_BUTTON} px-2 py-1.5 text-secondary hover:text-text-primary`}>
          <RotateCw size={14} aria-hidden="true" />
          Private view failed, retry
        </button>
        <SignOutButton />
      </div>
    );
  }

  const isPrivate = owner.showPrivate;
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <p role="status" className="sr-only">
        {isPrivate ? "Private view" : "Public view"}
      </p>
      <div role="group" aria-label="View" className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
        <ViewOption active={isPrivate} onClick={() => !isPrivate && owner.setView("private")} icon={Lock}>
          Private
        </ViewOption>
        <ViewOption active={!isPrivate} onClick={() => isPrivate && owner.setView("public")} icon={Eye}>
          Public
        </ViewOption>
      </div>
      <SignOutButton />
    </div>
  );
}

// Closing chapter, private view: what this view shows.
export function ClosingOwnerNote() {
  const owner = useOwner();
  if (!owner.showPrivate) return null;
  return (
    <p className="mt-3 flex max-w-xl items-center gap-2 text-caption text-accent">
      <Lock size={13} aria-hidden="true" />
      Private view. Amounts, trip names and dates are shown to you only.
    </p>
  );
}

// Closing chapter, signed out: the same discreet way in as the top bar.
export function ClosingSignIn() {
  const owner = useOwner();
  if (owner.status !== "idle") return null;
  return (
    <p className="mt-10">
      <button
        type="button"
        onClick={owner.openSignIn}
        className={`${QUIET_BUTTON} text-dim underline decoration-dim/50 underline-offset-4 hover:text-text-primary`}
      >
        Owner sign in
      </button>
    </p>
  );
}
