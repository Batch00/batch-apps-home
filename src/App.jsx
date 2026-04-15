import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AppsGrid from "./components/AppsGrid";
import RequestAccess from "./components/RequestAccess";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import SetupPassword from "./pages/SetupPassword";

const isSetupPassword = window.location.pathname === "/setup-password";

export default function App() {
  if (isSetupPassword) {
    return <SetupPassword />;
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
