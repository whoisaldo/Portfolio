/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b0b0c",
          deep: "#050506",
          soft: "#141416",
        },
        smoke: "#17171a",
        bone: "#efece5",
        signal: {
          DEFAULT: "#ff3b30",
          deep: "#d91c12",
          soft: "#ff6a62",
        },
        ember: "#ffb020",
        void: {
          DEFAULT: "#0b0b0c",
          deep: "#050506",
          light: "#17171a",
        },
      },
      fontFamily: {
        sans: ["Fraunces", "ui-serif", "Georgia", "serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        widest2: "0.24em",
      },
      boxShadow: {
        signal: "0 0 40px -10px rgba(255,59,48,0.45)",
        "signal-lg": "0 0 60px -10px rgba(255,59,48,0.65)",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        ticker: "ticker 60s linear infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "scan": "scan 3.2s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
