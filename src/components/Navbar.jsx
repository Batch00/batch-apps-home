import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "About", href: "#about" },
    { label: "Apps", href: "#apps" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f]">
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
              className="text-sm text-[#888888] hover:text-[#f5f5f5] transition-colors"
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
                className="text-sm text-[#888888] hover:text-[#f5f5f5] transition-colors py-1"
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
