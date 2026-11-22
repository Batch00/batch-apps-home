import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("main > section");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-[3.25rem] right-4 z-40 p-2 rounded-full bg-[#111111] border border-[#222222] text-[#3b82f6] hover:border-[#3b82f6]/40 hover:bg-[#1a1a1a] transition-all shadow-lg sm:bottom-[88px] sm:right-8 sm:p-3"
      aria-label="Back to top"
    >
      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
    </button>
  );
}
