/** @type {import('tailwindcss').Config} */

// Palette notes
// -------------
// The previous accent was #a855f7 — stock Tailwind `purple-500`, with
// #c084fc (`purple-400`) and #7e22ce (`purple-700`) as its variants. Worse,
// `signal`, `hud` and `ember` were three names pointing at those same two
// values, so every hierarchy decision made with them was a no-op: gradients
// ran from a colour to itself, and the terminal rendered errors and successes
// identically.
//
// The violets below are derived from the artwork rather than picked. Sampling
// the eight KeyArt plates (scripts in scratchpad; hue-bucketed, weighted by
// saturation x value) shows every plate shares a rim light at hue 251-262 —
// that shared light is why the eight read as a set. These tokens sit at hue
// 256, a luminous version of the same light.
//
// Three roles, three genuinely different values:
//   signal — interactive. CTAs, links, the focused thing. Advances.
//   hud    — structural chrome. Rules, labels, brackets. Recedes.
//   ember  — status: shipped / live / now. The only warm hue on the site.
//
// Per-project accents live in src/data/projects.js, also sampled from each
// plate. The reel writes the focused project's hex to --accent, so `accent-*`
// utilities tint chrome to whatever you are currently looking at.

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Near-blacks with a violet undertone, so the canvas sits in the same
        // family as the accents and as the KeyArt ground (#08070d is the
        // literal backdrop those plates were rendered on).
        ink: {
          DEFAULT: "#0e0d14",
          deep: "#08070d",
          raised: "#16151c",
          line: "#221f2e",
        },
        bone: "#efece5",

        // Interactive.
        signal: {
          DEFAULT: "#7b45f7",
          soft: "#9b72ff",
          deep: "#4c1fb8",
        },
        // Structural chrome — deliberately quieter than `signal` so labels and
        // rules sit behind the things you can actually click.
        hud: {
          DEFAULT: "#6d5fa8",
          soft: "#8b7fc4",
          deep: "#3a3358",
        },
        // Status: live / shipped / current. Sodium-vapour amber — street
        // lighting rather than synthwave, and the only warm hue in the system.
        ember: {
          DEFAULT: "#ff9538",
          soft: "#ffb473",
          deep: "#b35f14",
        },

        // Terminal semantics. These used to all render as the same violet.
        ok: "#36d686",
        err: "#ff3d64",

        // Per-project accent, written to --accent by the reel.
        accent: "rgb(var(--accent) / <alpha-value>)",
      },

      // Four text levels replacing the seventeen-step `text-bone/NN` slider
      // the old sheet had drifted into (/15 /20 /25 /30 /35 /40 /45 /50 /55
      // /60 /65 /70 /75 /80 /85 /90 /95 — several of which are perceptually
      // identical and were used interchangeably).
      textColor: {
        primary: "#efece5",
        muted: "rgb(239 236 229 / 0.72)",
        dim: "rgb(239 236 229 / 0.48)",
        faint: "rgb(239 236 229 / 0.28)",
      },

      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        serif: ["Newsreader", "ui-serif", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        label: "0.22em",
        editorial: "0.32em",
      },
      // A real scale, replacing twelve arbitrary pixel values (including a
      // `text-[12.5px]` that appeared twice — nobody designs a 12.5px step).
      fontSize: {
        micro: ["0.625rem", { lineHeight: "1.2", letterSpacing: "0.22em" }],
        label: ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.18em" }],
      },
      spacing: {
        gutter: "clamp(1.25rem, 4vw, 5rem)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      animation: {
        "signal-ping": "signal-ping 1.6s ease-in-out infinite",
        "boot-cursor": "boot-cursor 1s steps(2) infinite",
        "beam-trace": "beam-trace 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards",
        marquee: "marquee 40s linear infinite",
      },
      keyframes: {
        "signal-ping": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.4)" },
        },
        "boot-cursor": {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        "beam-trace": {
          "0%": { transform: "translateX(-110%)", opacity: "0" },
          "10%, 90%": { opacity: "1" },
          "100%": { transform: "translateX(110%)", opacity: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
