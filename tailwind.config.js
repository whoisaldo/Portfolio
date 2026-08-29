/** @type {import('tailwindcss').Config} */

// Palette notes
// -------------
// The previous system was violet: `signal` #7b45f7, `hud` #6d5fa8 and `ember`
// #ff9538 over near-blacks with a violet undertone, derived by sampling the
// eight KeyArt plates. That was correct for an editorial-HUD site and it is
// wrong for this one.
//
// Cyberpunk 2077's UI is not "neon everything". It is a dirty sodium yellow on
// carbon black, used at a fraction of the surface, with one hot secondary and
// a red reserved for danger. The three rules that keep it from becoming the
// generic neon-cyberpunk pastiche:
//
//   1. The ground is NEUTRAL carbon black. No violet undertone, no blue-black.
//      CP2077's black is the absence of light, not a dark colour.
//   2. `volt` is signage. It marks the thing you can act on and nothing else.
//      If it covers much more than about 5% of a screen it has stopped meaning
//      anything, which is the failure mode of every neon mockup.
//   3. `cyan` is NOT a UI token. It exists only as one half of the chromatic
//      split in .chromatic-aberration. It is an artifact of a glitch, never a
//      colour anything is painted in. Do not add `text-cyan` utilities.
//
// Three interactive roles, three genuinely different values:
//   volt    : primary. CTAs, focus, status, the current thing. Advances.
//   fuchsia : secondary. Links, hovers, the Edgerunners register.
//   line    : structural chrome. Rules, panel edges, brackets. Recedes.
//
// Per-project accents live on in `--accent`, but their values changed. See the
// note at the top of src/data/projects.js: the old ones were sampled from the
// violet rim light every KeyArt plate shares, which read as leftovers the
// moment the chrome stopped being violet. Experience accents did NOT change:
// #FF9900, #4FC3F7 and #C8102E are AWS, Philips and Northeastern's real brand
// colours, which is identity rather than decoration.

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0a0c",
          deep: "#050506",
          raised: "#131316",
          line: "#24242a",
        },
        // Warm off-white. Never #fff, because pure white on true black vibrates, and
        // the whole page is true black.
        bone: "#eceae4",

        // Primary. The 2077 yellow.
        volt: {
          DEFAULT: "#fcee0a",
          deep: "#b8ad00",
          dim: "#5f5a10",
        },
        // Secondary. Edgerunners magenta.
        fuchsia: {
          DEFAULT: "#ff2e88",
          deep: "#c4004f",
          dim: "#5e1436",
        },

        // Status.
        blood: "#ff003c",
        ok: "#00e5a0",

        // Per-project accent, written to --accent by the card and the page.
        accent: "rgb(var(--accent) / <alpha-value>)",
      },

      // Four text levels, rebased on the new bone. Same structure as before:
      // it replaced a seventeen-step `text-bone/NN` slider and that fix holds.
      textColor: {
        primary: "#eceae4",
        muted: "rgb(236 234 228 / 0.72)",
        dim: "rgb(236 234 228 / 0.46)",
        faint: "rgb(236 234 228 / 0.26)",
      },

      fontFamily: {
        // Chakra Petch carries clipped corners in the glyphs themselves, which
        // is the thing Orbitron only imitates with a rounded geometric skeleton.
        display: ["'Chakra Petch'", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Barlow", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono Variable'", "'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      // Ten named steps and no others. Four display, three prose, three mono.
      // Anything reaching for text-[13.5px] is reaching for a step that should
      // have been named here instead.
      fontSize: {
        // Display: Chakra Petch, uppercase. Sizes are fluid because the hero
        // has to survive a 375px phone and a 1920px monitor with one value.
        "display-hero": ["clamp(3.5rem, 13vw, 13rem)", { lineHeight: "0.86", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-1": ["clamp(2.75rem, 7vw, 5.5rem)", { lineHeight: "0.92", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-2": ["clamp(1.75rem, 3.5vw, 2.75rem)", { lineHeight: "1", letterSpacing: "-0.015em", fontWeight: "600" }],
        "display-3": ["1.375rem", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "600" }],

        // Mono: data, chrome, anything you read as a value rather than a
        // sentence. Tracking loosens as size drops, which is the only way 10px
        // uppercase stays legible.
        "mono-ui": ["0.8125rem", { lineHeight: "1.3", letterSpacing: "0.1em" }],
        "mono-label": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.18em" }],
        "mono-micro": ["0.625rem", { lineHeight: "1.2", letterSpacing: "0.22em" }],
      },

      spacing: {
        gutter: "clamp(1.25rem, 4vw, 5rem)",
      },

      transitionTimingFunction: {
        // Fast out, hard stop. CP2077 UI does not ease gently into place.
        out: "cubic-bezier(0.16, 0.9, 0.25, 1)",
      },

      animation: {
        "signal-ping": "signal-ping 1.6s ease-in-out infinite",
        "beam-trace": "beam-trace 0.7s cubic-bezier(0.16,0.9,0.25,1) forwards",
        caret: "caret 1s steps(2) infinite",
      },

      keyframes: {
        // The one looping animation on the site. It belongs to the "Now" flag,
        // which reports something true.
        "signal-ping": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.4)" },
        },
        // The block caret after the boot greeting, once it finishes typing.
        caret: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        "beam-trace": {
          "0%": { transform: "translateX(-110%)", opacity: "0" },
          "10%, 90%": { opacity: "1" },
          "100%": { transform: "translateX(110%)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
