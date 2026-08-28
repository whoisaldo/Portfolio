// src/data/life.js — the photographs, and what they are.
//
// scripts/optimize-photos.mjs owns the pixels; this file owns the words. Kept
// apart on purpose: regenerating the encoder output must never be able to
// clobber a caption.
//
// HOW TO WRITE A CAPTION HERE
//
// Plainly, and only about things you know. The register to match is Ali's own,
// from the console's fun-fact list:
//
//   "Daily driver is a fully built supercharged Audi S4 (B8.5). 540 whp.
//    Tuned it myself."
//   "I refused to pay $40 for an iPad-as-second-display app that lagged.
//    Wrote my own in Rust + SwiftUI."
//
// Short sentences. A real number where there is one. No build-up, and no
// sentence that states a thing and then inverts it to sound clever — an
// earlier pass wrote all seven captions that way and they read as written to
// sound good rather than to say something.
//
// `body: null` is not an oversight. Several of these need context only Ali
// has — which car, how many years wrestling, a solve time — and a caption that
// guesses is worse than no caption. The UI omits the paragraph entirely when
// body is null. Each one carries a TODO naming exactly what is missing.
//
// `date` is read from the file's EXIF, never estimated. Two photos carry no
// original capture date; theirs is null and the UI omits the line.
import { photo } from "./photos";

// Shot on the walk to the office in Seattle during the AWS term, which is why
// the sleeve reads AWS CloudFormation.
//
// The source is a mirrored front-camera selfie; the encoded asset is flipped
// back so the sleeve badge reads forwards. See scripts/optimize-photos.mjs.
export const portrait = {
  image: photo("portrait-seattle"),
  alt: "Ali Younes on a residential street in Seattle, wearing an AWS CloudFormation hoodie and over-ear headphones.",
  caption: "Seattle, July 2026.",
};

// Photos belonging to a specific job, keyed by the `company` field in
// src/data/experience.js. Experience.jsx and WorkPage.jsx look them up by that
// key, so a company with no photos renders exactly as it did before.
export const workPhotos = {
  "Amazon Web Services": [
    {
      image: photo("kiro-launch"),
      alt: "Ali Younes seated, speaking on camera at a Kiro launch event, with an on-screen caption reading 'Ali Younes, SDE Intern, AWS'.",
      caption: "Kiro launch event, July 2026.",
      note: "Talking about the dual-model code review tool. Kiro put it on their LinkedIn.",
    },
    {
      image: photo("amazon-orientation"),
      alt: "Ali Younes in a photo booth on his first day at Amazon, holding a cutout of the Amazon smile logo.",
      caption: "First day, July 2026.",
    },
  ],
};

// Everything else.
export const teardown = {
  id: "teardown",
  title: "Teardown",
  lede: "Cars, phones, breadboards. If it has screws in it I have probably had it open.",
  photos: [
    {
      slug: "bmw-carplay-retrofit",
      image: photo("bmw-carplay-retrofit"),
      date: "December 2023",
      title: "CarPlay retrofit",
      // TODO(Ali): which car, and what it took. The marque is deliberately not
      // named here — the console says the daily is an Audi S4 B8.5, the source
      // filename says BMW, and guessing between them is exactly the kind of
      // unverifiable claim docs/PROJECT_CONTEXT.md exists to prevent.
      alt: "A car dashboard with the trim, vents and head unit removed and the wiring exposed, photographed from the driver's seat at night.",
      body: "Head unit out, and most of the dash came with it.",
      span: "tall",
    },
    {
      slug: "bmw-engine-bay",
      image: photo("bmw-engine-bay"),
      date: "October 2025",
      title: "Front end off",
      // TODO(Ali): what was actually being done here, and to which car.
      alt: "An open engine bay at night with the front bodywork removed, hoses and the coolant reservoir visible, a hand reaching in at the lower right.",
      body: "Everything ahead of the engine had to come off first.",
      span: "tall",
    },
    {
      slug: "bmw-tuning-module",
      image: photo("bmw-tuning-module"),
      date: "October 2025",
      title: "Tuning module",
      // TODO(Ali): what the module is, and whether you were installing it or
      // reading the board.
      alt: "A tuning module with its case opened, exposing a green circuit board with several ICs, sitting in an engine bay next to a flash cable.",
      body: null,
      span: "wide",
    },
    {
      slug: "iphone-teardown",
      image: photo("iphone-teardown"),
      date: null,
      title: "Screen replacement",
      alt: "An iPhone opened like a book on a desk, display assembly lifted away from the battery and logic board, a backlit keyboard behind it.",
      body: "Display assembly off, battery and logic board exposed. The adhesive is the part that takes the time.",
      span: "wide",
    },
    {
      slug: "breadboard",
      image: photo("breadboard"),
      date: null,
      title: "Breadboard",
      // TODO(Ali): what the circuit was for, if it was for anything.
      alt: "A breadboard with a microcontroller, jumper wires and a lit red LED, a finger pressing a button on a second breadboard.",
      body: "A microcontroller, a button, and an LED that does what it is told.",
      span: "tall",
    },
    {
      slug: "wrestling",
      image: photo("wrestling"),
      date: "February 2023",
      title: "Wrestling",
      // TODO(Ali): years wrestled, weight class, record — any of it. None of
      // that is in the repo, so none of it is asserted here.
      alt: "A wrestling match in progress on a mat, two wrestlers on the ground, spectators in the bleachers behind.",
      body: null,
      span: "wide",
    },
    {
      slug: "rubiks-cube",
      image: photo("rubiks-cube"),
      date: "November 2023",
      title: "Cube",
      // TODO(Ali): a personal best belongs here if you have one.
      alt: "A Rubik's cube held in one hand above a desk, partially solved.",
      body: null,
      span: "tall",
    },
  ],

  // The things with no photograph. Lifted verbatim in substance from the
  // console's `interests` output, which is where all of this used to live —
  // and which is now an easter egg, so without this the facts would have left
  // the site entirely. Ali's own words, trimmed.
  notPictured: [
    "Daily driver is a fully built supercharged Audi S4 (B8.5). 540 whp. Tuned it myself.",
    "Ranked top-3 in Massachusetts for powerlifting in high school. Still train seriously.",
    "Ran Minecraft and Ark servers for friends. The server-admin grind taught me more about Linux than any class did.",
  ],
};

export default { portrait, workPhotos, teardown };
