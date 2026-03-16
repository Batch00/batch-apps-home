import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  const links = [
    { label: "About", href: "#about", id: "about" },
    { label: "Apps", href: "#apps", id: "apps" },
    { label: "Contact", href: "#contact", id: "contact" },
  ];

  useEffect(() => {
    const sectionIds = ["about", "apps", "contact"];
    const observers = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.3 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f]">
      {/* Electric blue top border line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#3b82f6]" />

      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <span className="text-lg font-bold text-[#f5f5f5] tracking-tight">
            Batch Apps
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] group-hover:shadow-[0_0_8px_#3b82f6] transition-shadow" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                activeSection === link.id
                  ? "text-[#3b82f6]"
                  : "text-[#888888] hover:text-[#f5f5f5]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[#888888] hover:text-[#f5f5f5] transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`text-sm transition-colors py-1 ${
                  activeSection === link.id
                    ? "text-[#3b82f6]"
                    : "text-[#888888] hover:text-[#f5f5f5]"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
