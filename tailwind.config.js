/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Slate ink — a near-black with a subtle violet undertone so the
        // whole canvas lives in the same family as the accents.
        ink: {
          DEFAULT: "#0e0d14",
          deep: "#08070d",
          soft: "#1a1822",
        },
        smoke: "#1c1a25",
        concrete: "#16151c",
        bone: "#efece5",
        // Primary brand accent — electric violet (the new "plum"). Token name
        // kept as `signal` throughout the codebase so we don't have to rewire
        // every reference; the colour now reads royal / synthwave.
        signal: {
          DEFAULT: "#a855f7",
          deep: "#7e22ce",
          soft: "#c084fc",
        },
        // ember + hud both retained as token names so existing class
        // references continue to work, but they now point at the same
        // electric violet as `signal`. One accent. Variants give us a softer
        // and a deeper hue so chrome can stand off from CTAs without
        // introducing a second colour.
        ember: "#c084fc",
        hud: {
          DEFAULT: "#a855f7",
          soft: "#c084fc",
          deep: "#7e22ce",
        },
        noise: "#6b7280",
      },
      fontFamily: {
        sans: ["Fraunces", "ui-serif", "Georgia", "serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        serif: ["Newsreader", "ui-serif", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        widest2: "0.24em",
        editorial: "0.32em",
      },
      boxShadow: {
        signal: "0 0 40px -10px rgba(168,85,247,0.45)",
        "signal-lg": "0 0 60px -10px rgba(168,85,247,0.65)",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        ticker: "ticker 60s linear infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "scan": "scan 3.2s linear infinite",
        "letter-rise": "letter-rise 0.85s cubic-bezier(0.2,0.7,0.2,1) forwards",
        "quote-swell": "quote-swell 0.9s cubic-bezier(0.4,0,0.2,1) forwards",
        "dot-drift": "dot-drift 6s ease-in-out infinite",
        "scan-sweep": "scan-sweep 2.4s linear infinite",
        "beam-trace": "beam-trace 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards",
        "signal-ping": "signal-ping 1.6s ease-in-out infinite",
        "glitch-rgb": "glitch-rgb 0.35s steps(8) 1",
        "boot-cursor": "boot-cursor 1s steps(2) infinite",
        "hud-pulse": "hud-pulse 2.4s ease-in-out infinite",
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
        "letter-rise": {
          "0%": { transform: "translateY(110%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "quote-swell": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        "dot-drift": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "10%": { opacity: "0.6" },
          "90%": { opacity: "0.6" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        "beam-trace": {
          "0%": { transform: "translateX(-110%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateX(110%)", opacity: "0" },
        },
        "signal-ping": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.4)" },
        },
        "glitch-rgb": {
          "0%, 100%": { transform: "translate(0)", opacity: "0" },
          "20%": { transform: "translate(-2px, 0)", opacity: "0.9" },
          "40%": { transform: "translate(2px, 0)", opacity: "0.7" },
          "60%": { transform: "translate(-1px, 1px)", opacity: "0.5" },
          "80%": { transform: "translate(1px, -1px)", opacity: "0.3" },
        },
        "boot-cursor": {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        "hud-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
