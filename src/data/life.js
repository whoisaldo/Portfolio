// src/data/life.js: the photographs, and what they are.
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
// sentence that states a thing and then inverts it to sound clever. An
// earlier pass wrote all seven captions that way and they read as written to
// sound good rather than to say something.
//
// Several captions were `body: null` for a long time, each with a TODO naming
// the thing only Ali could supply: which car, what a solve time was, what the
// wrestling result was. A caption that guesses is worse than no caption, so
// they stayed empty rather than being filled in plausibly. He supplied the
// answers on 2026-08-28 and every one is now written from what he said. The
// UI still omits the paragraph when body is null, so a future photograph can
// arrive without a caption and nothing breaks.
//
// `date` is read from the file's EXIF, never estimated. Three photographs
// carry no original capture date; theirs is null and the UI omits the line.
import { photo } from "./photos";

// Shot on the walk to the office in Seattle during the AWS term, which is why
// the sleeve reads AWS CloudFormation.
//
// Kept as the front camera saw it, mirrored. It was un-mirrored for a while so
// the sleeve badge would read AWS CloudFormation the right way round, which is
// a detail nobody was reading and which made the frame look subtly unlike him.
// The photo is of a person, not of a logo.
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
//
// Grouped, because eleven photographs in one undifferentiated wall is the
// thing this section used to get wrong: two different cars, a workbench and a
// pair of competitions all sat next to each other with nothing to say which
// was which. The groups carry that, and each one gets a line of context so a
// reader knows what they are looking at before they read a caption.
//
// Every `body` here is Ali's own account, supplied 2026-08-28. The seven
// TODO(Ali) markers that used to sit in this file are gone because the
// questions behind them have been answered: which car, what was being done to
// it, what the cube time is, what the wrestling result was. The two cars were
// the biggest of those. There are two, and the CarPlay and tuning work is on
// the 328xi while the S4 is the daily, which is exactly the ambiguity the old
// comment refused to guess at.
//
// `date` is still read from EXIF and never estimated. The three S4 shots
// carry theirs; the sumo robot has none, so it has no date line.
export const teardown = {
  id: "teardown",
  title: "Teardown",
  lede: "Cars, phones, breadboards. If it has screws in it I have probably had it open.",

  groups: [
    {
      id: "bmw",
      label: "2013 BMW 328xi",
      note: "Tuned, retrofitted, and taken apart more than once.",
    },
    {
      id: "audi",
      label: "Audi S4 B8.5",
      note: "The daily. Supercharged, built, and tuned by hand.",
    },
    {
      id: "bench",
      label: "On the bench",
      note: "Phone repair, first circuits, and a robot that had to win a fight.",
    },
    {
      id: "competing",
      label: "Competing",
      note: "Two things worth being measured at.",
    },
  ],

  photos: [
    {
      slug: "bmw-carplay-retrofit",
      group: "bmw",
      image: photo("bmw-carplay-retrofit"),
      date: "December 2023",
      title: "CarPlay retrofit",
      alt: "A car dashboard with the trim, vents and head unit removed and the wiring exposed, photographed from the driver's seat at night.",
      body: "Retrofitting a CarPlay screen into the 328xi. The entire dash had to come out to do it.",
    },
    {
      slug: "bmw-engine-bay",
      group: "bmw",
      image: photo("bmw-engine-bay"),
      date: "October 2025",
      title: "Front end off",
      alt: "An open engine bay at night with the front bodywork removed, hoses and the coolant reservoir visible, a hand reaching in at the lower right.",
      body: "Installing the cold air intake. Everything ahead of the engine came off first.",
    },
    {
      slug: "bmw-tuning-module",
      group: "bmw",
      image: photo("bmw-tuning-module"),
      date: "October 2025",
      title: "Tuning module",
      alt: "A tuning module with its case opened, exposing a green circuit board with several ICs, sitting in an engine bay next to a flash cable.",
      body: "Loading a custom tune onto the 328xi through this module.",
    },

    {
      slug: "audi-s4-front",
      group: "audi",
      image: photo("audi-s4-front"),
      date: "May 2026",
      title: "The daily",
      alt: "A grey Audi S4 parked on a city street at night, seen head on, with a honeycomb grille and front lip.",
      body: "Fully built supercharged S4 (B8.5). 540 whp, tuned it myself.",
      focus: "object-[center_64%]",
    },
    {
      slug: "audi-s4-engine-bay",
      group: "audi",
      image: photo("audi-s4-engine-bay"),
      date: "July 2025",
      title: "Supercharged V6",
      alt: "The open engine bay of an Audi S4, showing a 3.0 V6 TFSI with its supercharger under the intake manifold and a carbon fibre intake feeding it.",
      body: "The 3.0 TFSI, with the supercharger sitting under the intake manifold and a carbon intake feeding it.",
    },
    {
      slug: "audi-s4-rear",
      group: "audi",
      image: photo("audi-s4-rear"),
      date: "April 2026",
      title: "Rear three-quarter",
      // The Massachusetts plate in the source frame is blurred in the encoded
      // asset. A plate is readable to anyone walking past the car, but putting
      // it on an indexed page next to his name makes the association
      // searchable, which is a different thing.
      alt: "A grey Audi S4 parked at night on a residential street, seen from behind, with a rear diffuser and the tail lights lit.",
      body: "Diffuser, quad tips, and a registration plate blurred out on purpose.",
      focus: "object-[center_58%]",
    },

    {
      slug: "iphone-teardown",
      group: "bench",
      image: photo("iphone-teardown"),
      date: null,
      title: "Screen replacement",
      alt: "An iPhone opened like a book on a desk, display assembly lifted away from the battery and logic board, a backlit keyboard behind it.",
      body: "I always thought it would be interesting to learn how iPhone screens come apart, so I took it on. The adhesive is the part that takes the time.",
    },
    {
      slug: "breadboard",
      group: "bench",
      image: photo("breadboard"),
      date: null,
      title: "Breadboard",
      alt: "A breadboard with a microcontroller, jumper wires and a lit red LED, a finger pressing a button on a second breadboard.",
      body: "The beginning of the C++ and Arduino work. A microcontroller, a button, and an LED that does what it is told.",
    },
    {
      slug: "sumo-robot",
      group: "bench",
      image: photo("sumo-robot"),
      date: null,
      title: "Sumo robot",
      alt: "A sumo wrestling robot on a desk: an aluminium chassis carrying a breadboard, a SparkFun microcontroller, an ultrasonic sensor on a pink mount and a battery pack, with two white plow blades at the front.",
      body: "Built for a computer engineering course and it won first place. Arduino, an ESP32, and a stack of sensors.",
    },

    {
      slug: "wrestling",
      group: "competing",
      image: photo("wrestling"),
      date: "February 2023",
      title: "Wrestling",
      alt: "A wrestling match in progress on a mat, two wrestlers on the ground, spectators in the bleachers behind.",
      body: "Placed third in the state of Massachusetts. The team took the Western Mass Division III title the same season.",
      link: {
        href: "https://www.masslive.com/highschoolsports/2023/02/they-believe-in-brotherhood-they-believe-in-family-hampden-charter-east-wrestling-wins-wmass-d-iii-crown.html",
        label: "MassLive on the WMass title",
      },
    },
    {
      slug: "rubiks-cube",
      group: "competing",
      image: photo("rubiks-cube"),
      date: "November 2023",
      title: "Cube",
      alt: "A Rubik's cube held in one hand above a desk, partially solved.",
      body: "Wanted to see how fast I could get. Down to 45 seconds on the speed cube.",
    },
  ],

  // The things with no photograph. Ali's own words, trimmed.
  //
  // The Audi line that used to sit here has moved into the wall above, since
  // there are now three photographs of it.
  //
  // NOTE: the powerlifting line and the wrestling caption both describe a
  // top-three finish in Massachusetts in high school. They are kept separate
  // because they are stated as separate things, but if one of them is a
  // garbled version of the other, this is the place to fix it.
  notPictured: [
    "Ranked top-3 in Massachusetts for powerlifting in high school. Still train seriously.",
    "Ran Minecraft and Ark servers for friends. The server-admin grind taught me more about Linux than any class did.",
  ],
};
