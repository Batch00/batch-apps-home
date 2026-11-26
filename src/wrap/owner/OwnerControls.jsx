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

// Top bar, signed in as the owner: the view badge, the one-tap toggle, and sign out.
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
      <p role="status" className="contents">
        {isPrivate ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-caption font-semibold text-white">
            <Lock size={13} aria-hidden="true" />
            Private view
          </span>
        ) : (
          <span className="sr-only">Public view</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => owner.setView(isPrivate ? "public" : "private")}
        className={`${QUIET_BUTTON} border border-border px-3 py-1.5 text-text-primary hover:border-accent hover:text-accent`}
      >
        {isPrivate ? <Eye size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
        {isPrivate ? "Public view" : "Private view"}
      </button>
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
