// src/front/Stickers.jsx: the stickers in the homepage's margins.
//
// Each is die-cut: the mark itself with a white border that follows its
// outline, baked into the PNG by scripts/make-stickers.mjs from the sources
// in design/stickers/. They are decoration, so they are hidden from screen
// readers; the name is a tooltip for anyone who wonders what one is.
//
// Where the marks come from: Claude, OpenAI, Kiro and NVIDIA are lobe-icons
// (MIT), Porsche and the Audi rings are simple-icons (CC0), AWS, Philips and
// Pinnatec are the logos src/assets/PreviousExperience already carries,
// Jackal Motorsports and Integrated Engineering are their own marks from
// their own sites, and AMD's wordmark is from Wikimedia Commons (public
// domain there), set white on AMD red. Thorfinn's daggers, Gaara's gourd,
// Jett's Blade Storm kunai (drawn from Riot's ability icon), the eddie and
// the S4 and S6 badges were generated for this page with Codex's image tool.
import React from "react";
import amd from "../assets/front/stickers/amd.png";
import audi from "../assets/front/stickers/audi.png";
import aws from "../assets/front/stickers/aws.png";
import badgeS4 from "../assets/front/stickers/badge-s4.png";
import badgeS6 from "../assets/front/stickers/badge-s6.png";
import claude from "../assets/front/stickers/claude.png";
import daggers from "../assets/front/stickers/daggers.png";
import eddies from "../assets/front/stickers/eddies.png";
import gourd from "../assets/front/stickers/gourd.png";
import ie from "../assets/front/stickers/ie.png";
import jackal from "../assets/front/stickers/jackal.png";
import jett from "../assets/front/stickers/jett.png";
import kiro from "../assets/front/stickers/kiro.png";
import nvidia from "../assets/front/stickers/nvidia.png";
import openai from "../assets/front/stickers/openai.png";
import philips from "../assets/front/stickers/philips.png";
import pinnatec from "../assets/front/stickers/pinnatec.png";
import porsche from "../assets/front/stickers/porsche.png";

// `h` is the height it is shown at, in CSS pixels; the width follows.
const STICKERS = {
  amd: { label: "AMD", src: amd, h: 40 },
  audi: { label: "Audi", src: audi, h: 34 },
  aws: { label: "AWS", src: aws, h: 40 },
  s4: { label: "Audi S4", src: badgeS4, h: 30 },
  s6: { label: "Audi S6", src: badgeS6, h: 30 },
  claude: { label: "Claude", src: claude, h: 54 },
  daggers: { label: "Thorfinn's daggers", src: daggers, h: 76 },
  eddies: { label: "Eddies", src: eddies, h: 50 },
  gourd: { label: "Gaara's gourd", src: gourd, h: 70 },
  ie: { label: "Integrated Engineering", src: ie, h: 46 },
  jackal: { label: "Jackal Motorsports", src: jackal, h: 38 },
  jett: { label: "Jett's Blade Storm", src: jett, h: 72 },
  kiro: { label: "Kiro", src: kiro, h: 46 },
  nvidia: { label: "NVIDIA", src: nvidia, h: 44 },
  openai: { label: "OpenAI", src: openai, h: 48 },
  philips: { label: "Philips", src: philips, h: 56 },
  pinnatec: { label: "Pinnatec Auto", src: pinnatec, h: 50 },
  porsche: { label: "Porsche", src: porsche, h: 60 },
};

export function Sticker({ name }) {
  const s = STICKERS[name];
  return (
    <img
      src={s.src}
      alt=""
      title={s.label}
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      style={{ height: s.h }}
      className="block w-auto max-w-none drop-shadow-[0_5px_8px_rgb(0_0_0/0.55)] transition-transform duration-200 ease-out hover:scale-110 motion-reduce:transition-none"
    />
  );
}
