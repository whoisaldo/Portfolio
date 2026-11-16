// src/data/projects.js: single source of truth for project content.
//
// Every claim here is backed by docs/PROJECT_CONTEXT.md, which records a
// line-by-line audit against source code, live sites and the GitHub API.
// Read it before editing any copy. Three rules carried over from that pass:
//   1. Never cite Exerly's landing-page stats or testimonials: both are
//      hardcoded fiction in that repo, not telemetry.
//   2. Never restore EternalMonitor's "<30ms latency": no benchmark exists.
//   3. EternalExchange is a ProjectE "spin-off", never a "port".
//
// `why` is the first thing a reader sees on a card and at the top of the case
// study, and every one of them is Ali's own sentence, lifted out of the
// terminal's `funfact` / `interests` output, or out of the "Problem:" line the
// entry already carried. It says why the thing exists. `description` still
// carries the what, below it. If a project ever needs a new `why`, write it the
// way these are written: first person, one concrete detail, no build-up.
//
// `accent` used to be sampled from each project's own key-art plate: the
// dominant chromatic hue after excluding the violet rim light all eight plates
// share. That was a real derivation and it stopped meaning anything the moment
// the site's chrome stopped being violet: eight sampled violets under a yellow
// interface read as leftovers from the previous design.
//
// It carries information now instead. Volt means the thing is running today;
// fuchsia means it is still being built. Seven of the eight are live, so the
// grid reads mostly yellow with one magenta exception, and the exception is
// the point: a reader can see which projects are shipped without reading a
// single status flag. Derived from `status` directly below each one, so the
// two can never disagree.

// `sideband: true` marks a project that ships under Sideband, the studio Ali
// co-founded, and that he built: he is the main contributor in each one's
// repository. The front site prints one line for it (StudioLine in
// src/front/parts.jsx); the playground ignores it.

// Every `images[]` entry below is an encoded variant set rather than a bare
// URL: `{ src, width, height, avif, webp, thumb, lqip, lqipKey }`. The source
// PNGs were replaced by AVIF/WebP (plus a mozjpeg fallback for key art) by
// `npm run images`; see scripts/optimize-images.mjs for the encoder settings
// and src/data/images.js for the generated map. Render them through
// <Picture> / <ProjectImage>, not a bare <img src>.
import { img } from "./images";
// Eternal Monitor's stars, forks, releases and downloads, refreshed daily by
// scripts/github-snapshot.mjs.
import github from "./github.json";

const LIVE = "#fcee0a";
const BUILDING = "#ff2e88";

const count = (n) => n.toLocaleString("en-US");
const shortDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monitor = github.eternalMonitor;

// Key art: generated device-mockup plates, 3:2 (1536x1024). Each is a
// photorealistic shot of the real product running on real hardware; the
// genuine screenshot is passed to the generator so the screen shows actual UI,
// never invented interface. Regeneration recipe: docs/mock.sh + docs/post.sh.
const kaSideband = img("KeyArt/KeyArt_Sideband");
const kaExerly = img("KeyArt/KeyArt_Exerly");
const kaEternalExchange = img("KeyArt/KeyArt_EternalExchange");
const kaMoops = img("KeyArt/KeyArt_Moops");
const kaEternalMonitor = img("KeyArt/KeyArt_EternalMonitor");
const kaERP = img("KeyArt/KeyArt_EternalRichPresence");
const kaFace = img("KeyArt/KeyArt_FaceAnalytics");
const kaSignatureCuts = img("KeyArt/KeyArt_SignatureCuts");

// Moops: moopsbooks.com (captured live, 2026-07)
const moopsLanding = img("MoopsBookStore 2/moopsbooks_Landing2026");
const moopsBrowse = img("MoopsBookStore 2/moopsbooks_Browse2026");

// Exerly Fitness: web captured live 2026-07; iOS shots from the device build
const exerlyLanding = img("ExerlyFitness/ExerlyWebLanding2026");
const exerlyDayLog = img("ExerlyFitness/ExerlyWebDayLogged2026");
const exerlyFeatures = img("ExerlyFitness/ExerlyWebFeatures2026");
const exerlyIOSWeb = img("ExerlyFitness/ExerlyWebIOS2026");
const exerlyiOS1 = img("ExerlyFitness/ExerlyFitnessPhoneView1");
const exerlyiOS2 = img("ExerlyFitness/ExerlyFitnessPhoneView2");
const exerlyiOS3 = img("ExerlyFitness/ExerlyFitnessPhoneView3");

// EternalExchange: eternalexchangemod.com
const eeLanding = img("EternalExchange/EternalExchangeLanding");
const eeEMC = img("EternalExchange/EternalExchangeEMCValues");
const eeHowItWorks = img("EternalExchange/EternalExchangeHowItWorks");
const eeFeatures = img("EternalExchange/EternalExchangeFeatures");
const eeInstall = img("EternalExchange/EternalExchangeInstall");

// Signature Cuts 413
const sigCutsWeb = img("SignatureCuts/SignatureCutsWebView");
const sigCutsPhone = img("SignatureCuts/SignatureCutsPhoneView");

// Eternal Rich Presence: eternalrichpresence.dev + real app captures
const erpWeb = img("EternalRichPresence/EternalRichPresenceWebLanding");
const erpWebFeatures = img("EternalRichPresence/EternalRichPresenceWebFeatures");
const erpWebSetup = img("EternalRichPresence/EternalRichPresenceWebSetup");
const erpDiscord = img("EternalRichPresence/EternalRichPresenceDiscordProfileView");
const erpTerminal = img("EternalRichPresence/EternalRichPresenceTerminal");

// Eternal Monitor: eternalmonitor.dev + real device captures
const emWeb = img("EternalMonitor/EternalMonitorWebLanding");
const emWebFeatures = img("EternalMonitor/EternalMonitorWebFeatures");
const emPC = img("EternalMonitor/EternalMonitorPCView");
const emIpad = img("EternalMonitor/EternalMonitorIpadView");

// Facial Recognition: the "Regocnition" spelling is the real filename
const facialFront = img("Facial/FacialRecognitionFrontPage");
const facialHappy = img("Facial/FacialRecognitionHappy");
const facialAngry = img("Facial/FacialRegocnitionAngryFace");

// Sideband: sideband.studio (captured live, 2026-09, after the rename from
// Eternal Reverse; eternalreverse.com now redirects there)
const sbLanding = img("SidebandStudio/SidebandLanding2026");
const sbProducts = img("SidebandStudio/SidebandProducts2026");
const sbProductEM = img("SidebandStudio/SidebandProductEternalMonitor2026");
const sbProductExerly = img("SidebandStudio/SidebandProductExerly2026");
const sbAbout = img("SidebandStudio/SidebandAbout2026");

export const featuredProjects = [
  {
    slug: "sideband",
    title: "Sideband",
    tagline: "independent software studio · sideband.studio",
    why:
      "I want somewhere younger engineers can get mentoring for free as I get better at this. Four of us now, in Boston, shipping our own products and taking no client work.",
    accent: LIVE,
    status: "live",
    description:
      "An independent software studio I co-founded in Boston, four founders now. Ships its own products instead of doing client work. Six of them, five already live.",
    longDescription:
      "What it is: an independent studio founded in Boston in 2025 as Eternal Reverse and renamed Sideband in 2026. It started as two of us and is four founders now. Six products span systems engineering (Rust + Swift display streaming), native iOS (SwiftUI + HealthKit), video pipelines (DaVinci Resolve + OpenCV), and modern web (Next.js + a Chrome MV3 extension). Five are live: EternalMonitor, EternalRichPresence, Signature Cuts 413, Eternal2x and Eternal Summary. Exerly Fitness is still in development. Products shipped before the rename kept their names.\n\n" +
      "What I do here: co-founder and lead engineer. Wrote the Rust host + Swift client behind EternalMonitor (DXGI capture, hardware H.264, Metal render); the SwiftUI iOS app + Node API behind Exerly Fitness; and most of the studio site itself, which is Next.js 14 with a page per product, an engineer dossier per founder, and an interactive terminal on the hero.",
    tech: ["Next.js 14", "TypeScript", "React", "Tailwind CSS", "Framer Motion", "Rust", "SwiftUI", "Node.js"],
    features: [
      "6 products: 5 live, 1 in development",
      "Studio site: Next.js 14, a page per product",
      "An engineer dossier for each of the four founders",
      "Interactive terminal on the hero",
      "Systems, iOS, video-pipeline and web work under one roof",
      "Boston-based, founded 2025 as Eternal Reverse, Sideband since 2026",
    ],
    github: "https://github.com/sidebandstudio/sideband.studio",
    live: "https://sideband.studio",
    images: [kaSideband, sbLanding, sbProducts, sbProductEM, sbProductExerly, sbAbout],
    imageLabels: ["Studio Index", "Landing", "Products", "Product: EternalMonitor", "Product: Exerly Fitness", "About"],
    stats: { role: "Co-founder", since: "2025", founders: "4" },
  },
  {
    slug: "exerly-fitness",
    title: "Exerly Fitness",
    tagline: "web live · native iOS in the wings · exerlyfitness.com",
    why:
      "Every commercial fitness app is paywalled. I wanted a free, open-source one that actually coaches.",
    accent: LIVE,
    status: "live",
    sideband: true,
    description:
      "React 19 on the web, a Node/Express API, an AI coach, and a native SwiftUI iOS client built and waiting on App Store review.",
    longDescription:
      "An npm-workspaces monorepo (apps/api, apps/web, apps/ios) behind one REST backend, so the browser and the phone read the same account and the same data. The AI coach builds its prompt from your real profile: age, weight, goals, logged progress. It does not answer in a vacuum.\n\n" +
      "Where it stands: the web app is live at exerlyfitness.com (GitHub Pages) against an Express API on DigitalOcean. The iOS client is real and written. 71 Swift files, roughly 9k lines, and a 12-step onboarding that computes maintenance calories via Mifflin-St Jeor. It has not shipped to the App Store yet, so the site says 'coming soon' and so do I.\n\n" +
      "Details worth keeping: nutrition lookups fall back FatSecret → Open Food Facts so a barcode scan rarely dead-ends, the API runs MongoDB in production and SQLite locally so a contributor can boot it with zero services, and AI usage is capped at 5 credits an hour / 20 a day to keep the bill sane.",
    tech: ["SwiftUI", "React 19", "TypeScript", "Node.js", "Express 5", "MongoDB", "SQLite", "Gemini 2.0 Flash-Lite", "HealthKit"],
    features: [
      "51 REST endpoints shared by web + iOS",
      "React 19 web dashboard + admin panel",
      "AI coach on gemini-2.0-flash-lite, 5/hr · 20/day credits",
      "Dual-mode DB: MongoDB (prod) / SQLite (local)",
      "Barcode scanning w/ FatSecret → Open Food Facts fallback",
      "12-step Mifflin-St Jeor onboarding on iOS",
      "Apple Health reads steps + active energy",
    ],
    github: "https://github.com/whoisaldo/Exerly-Fitness",
    live: "https://exerlyfitness.com",
    images: [kaExerly, exerlyLanding, exerlyDayLog, exerlyFeatures, exerlyIOSWeb, exerlyiOS1, exerlyiOS2, exerlyiOS3],
    imageLabels: ["A Logged Day", "Landing", "Dashboard & AI Coach", "Features", "iOS: Coming Soon", "iOS: Welcome", "iOS: 12-Step Onboarding", "iOS: AI Coach"],
    stats: { web: "Live", ios: "Built · pre-App Store", api: "51 endpoints" },
  },
  {
    slug: "eternal-exchange",
    title: "EternalExchange",
    tagline: "equivalent-exchange alchemy for Fabric · eternalexchangemod.com",
    why:
      "ProjectE is the canonical equivalent-exchange mod and it is Forge-only. Fabric had nothing comparable, so I built the spin-off, plus a solver that walks Minecraft's whole recipe graph at world load and prices every item in the game.",
    accent: BUILDING,
    status: "pre-release",
    sideband: true,
    description:
      "A 39K-line Minecraft alchemy mod for Fabric 1.21.1. A spin-off of ProjectE with a recipe-graph solver that prices every item in the game at world load.",
    longDescription:
      "'equivalent exchange' is one of the oldest ideas in modded Minecraft. Every item has an energy value (EMC), and once you've learned an item you can break matter down and rebuild it into anything else you know. ProjectE is the canonical take on it, and it's MIT-licensed but Forge/NeoForge-only. Fabric, the other half of the modern modding ecosystem, had nothing comparable.\n\n" +
      "What this is: a Fabric-native spin-off of ProjectE, credited openly in the README and the LICENSE. The interesting part isn't re-listing the alchemy. It is that Fabric does not have the primitives the original assumes. Capabilities, attachments, item handlers, a TOML config spec, fluid stacks, an event bus: none of it exists. So the mod carries its own 2,031-line compatibility layer that reimplements that surface, 9 Mixins standing in for vanilla hooks Fabric never fires, and a networking stack rebuilt on Fabric's PayloadTypeRegistry with a deferred client-receiver install so packets stay loadable on a dedicated server.\n\n" +
      "The EMC solver is the centrepiece: at server start and after every /reload it walks the entire loaded recipe graph and propagates values outward from a seed set, using exact BigFraction arithmetic so fractional intermediates don't drift into rounding errors. Add another mod and its recipes get priced automatically. No patch required. Every value is overridable via custom_emc.json, a datapack, or the TOML config.\n\n" +
      "Status: v1.0.0 pre-release, MIT, a 4.5 MB jar built and attached by CI. Save-compatible with the NeoForge original: knowledge, bags and custom EMC carry across. Original gameplay content beyond the classic set is on the roadmap, not in the jar yet.",
    tech: ["Java 21", "Minecraft 1.21.1", "Fabric Loader", "Fabric API", "Gradle · Loom", "Mixin", "night-config", "Commons Math"],
    features: [
      "Recipe-graph EMC solver runs at world load and /reload",
      "Exact BigFraction arithmetic, no rounding drift",
      "86 items · 21 blocks · 12 block entities",
      "15 GUI screens, incl. 104-slot alchemical bags",
      "2,031-line compatibility layer for Fabric primitives",
      "9 Mixins + accesswidener for hooks Fabric doesn't fire",
      "363 world transmutations · 209 seeded EMC values as datapack JSON",
      "Save-compatible with the NeoForge original",
    ],
    github: "https://github.com/whoisaldo/EternalExchange",
    live: "https://eternalexchangemod.com",
    images: [kaEternalExchange, eeLanding, eeEMC, eeHowItWorks, eeFeatures, eeInstall],
    imageLabels: ["EMC Ladder", "Landing", "EMC Values", "How It Works", "What's in the Mod", "Install"],
    stats: { code: "39,399 LOC · 450 files", content: "86 items · 21 blocks", target: "MC 1.21.1 · Fabric" },
  },
  {
    slug: "moops-bookstore",
    title: "Moops Bookstore",
    tagline: "a calm place for your reading life · moopsbooks.com",
    why:
      "I was reading more and wanted somewhere to track it with my friends. Goodreads is fine, but it is not ours.",
    accent: LIVE,
    status: "live",
    description:
      "Full-stack social reading tracker: shelves, reviews, clubs and a streak counter, on a MongoDB backend with the Google Books catalogue behind search.",
    longDescription:
      "Readers juggle Goodreads, Amazon and a notes app to track what they're reading, and every one of them is louder than it needs to be.\n\n" +
      "A single MERN app built around the idea that tracking should feel quiet. Search runs against the Google Books catalogue, shelves and reviews are yours, and the activity feed, clubs and leaderboard are opt-in rather than the default surface.\n\n" +
      "Live at moopsbooks.com with JWT-authenticated accounts, a read / reading / streak dashboard, and a warm dark theme that stays out of the way. The source repository is private.",
    tech: ["React", "TypeScript", "Node.js", "MongoDB", "Express", "Google Books API", "JWT"],
    features: [
      "JWT auth + secure sessions",
      "Book search via the Google Books catalogue",
      "Personal shelves & reading tracking",
      "Read / reading / streak dashboard",
      "Clubs, activity feed & leaderboard",
      "Light + dark themes, mobile-first",
    ],
    github: null,
    live: "https://moopsbooks.com",
    images: [kaMoops, moopsLanding, moopsBrowse],
    imageLabels: ["Reading Shelf", "Landing", "What's Being Read"],
    stats: { live: "moopsbooks.com", auth: "JWT", source: "Private" },
  },
  {
    slug: "eternal-monitor",
    title: "Eternal Monitor",
    tagline: "Windows → iPad over Wi-Fi or USB · eternalmonitor.dev",
    why:
      "I refused to pay $40 for an iPad-as-second-display app that lagged. So I wrote my own.",
    accent: LIVE,
    status: "live",
    sideband: true,
    description:
      "A Rust host and a native Swift iPad app that turn an iPad into a second display for Windows. Extend or mirror, over Wi-Fi or USB, with touch, Apple Pencil and PC audio.",
    longDescription:
      "Wireless second-monitor apps either cost a subscription, need a dongle, or buckle the moment the network gets busy.\n\n" +
      "A Rust host captures the Windows desktop through DXGI and encodes it through FFmpeg on NVIDIA NVENC, AMD AMF or Intel Quick Sync, chosen by the graphics cards it finds, with libx264 as the software fallback. H.264 by default, HEVC if you ask for it. Each frame goes out as numbered UDP fragments to a SwiftUI iPad app that decodes on VideoToolbox and draws through Metal. Over USB the same messages go through the tunnel Apple's device service provides. UDP over TCP was deliberate. A late packet should not hold up everything behind it.\n\n" +
      "Design details I'd defend: H.264 Baseline specifically because that's what the iPad's hardware decoder is happiest with; fragment counters widened u8 → u16 once frames started exceeding 255 fragments; on Wi-Fi the iPad asks again for a missing fragment as soon as a later one shows the gap, and stops waiting after 8 to 25 ms; the bitrate follows the iPad's own reports between 4 and 50 Mbps; discovery is mDNS, with manual IP and a QR code as the reliable paths.\n\n" +
      "Honest status: the Windows installer is on GitHub Releases and the iPad app is on TestFlight, not the App Store yet. The installer is not code-signed yet either, so Windows SmartScreen asks before it runs. It extends or mirrors, and every tap, keystroke and Pencil stroke goes back to the PC. I have not instrumented true glass-to-glass latency, so I don't quote a number for it. MIT, and the repository lives under Sideband now.",
    tech: ["Rust", "SwiftUI", "DXGI", "FFmpeg", "H.264 / HEVC", "VideoToolbox", "Metal", "Opus", "tokio", "mDNS"],
    features: [
      "Extend the desktop onto the iPad, or mirror any screen",
      "Wi-Fi or USB, and plugging in a cable takes over a Wi-Fi session",
      "Apple Pencil as a Windows Ink pen, with pressure and tilt",
      "Touch, keyboard, trackpad and mouse input back to the PC",
      "NVENC / AMF / QSV encode with a libx264 fallback",
      "Fragment repair on Wi-Fi, bitrate between 4 and 50 Mbps",
      "PC audio to the iPad as Opus",
      "mDNS discovery, with manual IP and QR pairing",
    ],
    github: monitor.url,
    live: "https://eternalmonitor.dev",
    images: [kaEternalMonitor, emWeb, emWebFeatures, emPC, emIpad],
    imageLabels: ["Frame Transport", "eternalmonitor.dev", "Features", "Windows Host", "iPad Client"],
    // From the GitHub snapshot, so they are as new as the last deploy.
    metrics: [
      { label: "GitHub stars", value: count(monitor.stars) },
      { label: "Release downloads", value: count(monitor.downloads) },
      { label: "Forks", value: count(monitor.forks) },
      { label: `Latest of ${count(monitor.releases)} releases, ${shortDate(monitor.latest.date)}`, value: monitor.latest.tag },
    ],
    stats: { platform: "Rust · Swift", transport: "Wi-Fi or USB · H.264 / HEVC", status: `${monitor.latest.tag} · live` },
  },
  {
    slug: "eternal-rich-presence",
    title: "Eternal Rich Presence",
    tagline: "Apple Music → Discord · eternalrichpresence.dev",
    why:
      "Apple Music does not talk to Discord. So I made it talk, over Discord's raw IPC named pipes.",
    accent: LIVE,
    status: "live",
    sideband: true,
    description:
      "Windows system-tray bridge putting Apple Music and Spotify on your Discord profile, with a Listen Along built on raw named pipes.",
    longDescription:
      "Apple Music doesn't talk to Discord, period. And Discord's Listen Along is Spotify-only, so an Apple Music listener can't share what they're playing at all.\n\n" +
      "A Python tray app that reads Now Playing from the iTunes COM interface and Windows' System Media Transport Controls, then pushes it to Discord through pypresence. Cover art is pulled from the media session and uploaded so Discord has a public URL to show, with a fallback chain (litterbox → 0x0 → catbox) so a single host being down doesn't kill the artwork.\n\n" +
      "The part I'm actually proud of: pypresence is send-only, so Listen Along was impossible with it. The app opens Discord's IPC named pipes (\\\\.\\pipe\\discord-ipc-0..9) directly over ctypes/kernel32, speaks the frame protocol by hand, and subscribes to ACTIVITY_JOIN, so when a friend clicks Join, it registers eternalrp:// and discord-{client_id}:// in HKCU and catches the launch. That's how an Apple Music listener and a Spotify listener end up in sync.\n\n" +
      "Shipped as v1.0.0-beta: a PyInstaller --onefile build distributed through GitHub Releases, with a SHA-256 published for every build. Windows-only by construction, because it is built on the registry, COM and WinRT.",
    tech: ["Python 3.9+", "pypresence", "spotipy", "WinRT", "pywin32", "pystray", "PyInstaller", "Astro"],
    features: [
      "iTunes COM + Windows SMTC metadata extraction",
      "Raw named-pipe Discord listener for ACTIVITY_JOIN",
      "eternalrp:// + discord-{client_id}:// URI schemes, no admin",
      "Cover-art upload w/ litterbox → 0x0 → catbox fallback",
      "PyInstaller --onefile build, SHA-256 per release",
      "Tkinter settings window + pystray tray menu",
      "74 tests across ~3.9k lines of Python",
    ],
    github: "https://github.com/whoisaldo/Eternal-Rich-Presence",
    live: "https://eternalrichpresence.dev",
    images: [kaERP, erpWeb, erpWebFeatures, erpWebSetup, erpTerminal, erpDiscord],
    imageLabels: ["Now Playing", "eternalrichpresence.dev", "Features", "Setup Guide", "Terminal", "Discord Profile"],
    stats: { lang: "Python 3.9+", tests: "74", os: "Windows" },
  },
  {
    slug: "face-analytics",
    title: "Real-Time Face Analytics",
    tagline: "client-side CV, zero cloud",
    why:
      "Most face-analytics tools ship your webcam frames to a cloud endpoint. This one runs the whole pipeline in the browser. Nothing leaves the machine.",
    accent: LIVE,
    status: "live",
    description:
      "100%-in-browser face + emotion + age/gender detection with TensorFlow.js. No frames leave the device.",
    longDescription:
      "TensorFlow.js + face-api.js running the full inference pipeline client-side. Multi-face detection, 7-emotion classification, age + gender estimation, all in-browser.\n\n" +
      "Real-time performance on consumer hardware; zero data egress.",
    tech: ["React", "TypeScript", "TensorFlow.js", "face-api.js", "Redux Toolkit", "Tailwind CSS"],
    features: [
      "Multi-face detection",
      "Age & gender estimation",
      "7 emotion classes",
      "Analytics over time",
      "100% client-side",
      "No cloud calls",
    ],
    github: "https://github.com/whoisaldo/real-time-face-analytics",
    live: "https://whoisaldo.github.io/real-time-face-analytics/",
    images: [kaFace, facialFront, facialHappy, facialAngry],
    imageLabels: ["Local Inference", "Main", "Happy", "Angry"],
    stats: { engine: "TF.js", privacy: "Local", faces: "Multi" },
  },
  {
    slug: "signature-cuts",
    title: "Signature Cuts 413",
    tagline: "signaturecutschicopee.com",
    why:
      "A barbershop in Chicopee with nothing online, taking every booking by phone. The booking flow compiles into a WhatsApp deeplink, so there is no backend to keep alive.",
    accent: LIVE,
    status: "live",
    sideband: true,
    description:
      "Production marketing + lead-gen site for a Chicopee barbershop. Next.js 14 SSG, static export, WhatsApp-driven booking flow.",
    longDescription:
      "Next.js 14 App Router site with configuration-driven content (team, services, hours, gallery), Framer Motion animations, and a booking flow that compiles form state into a URI-encoded WhatsApp/SMS deeplink. No backend required.\n\n" +
      "Deployed via GH Pages SSG. Bebas Neue + Plus Jakarta Sans typography, glassmorphic 'Quartz' palette, JSON-LD BarberShop schema for local SEO. Premium 'Ali Younes' booking mode supports out-of-hours / at-home appointments.",
    tech: ["Next.js 14", "TypeScript", "Tailwind CSS", "Framer Motion", "LazyMotion", "SSG"],
    features: [
      "Static export to GH Pages (zero backend)",
      "Config-driven content (team / services / hours)",
      "'Book with [Barber]' custom event → form pre-fill",
      "WhatsApp + SMS URI deeplink booking",
      "JSON-LD BarberShop schema for local SEO",
      "Custom 'Quartz' palette + glassmorphism",
    ],
    github: "https://github.com/whoisaldo/FadeEmpire",
    live: "https://signaturecutschicopee.com",
    images: [kaSignatureCuts, sigCutsWeb, sigCutsPhone],
    imageLabels: ["Booking Flow", "Desktop", "Mobile"],
    stats: { stack: "Next 14", deploy: "GH Pages SSG", booking: "WhatsApp" },
  },
];

// Projects with a page on the front site and nowhere else. The playground
// builds its boards, Work deck, braindance places and cinema from
// featuredProjects, one each, so these stay out of it: an entry there is a
// new board in the city. src/data/work.js gives them their /work/ pages. No
// key art, so their pages start at the words.
export const frontProjects = [
  {
    slug: "agent-workflow",
    title: "Agentic workflow",
    tagline: "skills and recipes for Claude Code and Codex · open source",
    accent: LIVE,
    status: "live",
    description:
      "The skills and setup recipes I use to run Claude Code and Codex like a small dev team, published so anyone can take the parts that fit their own setup.",
    longDescription:
      "Three public repositories. aldos-agentic-workflow is the bank. A coordinator agent hands builds and reviews across Claude and Codex, and the repo collects the skills, tools and setup recipes around that, T3 Code, Tailscale and Cloudflare preview tunnels among them. Every recipe says when it helps, when to skip it and how to check that it works.\n\n" +
      "You don't install the bank. A small Python selector lists it, plans a selection from a preset such as minimal, personal-code or student, and copies only those files into a new folder, with a manifest, checking each file's hash. It installs nothing, signs in to nothing and opens no ports. Credentials and sessions stay out of Git, and CI runs Gitleaks over the whole history.\n\n" +
      "claude-codex-skills is three skills that let Claude Code hand off the jobs it is bad at. codex-image gets a real PNG out of the Codex CLI's image generator. codex-3d has Codex model a three.js module, a Blender GLB or an animatable SVG, renders it headlessly and lets Codex fix what it sees in its own render. codex-computer-use drives a running page in headless Chrome, screenshots every state and answers pass or fail with the evidence. Claude writes the code, Codex draws, models or inspects, and Claude looks at what came back before wiring it in.\n\n" +
      "codex-image-skill is where it started, the image skill on its own. It runs Codex read-only and takes only the images from its own thread, so parallel runs never mix. It uses the ChatGPT login Codex already has, with no API key.",
    tech: ["Python", "Claude Code", "Codex CLI", "Agent Skills", "headless Chrome", "Blender MCP", "three.js", "Gitleaks"],
    features: [
      "A selector that lists, plans and pulls a kit from presets",
      "Every recipe says when it helps and when to skip it",
      "Exports only inventoried files and checks their hashes",
      "Gitleaks over the whole history on every push",
      "codex-image: real raster images through Codex's image_gen",
      "codex-3d: geometry rendered headlessly, then fixed from its own render",
      "codex-computer-use: headless Chrome checks with screenshots as evidence",
      "Wrappers in plain Python, standard library only",
    ],
    github: "https://github.com/whoisaldo/aldos-agentic-workflow",
    moreSource: [
      { label: "claude-codex-skills", href: "https://github.com/whoisaldo/claude-codex-skills" },
      { label: "codex-image-skill", href: "https://github.com/whoisaldo/codex-image-skill" },
    ],
    live: null,
  },
  {
    slug: "github-reskin",
    title: "GitHub Reskin",
    tagline: "browser extension and userscript · themes for github.com",
    accent: LIVE,
    status: "live",
    sideband: true,
    description:
      "A browser extension and userscript that restyle github.com and gist.github.com in your own browser, with 25 themes, a theme builder, and a GitHub Action that draws your contribution graph in your colours.",
    longDescription:
      "Thirteen anime themes and twelve classic editor themes. A theme sets more than colours: the header, panels, fonts, code highlighting, diffs and the contribution graph. Full draws each theme's backgrounds and effects, and Calm keeps only the colours.\n\n" +
      "The builder starts from three colours and goes as far as fonts, patterns and your own images. It imports a theme from a file, pasted JSON or a share code, and it can give you a prompt to paste into a chatbot. GitHub Reskin itself never contacts an AI service. It asks for one permission, storage, plus the two GitHub sites, and it makes no network requests.\n\n" +
      "It isn't in the Chrome Web Store or on Firefox Add-ons yet, so you build it from source, or install the userscript, which is how it runs in Safari. I built it with Ali Tleis. MIT.",
    tech: ["JavaScript", "WebExtensions", "Userscript", "GitHub Actions", "GraphQL", "Astro"],
    features: [
      "13 anime themes and 12 classic editor themes",
      "Theme builder with import and export by file, JSON or share code",
      "Full or Calm, and reduced motion is respected",
      "Userscript for Safari and other browsers",
      "GitHub Action that draws your contribution graph as an SVG",
      "One permission, no network requests, no analytics",
    ],
    github: "https://github.com/sidebandstudio/GitHub-Reskin",
    live: "https://sidebandstudio.github.io/GitHub-Reskin/",
  },
];

export const otherProjects = [
  { title: "CS3520 · C++", description: "Course work: nested containers, Makefiles, GDB, CLI formatting.", tech: ["C++", "GDB", "Makefile"], github: "https://github.com/whoisaldo/CS3520-Summer-2025" },
  { title: "Password Generator", description: "Configurable password generator across Java and Swift.", tech: ["Java", "Swift"], github: "https://github.com/whoisaldo/Password-Generator" },
  { title: "Grade Calculator", description: "Weighted grade calculator with simple desktop UI.", tech: ["Java", "GUI"], github: "https://github.com/whoisaldo/Grade-Calculator" },
  { title: "BetterAppleMusic", description: "Windows desktop Apple Music client. Electron and MusicKit JS.", tech: ["TypeScript", "Electron", "React"], github: "https://github.com/whoisaldo/BetterAppleMusic" },
  { title: "topchoicerealty", description: "Cross-referencing tool for real estate property listing data.", tech: ["TypeScript", "React"], github: "https://github.com/whoisaldo/topchoicerealty" },
  { title: "VirtualDyno", description: "Virtual dynamometer. Estimates vehicle horsepower and torque.", tech: ["Simulation"], github: "https://github.com/whoisaldo/VirtualDyno" },
  { title: "Lua-Roblox-Commands", description: "Quick utility commands for Roblox game development.", tech: ["Lua", "Roblox"], github: "https://github.com/whoisaldo/Lua-Roblox-Commands" },
];
