/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 12px 40px -12px rgba(139, 92, 246, .35)",
      },
    },
  },
  plugins: [],
};

