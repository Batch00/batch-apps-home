import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AppsGrid from "./components/AppsGrid";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <AppsGrid />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
