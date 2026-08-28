// src/data/life.js — the photographs, and what they are.
//
// scripts/optimize-photos.mjs owns the pixels; this file owns the words. Kept
// apart on purpose: regenerating the encoder output must never be able to
// clobber a caption.
//
// Two rules, both inherited from docs/PROJECT_CONTEXT.md and the audit that
// produced it:
//
//   1. A caption may only claim what the photograph shows or what Ali has
//      confirmed. No invented model numbers, no invented times, no invented
//      records. Where a detail would be good and is not known, the caption
//      works without it rather than guessing.
//   2. `date` is read from the file's EXIF, not estimated. Two photos carry no
//      original capture date — their `date` is null and the UI omits the line
//      rather than printing a date the file never had.
import { photo } from "./photos";

// The portrait. Shot on the walk to the office in Seattle during the AWS term,
// which is why the sleeve reads AWS CloudFormation.
//
// The source is a mirrored front-camera selfie; the encoded asset is flipped
// back so the sleeve badge reads forwards. See scripts/optimize-photos.mjs.
export const portrait = {
  image: photo("portrait-seattle"),
  alt: "Ali Younes on a residential street in Seattle, wearing an AWS CloudFormation hoodie and over-ear headphones.",
  caption: "Seattle, July 2026.",
};

// Photos that belong to a specific job, keyed by the `company` field in
// src/data/experience.js. Experience.jsx looks them up by that key, so a
// company with no photos simply renders as it always has.
export const workPhotos = {
  "Amazon Web Services": [
    {
      image: photo("kiro-launch"),
      alt: "Ali Younes seated, speaking on camera at a Kiro launch event, with an on-screen caption reading 'Ali Younes, SDE Intern, AWS'.",
      caption: "Speaking at the Kiro launch event, July 2026.",
      note: "The dual-model code review tool, explained on camera. Kiro ran it on their official LinkedIn.",
    },
    {
      image: photo("amazon-orientation"),
      alt: "Ali Younes in a photo booth on his first day at Amazon, holding a cutout of the Amazon smile logo.",
      caption: "Day one, July 2026.",
    },
  ],
};

// Everything else.
//
// Five of these seven are the same photograph taken repeatedly: something with
// screws in it, opened. That is the actual pattern, so the section is named
// after it rather than after "interests" or "hobbies", and the two that do not
// fit are left in and acknowledged instead of quietly cut for tidiness.
export const teardown = {
  id: "teardown",
  title: "Teardown",
  lede:
    "Most of what I do away from a keyboard is opening something that was assembled by someone who assumed nobody would. The exceptions are at the bottom.",
  photos: [
    {
      slug: "bmw-carplay-retrofit",
      image: photo("bmw-carplay-retrofit"),
      date: "December 2023",
      title: "CarPlay, retrofitted",
      alt: "A BMW dashboard with the trim, vents and head unit removed, wiring exposed, photographed from the driver's seat at night.",
      body: "Dash down to the frame to put CarPlay in a car built before CarPlay shipped. The head unit is the easy part. Getting the trim back on without a single rattle is not.",
      span: "tall",
    },
    {
      slug: "bmw-engine-bay",
      image: photo("bmw-engine-bay"),
      date: "October 2025",
      title: "Front end off",
      alt: "An open BMW engine bay at night with the front bodywork removed, hoses and the coolant reservoir visible, a hand reaching in at the lower right.",
      body: "Everything ahead of the engine had to come off to reach one component behind it. This is the photo you take at hour four, to prove to yourself that it was apart for a reason.",
      span: "tall",
    },
    {
      slug: "bmw-tuning-module",
      image: photo("bmw-tuning-module"),
      date: "October 2025",
      title: "What's actually on the board",
      alt: "A tuning module with its case opened, exposing a green circuit board with several ICs, sitting in an engine bay next to a flash cable.",
      body: "A sealed box that promises numbers. I opened it because a sealed box that promises numbers is exactly the kind of thing worth opening.",
      span: "wide",
    },
    {
      slug: "iphone-teardown",
      image: photo("iphone-teardown"),
      date: null,
      title: "Screen replacement",
      alt: "An iPhone opened like a book on a desk, display assembly lifted away from the battery and logic board, a backlit keyboard behind it.",
      body: "The electronics are not the difficult part. The adhesive is the difficult part.",
      span: "wide",
    },
    {
      slug: "breadboard",
      image: photo("breadboard"),
      date: null,
      title: "First one that lit",
      alt: "A breadboard with a microcontroller, jumper wires and a lit red LED, a finger pressing a button on a second breadboard.",
      body: "A button, an LED, and the fairly specific feeling of the first circuit that does what you told it to.",
      span: "tall",
    },
    {
      slug: "wrestling",
      image: photo("wrestling"),
      date: "February 2023",
      title: "Wrestling",
      alt: "A wrestling match in progress on a mat, two wrestlers on the ground, spectators in the bleachers behind.",
      // TODO(Ali): years wrestled, weight class, or a record would all be
      // better than this. Left generic because none of it is mine to assert.
      body: "Not a teardown. The only thing on this page with an opponent, and the only one where being wrong is immediate and public.",
      span: "wide",
    },
    {
      slug: "rubiks-cube",
      image: photo("rubiks-cube"),
      date: "November 2023",
      title: "The cube",
      alt: "A Rubik's cube held in one hand, partially solved.",
      // TODO(Ali): a personal best belongs here if you have one.
      body: "Also not a teardown — the inverse. Nothing needs opening; every piece is already where it goes. The whole problem is the order you do things in.",
      span: "tall",
    },
  ],
};

export default { portrait, workPhotos, teardown };
