// src/data/braindance.js: the braindance's words.
//
// Copy lives in src/data, and the braindance has plenty: its screens, its
// chapters, every clue and every achievement. The tone is Ali's call: his
// work and his life are in the city, but not in a professional way. It
// should be fun to find out about him here; the deep dive is /recruiters.
//
// Fun is not fiction. Every fact below is one the site already states
// (experience.js, projects.js, life.js, garage.js, profile.js, About.jsx),
// said shorter and with a grin. Nothing new is claimed here. If a fact
// changes there, change it here.

export const BOOT = {
  kicker: "Braindance · ALI_YOUNES.bd",
  title: "A night in Night City",
  line: "A recorded memory of one night in my car, cut to one song. Play it, rewind it, pause it and walk around inside it. Everything about me is in there somewhere, so scan it.",
  jackIn: "Jack in",
  sound: "Best with sound. About four minutes, and every second of it scrubbable.",
  notHereTitle: "This one needs a desktop",
  notHereLine: "The braindance wants a mouse, a keyboard and a graphics card. The other two ways in work everywhere.",
  toCinematic: "The cinematic site",
  toRecruiters: "For recruiters",
  loading: "Jacking in",
  failed: "The recording would not play here",
  failedLine: "This browser could not build the city. The other two ways in still work.",
  canvasLabel: "A braindance of Night City at night. The clues in it are listed in the journal.",
};

/**
 * The braindance rewords a few of the avenue's signs with Ali's own work,
 * in each sign's own colour and style (src/world/signs.js). Keyed by the
 * kit's sign id. The cinematic keeps the plate's words.
 */
export const SIGN_WORDS = {
  sushi: { lines: ["SIGNATURE CUTS"] },
  sora: { lines: ["SIDEBAND"] },
  shokuji: { lines: ["MOOPS"], latin: true },
  hotel: { lines: ["EXERLY"], latin: true },
  karaoke: { lines: ["ETERNAL"], latin: true },
};

export const CALL = { ringing: "Incoming holocall", connected: "Connected", name: "Ali Younes" };

/** The loading screen's line for what it is waiting on. */
export const LOAD_LABELS = {
  code: "The city's code",
  city: "Streets and towers",
  car: "The S4",
  voxel: "The voxel moon",
  holo: "The hologram",
  ads: "The ads",
  koi: "The koi",
  moon: "The garage monitor",
  build: "Reconstructing the recording",
  done: "In",
};

/** One per chapter in src/braindance/recording.js, in its order. */
export const CHAPTERS = [
  { id: "jackin", title: "Jack in", line: "Parked at the curb in the rain, engine running." },
  { id: "avenue", title: "The avenue", line: "Up the strip with the radio on." },
  { id: "plaza", title: "The plaza", line: "Everything I built because what existed was not good enough." },
  { id: "corpo", title: "Corpo row", line: "Seven towers. Seven places that let me in." },
  { id: "roof", title: "The roof", line: "Who is driving." },
  { id: "garage", title: "Bay 01", line: "The car, all the way down to the bolts." },
  { id: "moon", title: "The moon", line: "Somebody always wanted to go there." },
  { id: "end", title: "End of recording", line: "" },
];

/** The first time through, a line at a time, over the timeline. */
export const TUTORIAL = [
  { keys: ["Hold click"], line: "Something highlighted is a clue. Hold a click on it to scan it." },
  { keys: ["1", "2", "3"], line: "Some clues only show up on the audio or thermal layer. The timeline shows where." },
  { keys: ["F"], line: "Pause and walk around the moment in the editor." },
  { keys: ["Q", "E"], line: "Rewind and fast forward. Press again to go faster." },
  { keys: ["J"], line: "The journal lists everything there is to find." },
];

export const END = {
  kicker: "End of recording",
  title: "Thanks for watching",
  all: "You found every clue. Now you know more about me than most recruiters. Say hi.",
  some: "Some of it is still in there. Replay it, try the other layers, or open the journal for where to look.",
  replay: "Replay",
  journal: "Journal",
  email: "Email me",
  cinematic: "The cinematic site",
  recruiters: "For recruiters",
};

export const LAYER_NAMES = {
  visual: "Visual",
  audio: "Audio",
  thermal: "Thermal",
};

export const CONTROLS = [
  { keys: ["Space"], what: "Play / pause" },
  { keys: ["←", "→"], what: "Back / forward 5 s" },
  { keys: ["Q", "E"], what: "Rewind / fast forward (press again for faster)" },
  { keys: ["1", "2", "3"], what: "Visual, audio, thermal layer" },
  { keys: ["F"], what: "Editor: pause and orbit the moment" },
  { keys: ["Hold click"], what: "Scan a highlighted clue" },
  { keys: ["Drag"], what: "Look around (orbit in the editor)" },
  { keys: ["J"], what: "Journal" },
  { keys: ["P"], what: "Photo mode" },
  { keys: ["R"], what: "Radio: the song on or off" },
  { keys: ["M"], what: "Mute" },
  { keys: ["H"], what: "Hide the interface" },
  { keys: ["?"], what: "This list" },
];

/**
 * The clues. Each is found on one layer, in one stretch of the recording
 * (src/braindance/places.js says where and when), and opens a card when
 * scanned. `kicker` is the scanner's category line, `facts` the short
 * readouts under the title, `links` open in a new tab so the recording
 * keeps its place. Secrets are not marked on the timeline.
 */
const writeUp = (slug) => ({ label: "Full write-up", href: `/recruiters/work/${slug}` });

export const CLUES = [
  // ---- 0 Jack in ----
  {
    id: "s4",
    layer: "visual",
    kicker: "Vehicle",
    title: "Audi S4 B8.5, 2013",
    body: "My daily. I tuned it myself because I knew that supercharged V6 had more in it. It makes 540 at the wheels now.",
    facts: [["Engine", "3.0 TFSI V6, supercharged"], ["Output", "540 whp"], ["Tune", "Mine"]],
  },
  {
    id: "whine",
    layer: "audio",
    kicker: "Sound",
    title: "That whine",
    body: "An APR dual pulley. The supercharger's pulley got smaller and the crank's got bigger, so the blower spins faster than the factory ever let it.",
  },
  {
    id: "driver",
    layer: "thermal",
    kicker: "Heat signature",
    title: "One person, driver's seat",
    body: "Ali Younes, 21, based in Boston. The dossier says Ripperdoc. The job title says software engineer.",
    facts: [["Age", "21"], ["Base", "Boston, MA"], ["Occupation", "Ripperdoc"]],
  },
  // ---- 1 The avenue ----
  {
    id: "kiro",
    layer: "visual",
    kicker: "Advert",
    title: "Not Kiroshi. Kiro.",
    body: "In July 2026 I talked on camera at the Kiro launch event about a dual-model code review tool, and Kiro put it on their LinkedIn. Nobody sold any eyes.",
  },
  {
    id: "arcade",
    layer: "visual",
    kicker: "Memory",
    title: "Age 12",
    body: "I scripted other people's Roblox games and got paid in Robux. Then I cashed it out through DevEx for PC parts my family could not have bought me. I have been doing some version of that ever since.",
  },
  {
    id: "crowd",
    layer: "audio",
    kicker: "Overheard",
    title: "Two languages in the crowd",
    body: "English and Arabic. I speak both. Most of the crowd is saying nice car.",
  },
  {
    id: "phone",
    layer: "thermal",
    kicker: "Heat signature",
    title: "A phone, running hot",
    body: "My OLED broke and I could not afford what Apple wanted for it, so I opened the phone myself. That turned into a side gig doing screens for family and friends. The adhesive is the slow part.",
  },
  // ---- 2 The plaza ----
  {
    id: "sideband",
    layer: "visual",
    kicker: "Gig · Live",
    title: "Sideband",
    body: "The studio I co-founded in Boston. Four founders, six products, four of them live, and no client work. I started it so younger engineers can get mentoring for free while I keep getting better.",
    links: [{ label: "sideband.studio", href: "https://sideband.studio" }, writeUp("sideband")],
  },
  {
    id: "exerly-fitness",
    layer: "visual",
    kicker: "Gig · Live",
    title: "Exerly Fitness",
    body: "Every fitness app I tried was paywalled, so I built a free one with an AI coach that reads your actual profile. The web app is live. The SwiftUI iOS app is written and waiting on App Store review.",
    links: [{ label: "exerlyfitness.com", href: "https://exerlyfitness.com" }, writeUp("exerly-fitness")],
  },
  {
    id: "eternal-exchange",
    layer: "visual",
    kicker: "Gig · Pre-release",
    title: "EternalExchange",
    body: "ProjectE is Forge-only and Fabric had nothing like it, so I built the spin-off. The fun part is a solver that walks Minecraft's whole recipe graph at world load and prices every item in the game.",
    links: [{ label: "eternalexchangemod.com", href: "https://eternalexchangemod.com" }, writeUp("eternal-exchange")],
  },
  {
    id: "moops-bookstore",
    layer: "visual",
    kicker: "Gig · Live",
    title: "Moops Bookstore",
    body: "I was reading more and wanted somewhere to track it with my friends. Goodreads is fine, but it is not ours. Shelves, reviews, clubs and a streak counter.",
    links: [{ label: "moopsbooks.com", href: "https://moopsbooks.com" }, writeUp("moops-bookstore")],
  },
  {
    id: "eternal-monitor",
    layer: "visual",
    kicker: "Gig · In development",
    title: "Eternal Monitor",
    body: "I refused to pay $40 for an iPad second-screen app that lagged, so I wrote my own. Rust on Windows, Swift on the iPad, hardware H.264 at both ends and my own UDP protocol in between.",
    links: [{ label: "eternalmonitor.dev", href: "https://eternalmonitor.dev" }, writeUp("eternal-monitor")],
  },
  {
    id: "eternal-rich-presence",
    layer: "visual",
    kicker: "Gig · Live",
    title: "Eternal Rich Presence",
    body: "Apple Music does not talk to Discord. I made it talk over Discord's raw IPC named pipes, Listen Along included.",
    links: [{ label: "eternalrichpresence.dev", href: "https://eternalrichpresence.dev" }, writeUp("eternal-rich-presence")],
  },
  {
    id: "face-analytics",
    layer: "visual",
    kicker: "Gig · Live",
    title: "Real-Time Face Analytics",
    body: "Most face-analytics tools ship your webcam to somebody's cloud. This one runs the whole pipeline in your browser: faces, seven emotions, age and gender. Nothing leaves the machine.",
    links: [{ label: "Try it", href: "https://whoisaldo.github.io/real-time-face-analytics/" }, writeUp("face-analytics")],
  },
  {
    id: "signature-cuts",
    layer: "visual",
    kicker: "Gig · Live",
    title: "Signature Cuts 413",
    body: "A barbershop in Chicopee that took every booking by phone. Now the booking form turns into a WhatsApp message, so there is no backend to keep alive.",
    links: [{ label: "signaturecutschicopee.com", href: "https://signaturecutschicopee.com" }, writeUp("signature-cuts")],
  },
  {
    id: "radio",
    layer: "audio",
    kicker: "Now playing",
    title: "I Really Want to Stay at Your House",
    body: "Rosa Walton and Hallie Coggins. The cinematic's intro is cut to this song and so is every chapter of this recording. Eternal Rich Presence would put it on your Discord profile, even from Apple Music.",
  },
  {
    id: "gpu",
    layer: "thermal",
    kicker: "Heat signature",
    title: "Age 15, one hot GPU",
    body: "In 2020 I wrote a Python bot to watch for GPU restocks so I could get one at MSRP. I was 15 and I wanted a better machine.",
  },
  // ---- 3 Corpo row ----
  {
    id: "philips-zero-touch",
    layer: "visual",
    kicker: "Tower · Current",
    title: "Philips",
    body: "Technicians imaged about a thousand machines a refresh cycle by hand, with USB sticks, and FDA rules kept Secure Boot on the whole time. Plenty of engineers wanted it automated. I pitched it, built it solo, threw the first attempt out and shipped the second.",
    facts: [["Role", "SDE Co-op, back part-time"], ["Where", "Cambridge, MA"]],
    links: [writeUp("philips-zero-touch")],
  },
  {
    id: "pinnatec-auto",
    layer: "visual",
    kicker: "Tower · Current",
    title: "Pinnatec Auto",
    body: "I lead Virtual Link, Pinnatec's app-controlled lowering module: an Expo app, a PHP backend and ESP32 firmware. Seventeen pull requests merged. I built the CI too, so nothing merges until every check passes.",
    facts: [["Role", "Lead Full Stack, part-time"], ["Where", "Worcester, MA"]],
    links: [writeUp("pinnatec-auto")],
  },
  {
    id: "pawtograder",
    layer: "visual",
    kicker: "Tower · Current",
    title: "Pawtograder",
    body: "Northeastern's open-source autograder. Two other students and I own the grading server, scoring algorithm included. If your CS assignment was graded on it, the number came from us.",
    facts: [["Role", "Backend, grading server"], ["Team", "11 engineers"]],
    links: [writeUp("pawtograder")],
  },
  {
    id: "aws-cloudformation",
    layer: "visual",
    kicker: "Tower · Summer 2026",
    title: "Amazon Web Services",
    body: "A summer in Seattle on the CloudFormation Registry. One private resource type had been cloned into 8,000+ accounts across 8 regions. I built policy-based sharing across an AWS Organization, so now it gets published once.",
    facts: [["Role", "SDE Intern"], ["Where", "Seattle, WA"]],
    links: [writeUp("aws-cloudformation")],
  },
  {
    id: "top-choice-realty",
    layer: "visual",
    kicker: "Tower · 2024",
    title: "Top Choice Realty",
    body: "Twenty agents, none of them technical, and 800+ client records they had to ask someone else to look up. I built them an app so they could do it themselves. A lookup went from five minutes to 45 seconds.",
    links: [writeUp("top-choice-realty")],
  },
  {
    id: "robert-defalco-realty",
    layer: "visual",
    kicker: "Tower · 2023",
    title: "Robert DeFalco Realty",
    body: "IT support across three offices. I set up the machines, fixed them when they broke and kept them running. If it has screws in it, I have probably had it open, and this is where that started paying.",
    links: [writeUp("robert-defalco-realty")],
  },
  {
    id: "northeastern",
    layer: "visual",
    kicker: "Tower · Class of 2027",
    title: "Northeastern University",
    body: "Computer Science and Political Science, one combined major. The co-op program is why three of these towers overlap with it.",
    links: [writeUp("northeastern")],
  },
  {
    id: "room",
    layer: "audio",
    kicker: "Recording",
    title: "A room full of engineers",
    body: "The Philips zero-touch demo. I presented the second attempt, the one that shipped, to 50+ engineers and stakeholders.",
  },
  {
    id: "grader",
    layer: "thermal",
    kicker: "Heat signature",
    title: "A server under load",
    body: "Pawtograder's grading server runs in production against real submissions. Deadline nights are the hot ones.",
  },
  // ---- 4 The roof ----
  {
    id: "ripperdoc",
    layer: "visual",
    kicker: "Sign",
    title: "Ripperdoc",
    body: "That is the occupation on my dossier. A ripperdoc opens the thing up and puts something better in it. The boring word for it is software engineer.",
  },
  {
    id: "attributes",
    layer: "visual",
    kicker: "Afterlife legend",
    title: "Attributes",
    body: "Every merc at the Afterlife has stats. These are mine, and each one has a photo somewhere on the site.",
    facts: [["Body", "3rd in Massachusetts, wrestling"], ["Reflexes", "45-second Rubik's cube"], ["Technical", "Sumo robot, 1st place"], ["Intelligence", "CS and PoliSci, Northeastern"], ["Cool", "Over-engineers it, keeps it simple to use"]],
  },
  {
    id: "stack",
    layer: "visual",
    kicker: "Cyberware",
    title: "Chrome installed",
    body: "Grouped by what it is for. I can talk about anything on this list.",
    facts: [["Languages", "TypeScript, Python, Rust, Swift, C++, Go"], ["Frontend", "React, React Native, Next.js"], ["Backend", "Node, FastAPI, Postgres, Supabase"], ["Systems", "ESP32, DXGI, Metal, VideoToolbox"], ["Cloud", "AWS, Docker, GitHub Actions"], ["AI", "OpenAI SDK, Claude SDK, MCP, Ollama, Bedrock"]],
  },
  {
    id: "signal",
    layer: "audio",
    kicker: "Signal",
    title: "Something on the wire",
    body: "Most of my work has been automating something tedious. For years that meant deterministic code. Now frontier models take the parts that never fit a fixed script, and that is the part I find amazing.",
  },
  {
    id: "agents",
    layer: "thermal",
    kicker: "Heat signature",
    title: "Agents, running hot",
    body: "The agents in my daily rotation: Kiro, Codex, Claude Code, OpenCode, Windsurf, T3 Code, Cursor Bugbot and CodeRabbit. Somebody has to keep them busy.",
  },
  // ---- 5 Bay 01 ----
  {
    id: "face",
    layer: "visual",
    kicker: "Part",
    title: "RS4 face",
    body: "The RS4 bumper and honeycomb grille on an S4 body, colour-matched and fitted.",
  },
  {
    id: "wheels",
    layer: "visual",
    kicker: "Part",
    title: "Audi R8 wheels, 20 inch",
    body: "Twenty-inch R8 wheels on 255/35 R20 tires, sitting on ECS RS4 suspension. That is where the stance comes from.",
  },
  {
    id: "rear",
    layer: "visual",
    kicker: "Part",
    title: "Rear bumper, junkyard",
    body: "A replacement from a junkyard, the cheapest line on the build sheet that is not a rain guard. The carbon diffuser and the carbon spoiler make up for it.",
  },
  {
    id: "bmw",
    layer: "visual",
    kicker: "Memory",
    title: "The car before this one",
    body: "A 2013 BMW 328xi. I pulled the whole dash out for a CarPlay retrofit, took the front end off for a cold air intake and loaded a custom tune through a module. Then I did CarPlay again on the S4, with less of the dash out.",
  },
  {
    id: "exhaust",
    layer: "audio",
    kicker: "Sound",
    title: "AWE exhaust",
    body: "Downpipes off both banks and the full system back to the quad tips. You heard it pull in.",
  },
  {
    id: "intake",
    layer: "audio",
    kicker: "Sound",
    title: "APR carbon intake",
    body: "The carbon airbox on the left of the bay, feeding the supercharger through a silicone hose. Part of what you hear is the car breathing.",
  },
  {
    id: "tune",
    layer: "thermal",
    kicker: "Heat signature",
    title: "Stage 2+ Jackal tune",
    body: "The calibration the pulley, the intake, the exhaust and the heat exchanger all assume. I loaded it by hand. It is why the engine bay is the hottest thing in this room.",
  },
  {
    id: "brakes",
    layer: "thermal",
    kicker: "Heat signature",
    title: "ECS brakes",
    body: "ECS brakes and drilled hubs behind the R8 wheels. Still warm from the drive over.",
  },
  // ---- 6 The moon ----
  {
    id: "couple",
    layer: "visual",
    kicker: "Sighting",
    title: "Two people on the moon",
    body: "Somebody wanted to go to the moon. Somebody else made sure she got there.",
  },
  {
    id: "contact",
    layer: "visual",
    kicker: "Contact",
    title: "Incoming call: Ali",
    body: "The recording ends here, and this part is live. Email is the fastest way to reach me.",
    links: [
      { label: "aldo@sideband.studio", href: "mailto:aldo@sideband.studio" },
      { label: "GitHub", href: "https://github.com/whoisaldo" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/alialdoyounes/" },
      { label: "Résumé", href: "/resume.pdf" },
    ],
  },
  {
    id: "boston",
    layer: "thermal",
    kicker: "Heat signature",
    title: "Home base",
    body: "Boston. Northeastern and Pawtograder are here, Philips is across the river in Cambridge and Pinnatec is out in Worcester.",
  },
  // ---- secrets ----
  {
    id: "koi",
    layer: "visual",
    secret: true,
    kicker: "Secret",
    title: "Koi in the air",
    body: "The city they swim through comes out of one Blender script, close to two thousand lines of Python. Move a building there and it moves here, minimap included.",
  },
  {
    id: "tag",
    layer: "thermal",
    secret: true,
    kicker: "Secret",
    title: "Somebody tagged the road",
    body: "whoisaldo. Same handle on GitHub, warmer here.",
    links: [{ label: "github.com/whoisaldo", href: "https://github.com/whoisaldo" }],
  },
  {
    id: "morse",
    layer: "audio",
    secret: true,
    kicker: "Secret",
    title: "Morse, on a loop",
    body: "Dot dash, dot dash dot dot, dash dot dot, dash dash dash. It spells ALDO. You were listening closely.",
  },
];

/** The achievements, with how each is earned (src/braindance/scanner.js). */
export const ACHIEVEMENTS = [
  { id: "jackin", title: "Jacked in", line: "Started the recording." },
  { id: "editor", title: "Director's cut", line: "Paused and walked around inside a moment." },
  { id: "layers", title: "Three ways to see", line: "Looked through all three layers." },
  { id: "tape", title: "Tape head", line: "Rewound at four times." },
  { id: "gigs", title: "Gig board", line: "Scanned all eight projects." },
  { id: "corpo", title: "Corpo climber", line: "Scanned all seven towers." },
  { id: "gearhead", title: "Gearhead", line: "Scanned everything in Bay 01." },
  { id: "edgerunner", title: "Edgerunner", line: "Found the two on the moon." },
  { id: "koi", title: "Koi pond", line: "Spotted the koi." },
  { id: "tag", title: "Street art", line: "Found the tag only heat can see." },
  { id: "morse", title: "Signal found", line: "Heard the Morse on the roof." },
  { id: "shutter", title: "Shutterbug", line: "Took a photo in photo mode." },
  { id: "nightowl", title: "Night owl", line: "Watched the recording to the end." },
  { id: "fullsync", title: "Full sync", line: "Scanned every clue in the recording." },
  { id: "overdrive", title: "Overdrive", line: "Up, up, down, down, left, right, left, right, B, A." },
];
