import { Mail, Github } from "lucide-react";
import { useFadeIn } from "../hooks/useFadeIn";

const links = [
  {
    label: "Email",
    href: "mailto:carsonb1723@gmail.com",
    icon: Mail,
    display: "carsonb1723@gmail.com",
  },
  {
    label: "GitHub",
    href: "https://github.com/Batch00",
    icon: Github,
    display: "github.com/Batch00",
  },
];

export default function Contact() {
  const ref = useFadeIn();

  return (
    <section id="contact" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="fade-in-section text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
            Contact
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] mb-4">
            Get in touch
          </h2>
          <p className="text-[#888888] mb-12 max-w-md mx-auto">
            Have a question or want to follow along? Find me here.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {links.map(({ label, href, icon: Icon, display }) => (
              <a
                key={label}
                href={href}
                target={label === "GitHub" ? "_blank" : undefined}
                rel={label === "GitHub" ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-[#111111] border border-[#222222] hover:border-[#3b82f6]/40 hover:bg-[#111111] text-[#888888] hover:text-[#f5f5f5] transition-all group"
              >
                <Icon
                  size={18}
                  className="text-[#3b82f6] group-hover:text-[#60a5fa] transition-colors"
                />
                <span className="text-sm font-medium">{display}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
