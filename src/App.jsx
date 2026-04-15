import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AppsGrid from "./components/AppsGrid";
import RequestAccess from "./components/RequestAccess";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";

const SetupPassword = lazy(() => import("./pages/SetupPassword"));

export default function App() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const isAuthCallback = hash.includes("access_token") && hash.includes("type=invite");

  if (path === "/setup-password" || isAuthCallback) {
    return (
      <Suspense fallback={null}>
        <SetupPassword />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <AppsGrid />
        <RequestAccess />
        <About />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
