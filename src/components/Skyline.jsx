// src/components/Skyline.jsx: the city behind the hero, alive.
//
// The painted plate (src/assets/Intro/Skyline.png) is a still: a megacity
// across a bay at night, held almost black. What this adds is the part of a
// night city that moves. Four signs mounted on the rooftops of the plate's
// towers, lit in the world's own brands; haze drifting across the buildings;
// the signs mirrored in the water below the waterline, with a ripple; and all
// of the light breathing with the track through the --level and --bass
// variables src/lib/reactive.js writes onto <html>. In silence it holds.
//
// The signs are HTML text, not paint, for three reasons: they stay crisp at
// any size, they can flicker, and a screen reader is told they are
// decoration (the whole layer is aria-hidden) rather than being read a
// generated picture of the word ARASAKA. They are positioned in percentages
// of the PLATE, inside a CoverBox, so a sign mounted on a tower stays on that
// tower under the cover-crop every viewport applies differently.
//
// Readability is the constraint the hero already solves and this must not
// undo: the name and the ledger sit on the left, over the plate's darkest
// band and under the gradient Hero.jsx paints. Every sign is mounted in the
// right half of the plate, the haze is a few percent of white at most, and
// the reflections live in the water, below the ledger. Nothing here is text
// a reader is meant to read, and none of it sits behind text they are.
//
// Each of the four effects has a switch in src/lib/env.js (`signs`, `haze`,
// `wet`, `reactive`), which the console exposes, and each is CSS that stops
// drawing when its switch is off. Under prefers-reduced-motion the haze and
// the water hold still and nothing flickers.
import React from "react";
import CoverBox from "./ui/CoverBox";
import Picture from "./Picture";
import { img } from "../data/images";
import { useMediaQuery } from "../hooks";

const SKYLINE = img("Intro/Skyline");

// Where the plate's water starts, as a percentage of its height. The signs
// are mirrored about this line.
const WATERLINE = 72.5;

// Rooftop signs. `x`, `y` are the mount point on the plate, read off a grid.
// Colours are the world's, held to the site's tokens: Arasaka's red is the
// site's `blood`, Militech takes the sodium yellow, the Afterlife is
// magenta, and a ripperdoc's sign is the white-and-red cross of the game's
// clinics. Sizes are fractions of the plate's width, so a sign on a distant
// tower is small on a phone and small on a monitor.
//
// Placement was measured, not guessed: at 1440x900 the hero's name ends
// around x 1080 and its ledger starts at y 481, so the four mounts below sit
// on rooftops that land right of the name or in the band above the ledger,
// with the city lifted by Hero.jsx on large screens. A sign that falls
// behind a panel on some other viewport is a sign on a building behind a
// panel, which is what a city does; the four are spread so that at least
// two show at every common size.
const SIGNS = [
  { id: "arasaka", text: "ARASAKA", x: 84.5, y: 43.5, size: 0.0125, color: "#ff003c", flicker: false, glow: 1 },
  { id: "militech", text: "MILITECH", x: 77.5, y: 50.5, size: 0.0095, color: "#fcee0a", flicker: false, glow: 0.8 },
  { id: "afterlife", text: "AFTERLIFE", x: 47.5, y: 60.4, size: 0.0092, color: "#ff2e88", flicker: true, glow: 1 },
  { id: "ripperdoc", text: "RIPPERDOC", x: 56.6, y: 59.6, size: 0.0082, color: "#eceae4", cross: true, flicker: true, glow: 0.7 },
];

function Sign({ s, mirrored = false }) {
  return (
    <div
      className={`sky-sign ${s.flicker ? "sky-sign-flicker" : ""} ${mirrored ? "is-mirror" : ""}`}
      style={{
        left: `${s.x}%`,
        top: `${s.y}%`,
        "--sign": s.color,
        "--sign-size": s.size,
        "--sign-glow": s.glow,
      }}
    >
      <span className="sky-sign-face">
        {s.cross && <span className="sky-sign-cross" />}
        {s.text}
      </span>
    </div>
  );
}

export default function Skyline({ className = "" }) {
  // A phone shows a fifth of the plate's width. Looking further right puts
  // the tower cluster, and Militech's sign, in that fifth; on a wide screen
  // the crop is gentle and 64% keeps the whole bay in view.
  const portrait = useMediaQuery("(orientation: portrait)");
  return (
    <CoverBox
      width={SKYLINE.width}
      height={SKYLINE.height}
      focus={{ x: portrait ? 80 : 64, y: 58 }}
      className={`sky ${className}`}
      aria-hidden="true"
    >
      <Picture sources={SKYLINE} alt="" sizes="100vw" fetchPriority="high" className="absolute inset-0 w-full h-full opacity-90" />

      {/* Haze: two soft bodies of light drifting across the city at different
          speeds, screen-blended so they only ever brighten. */}
      <div className="sky-haze sky-haze-a" />
      <div className="sky-haze sky-haze-b" />

      {/* Light on the water: slow vertical streaks under the city, which is
          what makes the bay read as wet rather than as black paint. */}
      <div className="sky-water" style={{ top: `${WATERLINE}%` }} />

      {/* The signs, and their reflections mirrored about the waterline. */}
      <div className="sky-signs">
        {SIGNS.map((s) => <Sign key={s.id} s={s} />)}
      </div>
      <div className="sky-reflect" style={{ transformOrigin: `50% ${WATERLINE}%` }}>
        {SIGNS.map((s) => <Sign key={s.id} s={s} mirrored />)}
      </div>
    </CoverBox>
  );
}
