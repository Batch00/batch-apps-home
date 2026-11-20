/** @type {import('tailwindcss').Config} */
export default {
  // src/wrap has its own Tailwind build (tailwind.wrap.config.js) that ships in the
  // lazy wrap chunk, so wrap-only classes never reach the home page CSS.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "!./src/wrap/**",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        "surface-2": "#141414",
        border: "#222222",
        "border-subtle": "#1f1f1f",
        "text-primary": "#f5f5f5",
        "text-muted": "#888888",
        accent: "#3b82f6",
        "accent-hover": "#60a5fa",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
