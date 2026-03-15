/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
