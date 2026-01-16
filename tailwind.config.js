/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#0a0a0f",
          deep: "#050508",
          light: "#12121a",
        },
        accent: {
          purple: "#a855f7",
          violet: "#8b5cf6",
          fuchsia: "#d946ef",
          pink: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(168, 85, 247, .5)",
        "glow-lg": "0 0 60px -12px rgba(168, 85, 247, .6)",
        "purple": "0 0 30px rgba(168, 85, 247, .4), 0 0 60px rgba(139, 92, 246, .2)",
      },
      animation: {
        "marquee": "marquee 30s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
