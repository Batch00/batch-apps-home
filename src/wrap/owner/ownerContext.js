import { createContext, useContext } from "react";

// The owner's sign-in state, shared by the top bar, the closing chapter and the story.
//   status       "idle" (signed out), "checking", "owner" (private block loaded) or
//                "unavailable" (signed in, but the private view could not load)
//   view         "private" or "public": the owner's choice, remembered on this device
//   showPrivate  true when the private chapters are on screen
//   block        the private block, in memory only
//   settled      false while a stored session is still being checked on load
export const OwnerContext = createContext({
  status: "idle",
  view: "public",
  showPrivate: false,
  block: null,
  settled: true,
  dialogOpen: false,
  openSignIn: () => {},
  closeSignIn: () => {},
  signIn: async () => ({ ok: false }),
  signOut: async () => {},
  setView: () => {},
  retry: () => {},
});

export function useOwner() {
  return useContext(OwnerContext);
}
