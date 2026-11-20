import base from "./tailwind.config.js";

// Tailwind build for the BatchWrap page only (src/wrap/wrap.css loads it with @config).
// It shares the home design tokens and adds the wrap type scale on top.
//
// Type scale, largest first:
//   text-mega      the year on the opening chapter
//   text-display   one headline number per beat
//   text-headline  chapter statements ("countries", "days on the road")
//   text-title     sub-heads, top title names
//   text-lede      supporting sentence under a number
//   text-eyebrow   chapter label, always uppercase
//   text-caption   footnotes and stamps
/** @type {import('tailwindcss').Config} */
export default {
  ...base,
  content: ["./src/wrap/**/*.{js,jsx}"],
  corePlugins: { ...base.corePlugins, preflight: false },
  theme: {
    ...base.theme,
    extend: {
      ...base.theme.extend,
      colors: {
        ...base.theme.extend.colors,
        // Secondary text (ledes, captions): the lightest gray that still reads below
        // text-primary (#f5f5f5). About 9.4:1 on #0a0a0a; text-muted (#888) stays for labels.
        secondary: "#b3b3b3",
        dim: "#555555",
        faint: "#1c1c1c",
      },
      fontSize: {
        mega: ["clamp(6rem, 36vw, 22rem)", { lineHeight: "0.82", letterSpacing: "-0.065em", fontWeight: "800" }],
        display: ["clamp(4.5rem, 20vw, 12.5rem)", { lineHeight: "0.86", letterSpacing: "-0.055em", fontWeight: "800" }],
        headline: ["clamp(2.25rem, 7vw, 5.25rem)", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "700" }],
        title: ["clamp(1.5rem, 3.4vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" }],
        lede: ["clamp(1.125rem, 2vw, 1.5rem)", { lineHeight: "1.45", letterSpacing: "-0.01em", fontWeight: "400" }],
        eyebrow: ["0.75rem", { lineHeight: "1", letterSpacing: "0.22em", fontWeight: "600" }],
        caption: ["0.8125rem", { lineHeight: "1.45" }],
      },
      height: {
        stage: "100svh",
      },
      minHeight: {
        stage: "100svh",
      },
    },
  },
};
