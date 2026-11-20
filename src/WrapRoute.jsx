import { Suspense, lazy } from "react";

// The BatchWrap page is a lazy chunk (JS and CSS), so the home page never downloads it.
const WrapApp = lazy(() => import("./wrap/WrapApp.jsx"));

export default function WrapRoute({ year }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <WrapApp year={year} />
    </Suspense>
  );
}
