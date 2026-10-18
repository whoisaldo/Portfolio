// src/data/home.js: the homepage's words and its work history.
//
// experience.js is the long form, one entry per role with a case study behind
// each, and it is read by the playground. This is the short form for the
// homepage: one row per stint, so Philips is two rows (the co-op, then back
// part-time) where experience.js has one entry, and the Amazon role that has
// not started yet is here and not there. Dates follow the résumé (the degree
// is "Expected May 2027" there). A role that changes is changed in both.
//
// Its own file rather than read out of experience.js, because that file is
// mostly case-study prose and the homepage would download all of it to show
// a few lines.
import awsLogo from "../assets/PreviousExperience/awslogosvg.norm.png";
import philipsLogo from "../assets/PreviousExperience/PhilipsLogo.norm.png";
import pawtograderLogo from "../assets/PreviousExperience/Pawtograder.norm.png";
import topChoiceLogo from "../assets/PreviousExperience/Topchoicerealtylogo.norm.png";
import neuLogo from "../assets/PreviousExperience/NEULOGO.norm.png";
import defalcoLogo from "../assets/PreviousExperience/RobertDefalcoRealty.norm.png";
// The wordmark's square mark on its own: the full lockup is three times wider
// than it is tall, and at the size of a row it was an unreadable line.
import pinnatecMark from "../assets/front/logos/pinnatec-mark.png";
// Ali's own, cropped (3:4, Boston 16:9) and re-encoded, which also drops
// their EXIF.
import selfie from "../assets/front/photos/selfie.webp";
import seattle from "../assets/front/photos/seattle.webp";
import spaceNeedle from "../assets/front/photos/space-needle.webp";
import bostonWide from "../assets/front/photos/boston-wide.webp";
import wrestling from "../assets/front/photos/wrestling.webp";
import s6Night from "../assets/front/photos/s6-night.webp";
import s4Engine from "../assets/front/photos/s4-engine.webp";
import s6Engine from "../assets/front/photos/s6-engine.webp";
// The same photos uncropped and bigger, for the full-size view a click
// opens. Only downloaded when one is opened.
import selfieLarge from "../assets/front/photos/large/selfie.webp";
import seattleLarge from "../assets/front/photos/large/seattle.webp";
import spaceNeedleLarge from "../assets/front/photos/large/space-needle.webp";
import bostonLarge from "../assets/front/photos/large/boston.webp";
import wrestlingLarge from "../assets/front/photos/large/wrestling.webp";
import s6NightLarge from "../assets/front/photos/large/s6-night.webp";
import s4EngineLarge from "../assets/front/photos/large/s4-engine.webp";
import s6EngineLarge from "../assets/front/photos/large/s6-engine.webp";
// And three the playground already carries, at the sizes it already serves.
import amazonOrientation from "../assets/Photos/amazon-orientation-640.webp";
import amazonOrientationLarge from "../assets/Photos/amazon-orientation-1024.webp";
import sumoRobot from "../assets/Photos/sumo-robot-640.webp";
import sumoRobotLarge from "../assets/Photos/sumo-robot-1024.webp";
import audiS4 from "../assets/Photos/audi-s4-front-640.webp";
import audiS4Large from "../assets/Photos/audi-s4-front-1024.webp";

// Ali's own words, from his GitHub profile README, without the emoji.
export const intro = {
  lede:
    "Hi! I’m Ali, or you can call me Aldo. I’m a fourth year studying computer science and political science at Northeastern University in Boston.",
  line:
    "I like to work with deeply architected systems. Most of my work tends to revolve around automating, but I usually just kinda build a solution to anything really. My favorite areas are systems, infrastructure, AI tooling and backend.",
};

// Fun ones, set down the page beside the sections they go with. Ali's five
// run top to bottom in the order he gave them; the rest sit with the section
// they belong to. Alt text for the playground's three is life.js's and
// garage.js's. Listed in the order they appear, which is the order the
// full-size view steps through them.
export const photos = {
  aws: { src: selfie, large: selfieLarge, alt: "Ali in sunglasses and an AWS shirt" },
  amazon: { src: amazonOrientation, large: amazonOrientationLarge, alt: "Ali Younes in a photo booth on his first day at Amazon, holding a cutout of the Amazon smile logo." },
  seattle: { src: seattle, large: seattleLarge, alt: "Downtown Seattle from above" },
  needle: { src: spaceNeedle, large: spaceNeedleLarge, alt: "The Space Needle over the trees" },
  s4Engine: { src: s4Engine, large: s4EngineLarge, alt: "The engine bay of Ali's Audi S4: the V6 TFSI cover and an APR carbon intake." },
  s6Engine: { src: s6Engine, large: s6EngineLarge, alt: "The engine bay of Ali's Audi S6 from above: the twin turbos in the V of the engine, under heat wrap." },
  boston: { src: bostonWide, large: bostonLarge, alt: "Boston at night from high up" },
  wrestling: { src: wrestling, large: wrestlingLarge, alt: "A wrestling match" },
  robot: { src: sumoRobot, large: sumoRobotLarge, alt: "A sumo wrestling robot on a desk: an aluminium chassis carrying a breadboard, a microcontroller, an ultrasonic sensor and a battery pack, with two white plow blades at the front." },
  s4: { src: audiS4, large: audiS4Large, alt: "Ali's grey Audi S4 at night in front of the Boston Public Library, seen from the front left." },
  s6: { src: s6Night, large: s6NightLarge, alt: "Ali's grey Audi S6 at night in front of the Boston Public Library, headlights on, the Prudential tower lit behind it." },
};

// The timeline, one entry a company, newest first, laid out the way
// hadisalman.com's journey is: the dates, the company, a line on what it is,
// then each role there with its own dates when there was more than one.
// `current` marks the ones still going, and the one not started yet.
export const timeline = [
  {
    org: "Amazon",
    logo: awsLogo,
    when: "Summer 2026, and from Jul 2027",
    current: true,
    roles: [
      { title: "Software Development Engineer, ADC", when: "Starts Jul 2027", incoming: true },
      { title: "SDE Intern, AWS CloudFormation", when: "Jun to Sep 2026", note: "Org-wide sharing of private resource types on the CloudFormation Registry." },
    ],
  },
  {
    org: "Pinnatec Auto",
    logo: pinnatecMark,
    when: "Sep 2026 to now",
    current: true,
    role: "Lead Full Stack Engineer, part-time",
    note: "Virtual Link: an Expo app, a WordPress backend and ESP32 firmware.",
  },
  {
    org: "Pawtograder",
    logo: pawtograderLogo,
    when: "Aug 2026 to now",
    current: true,
    role: "Backend Engineer",
    note: "Northeastern's open-source autograder.",
  },
  {
    org: "Philips",
    logo: philipsLogo,
    when: "Jan 2026 to now",
    current: true,
    note: "Zero-touch Windows deployment for a ~1,000-machine fleet, Secure Boot on.",
    roles: [
      { title: "SDE Co-op, back part-time", when: "Aug 2026 to now" },
      { title: "SDE Co-op, System Integration", when: "Jan to Jun 2026" },
    ],
  },
  {
    org: "Top Choice Realty",
    logo: topChoiceLogo,
    when: "Apr to Aug 2024",
    role: "Frontend Developer Intern",
    note: "A client management app that took a lookup from 5+ minutes to 45 seconds.",
  },
  {
    org: "Northeastern University",
    logo: neuLogo,
    when: "2023 to May 2027",
    current: true,
    role: "B.S. Computer Science and Political Science",
  },
  {
    org: "Robert DeFalco Realty",
    logo: defalcoLogo,
    when: "Jun to Sep 2023",
    role: "Computer Technician Intern",
    note: "On-site IT across three offices.",
  },
];

// Four, chosen to cover the range: systems, a mod, a desktop tool, a product.
// `line` is the one sentence a row shows closed; opening it shows the
// project's own description, stack and links from projects.js.
export const built = [
  { slug: "eternal-monitor", line: "Turns an iPad into a wireless second display for Windows." },
  { slug: "eternal-exchange", line: "Equivalent-exchange alchemy for Minecraft, on Fabric." },
  { slug: "eternal-rich-presence", line: "Puts Apple Music on your Discord profile." },
  { slug: "exerly-fitness", line: "A fitness platform with an AI coach. Live on the web, iOS in review." },
];

export const playgroundCard = {
  label: "The playground",
  title: "A fully interactive, cyberpunk-style portfolio.",
  body: "Best experienced on a laptop.",
  cta: "Enter the playground",
};
