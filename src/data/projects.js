// src/data/projects.js — single source of truth for project content.
//
// Every claim here is backed by docs/PROJECT_CONTEXT.md, which records a
// line-by-line audit against source code, live sites and the GitHub API.
// Read it before editing any copy. Three rules carried over from that pass:
//   1. Never cite Exerly's landing-page stats or testimonials — both are
//      hardcoded fiction in that repo, not telemetry.
//   2. Never restore EternalMonitor's "<30ms latency" — no benchmark exists.
//   3. EternalExchange is a ProjectE "spin-off", never a "port".
//
// `accent` is sampled from each project's own key-art plate (scripted, not
// picked by eye): the dominant chromatic hue after excluding the violet rim
// light the eight plates share. Where a plate carries no distinct product
// hue, the accent stays in the violet family the art actually contains.
// The rail tints its chrome to the focused project, so colour here means
// "which project you are looking at" rather than decoration.

// Every `images[]` entry below is an encoded variant set rather than a bare
// URL — `{ src, width, height, avif, webp, thumb, lqip, lqipKey }`. The source
// PNGs were replaced by AVIF/WebP (plus a mozjpeg fallback for key art) by
// `npm run images`; see scripts/optimize-images.mjs for the encoder settings
// and src/data/images.js for the generated map. Render them through
// <Picture> / <ProjectImage>, not a bare <img src>.
import { img } from "./images";

// Key art — generated device-mockup plates, 3:2 (1536x1024). Each is a
// photorealistic shot of the real product running on real hardware; the
// genuine screenshot is passed to the generator so the screen shows actual UI,
// never invented interface. Regeneration recipe: docs/mock.sh + docs/post.sh.
const kaEternalReverse = img("KeyArt/KeyArt_EternalReverse");
const kaExerly = img("KeyArt/KeyArt_Exerly");
const kaEternalExchange = img("KeyArt/KeyArt_EternalExchange");
const kaMoops = img("KeyArt/KeyArt_Moops");
const kaEternalMonitor = img("KeyArt/KeyArt_EternalMonitor");
const kaERP = img("KeyArt/KeyArt_EternalRichPresence");
const kaFace = img("KeyArt/KeyArt_FaceAnalytics");
const kaSignatureCuts = img("KeyArt/KeyArt_SignatureCuts");

// Moops — moopsbooks.com (captured live, 2026-07)
const moopsLanding = img("MoopsBookStore 2/moopsbooks_Landing2026");
const moopsBrowse = img("MoopsBookStore 2/moopsbooks_Browse2026");

// Exerly Fitness — web captured live 2026-07; iOS shots from the device build
const exerlyLanding = img("ExerlyFitness/ExerlyWebLanding2026");
const exerlyDayLog = img("ExerlyFitness/ExerlyWebDayLogged2026");
const exerlyFeatures = img("ExerlyFitness/ExerlyWebFeatures2026");
const exerlyIOSWeb = img("ExerlyFitness/ExerlyWebIOS2026");
const exerlyiOS1 = img("ExerlyFitness/ExerlyFitnessPhoneView1");
const exerlyiOS2 = img("ExerlyFitness/ExerlyFitnessPhoneView2");
const exerlyiOS3 = img("ExerlyFitness/ExerlyFitnessPhoneView3");

// EternalExchange — eternalexchangemod.com
const eeLanding = img("EternalExchange/EternalExchangeLanding");
const eeEMC = img("EternalExchange/EternalExchangeEMCValues");
const eeHowItWorks = img("EternalExchange/EternalExchangeHowItWorks");
const eeFeatures = img("EternalExchange/EternalExchangeFeatures");
const eeInstall = img("EternalExchange/EternalExchangeInstall");

// Signature Cuts 413
const sigCutsWeb = img("SignatureCuts/SignatureCutsWebView");
const sigCutsPhone = img("SignatureCuts/SignatureCutsPhoneView");

// Eternal Rich Presence — eternalrichpresence.dev + real app captures
const erpWeb = img("EternalRichPresence/EternalRichPresenceWebLanding");
const erpWebFeatures = img("EternalRichPresence/EternalRichPresenceWebFeatures");
const erpWebSetup = img("EternalRichPresence/EternalRichPresenceWebSetup");
const erpDiscord = img("EternalRichPresence/EternalRichPresenceDiscordProfileView");
const erpTerminal = img("EternalRichPresence/EternalRichPresenceTerminal");

// Eternal Monitor — eternalmonitor.dev + real device captures
const emWeb = img("EternalMonitor/EternalMonitorWebLanding");
const emWebFeatures = img("EternalMonitor/EternalMonitorWebFeatures");
const emPC = img("EternalMonitor/EternalMonitorPCView");
const emIpad = img("EternalMonitor/EternalMonitorIpadView");

// Facial Recognition — the "Regocnition" spelling is the real filename
const facialFront = img("Facial/FacialRecognitionFrontPage");
const facialHappy = img("Facial/FacialRecognitionHappy");
const facialAngry = img("Facial/FacialRegocnitionAngryFace");

// Eternal Reverse Studio — eternalreverse.com (captured live, 2026-07)
const erLanding = img("EternalReverseStudio/EternalReverseLanding2026");
const erProducts = img("EternalReverseStudio/EternalReverseProducts2026");
const erProductsEM = img("EternalReverseStudio/EternalReverseProductEternalMonitor2026");
const erProductsExerly = img("EternalReverseStudio/EternalReverseProductExerly2026");
const erAbout = img("EternalReverseStudio/EternalReverseAbout2026");

export const featuredProjects = [
  {
    slug: "eternal-reverse",
    title: "Eternal Reverse",
    tagline: "indie software studio · eternalreverse.com",
    accent: "#7C5CFF",
    status: "live",
    description:
      "A two-person indie software studio I co-founded in Boston. Ships its own technically-ambitious products instead of doing client work — six of them, four already live.",
    longDescription:
      "Premise: too many indie tools ship half-baked, bloat with features nobody asked for, and get abandoned the moment trends shift. Eternal Reverse exists to ship the opposite — software that's technically honest, built to last, and respects the person on the other end.\n\n" +
      "What it is: a two-person studio founded in Boston in 2025. Six products span systems engineering (Rust + Swift display streaming), native iOS (SwiftUI + HealthKit), video pipelines (DaVinci Resolve + OpenCV), and modern web (Next.js + a Chrome MV3 extension). Four are live — EternalRichPresence, Signature Cuts 413, Eternal2x and Eternal Summary — with EternalMonitor and Exerly Fitness still in active development.\n\n" +
      "What I do here: co-founder and lead engineer. Wrote the Rust host + Swift client behind EternalMonitor (DXGI capture, hardware H.264, Metal render); the SwiftUI iOS app + Node API behind Exerly Fitness; and the studio site itself — Next.js + a custom design system, per-product detail routes, and an animated terminal boot on the hero.",
    tech: ["Next.js", "TypeScript", "React", "Tailwind CSS", "Framer Motion", "Rust", "SwiftUI", "Node.js"],
    features: [
      "6 products — 4 live, 2 in active development",
      "Studio site: Next.js + per-product detail routes",
      "Animated terminal boot sequence on the hero",
      "Custom design system w/ per-product accents",
      "Systems, iOS, video-pipeline and web work under one roof",
      "Boston-based, two-person core, founded 2025",
    ],
    github: null,
    live: "https://eternalreverse.com",
    images: [kaEternalReverse, erLanding, erProducts, erProductsEM, erProductsExerly, erAbout],
    imageLabels: ["Studio Index", "Landing", "Products", "Product — EternalMonitor", "Product — Exerly Fitness", "About"],
    stats: { role: "Co-founder", since: "2025", products: "6 active" },
  },
  {
    slug: "exerly-fitness",
    title: "Exerly Fitness",
    tagline: "web live · native iOS in the wings · exerlyfitness.com",
    accent: "#9B5CFF",
    status: "live",
    description:
      "Cross-platform fitness ecosystem — React 19 web, a Node/Express API, an AI coach, and a native SwiftUI iOS client built and waiting on the App Store.",
    longDescription:
      "Problem: Fitness enthusiasts juggle a half-dozen apps for workouts, nutrition and sleep — and none of them actually coach.\n\n" +
      "Solution: An npm-workspaces monorepo (apps/api, apps/web, apps/ios) behind one REST backend, so the browser and the phone read the same account and the same data. The AI coach builds its prompt from your real profile — age, weight, goals, logged progress — instead of answering in a vacuum.\n\n" +
      "Where it stands: the web app is live at exerlyfitness.com (GitHub Pages) against an Express API on DigitalOcean. The iOS client is real and written — 71 Swift files, ~9k lines, a full 12-step onboarding that computes maintenance calories via Mifflin-St Jeor — but it hasn't shipped to the App Store yet, so the site says 'coming soon' and so do I.\n\n" +
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
    imageLabels: ["A Logged Day", "Landing", "Dashboard & AI Coach", "Features", "iOS — Coming Soon", "iOS — Welcome", "iOS — 12-Step Onboarding", "iOS — AI Coach"],
    stats: { web: "Live", ios: "Built · pre-App Store", api: "51 endpoints" },
  },
  {
    slug: "eternal-exchange",
    title: "EternalExchange",
    tagline: "equivalent-exchange alchemy for Fabric · eternalexchangemod.com",
    accent: "#2FD37A",
    status: "pre-release",
    description:
      "A 39K-line Minecraft alchemy mod for Fabric 1.21.1 — a spin-off of ProjectE with a recipe-graph solver that prices every item in the game at world load.",
    longDescription:
      "Premise: 'equivalent exchange' is one of the oldest ideas in modded Minecraft — every item has an energy value (EMC), and once you've learned an item you can break matter down and rebuild it into anything else you know. ProjectE is the canonical take on it, and it's MIT-licensed but Forge/NeoForge-only. Fabric — the other half of the modern modding ecosystem — had nothing comparable.\n\n" +
      "What this is: a Fabric-native spin-off of ProjectE, credited openly in the README and the LICENSE. The interesting part isn't re-listing the alchemy — it's that Fabric simply doesn't have the primitives the original assumes. Capabilities, attachments, item handlers, a TOML config spec, fluid stacks, an event bus: none of it exists. So the mod carries its own 2,031-line compatibility layer that reimplements that surface, 9 Mixins standing in for vanilla hooks Fabric never fires, and a networking stack rebuilt on Fabric's PayloadTypeRegistry with a deferred client-receiver install so packets stay loadable on a dedicated server.\n\n" +
      "The EMC solver is the centrepiece: at server start and after every /reload it walks the entire loaded recipe graph and propagates values outward from a seed set, using exact BigFraction arithmetic so fractional intermediates don't drift into rounding errors. Add another mod and its recipes get priced automatically — no patch required. Every value is overridable via custom_emc.json, a datapack, or the TOML config.\n\n" +
      "Status: v1.0.0 pre-release, MIT, a 4.5 MB jar built and attached by CI. Save-compatible with the NeoForge original — knowledge, bags and custom EMC carry across. Original gameplay content beyond the classic set is on the roadmap, not in the jar yet.",
    tech: ["Java 21", "Minecraft 1.21.1", "Fabric Loader", "Fabric API", "Gradle · Loom", "Mixin", "night-config", "Commons Math"],
    features: [
      "Recipe-graph EMC solver runs at world load and /reload",
      "Exact BigFraction arithmetic — no rounding drift",
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
    accent: "#FF9147",
    status: "live",
    description:
      "Full-stack social reading tracker — shelves, reviews, clubs and a streak counter, on a MongoDB backend with the Google Books catalogue behind search.",
    longDescription:
      "Problem: Readers juggle Goodreads, Amazon and a notes app to track what they're reading, and every one of them is louder than it needs to be.\n\n" +
      "Solution: A single MERN app built around the idea that tracking should feel quiet. Search runs against the Google Books catalogue, shelves and reviews are yours, and the social side — activity feed, clubs, leaderboard — is opt-in rather than the default surface.\n\n" +
      "Impact: Live at moopsbooks.com with JWT-authenticated accounts, a read / reading / streak dashboard, and a warm dark theme that stays out of the way. The source repository is private.",
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
    tagline: "Windows → iPad over UDP · eternalmonitor.dev",
    accent: "#C4D62E",
    status: "in-dev",
    description:
      "Rust host + SwiftUI iPad client that turns an iPad into a wireless second display for Windows, with hardware H.264 encode and decode end to end.",
    longDescription:
      "Problem: Wireless second-monitor apps either cost a subscription, need a dongle, or buckle the moment the network gets busy.\n\n" +
      "Solution: A Rust host captures the Windows desktop through DXGI Desktop Duplication, encodes H.264 via NVENC → AMF → QSV with a libx264 software fallback (the chain auto-probes and reorders by GPU vendor), fragments each frame behind a custom 16-byte UDP header, and streams to an iPad client that decodes on VideoToolbox and presents through a Metal-backed MTKView. UDP over TCP was deliberate — a dropped frame should be a dropped frame, not head-of-line blocking.\n\n" +
      "Design details I'd defend: H.264 Baseline specifically because that's what the iPad's hardware decoder is happiest with; fragment counters widened u8 → u16 once frames started exceeding 255 fragments; packets carry a FlatBuffers FramePacket; discovery is mDNS with manual IP entry as the reliable path.\n\n" +
      "Honest status: v0.1.2-mirror, in active development. It mirrors the primary display — no extended desktop and no input relay yet — and I haven't instrumented true glass-to-glass latency, so I don't quote a number for it. 5,900 lines of Rust and 3,700 of Swift, MIT.",
    tech: ["Rust", "SwiftUI", "DXGI", "H.264", "VideoToolbox", "Metal", "FlatBuffers", "tokio", "mDNS"],
    features: [
      "DXGI Desktop Duplication capture on the Windows host",
      "NVENC / AMF / QSV / libx264 encoder auto-selection",
      "Custom 16-byte UDP header w/ u16 fragment counters",
      "H.264 Baseline for VideoToolbox compatibility",
      "Metal-backed MTKView rendering on iPad",
      "FlatBuffers FramePacket over the wire",
      "mDNS discovery w/ manual-IP fallback",
    ],
    github: "https://github.com/whoisaldo/EternalMonitor",
    live: "https://eternalmonitor.dev",
    images: [kaEternalMonitor, emWeb, emWebFeatures, emPC, emIpad],
    imageLabels: ["Frame Transport", "eternalmonitor.dev", "Features", "Windows Host", "iPad Client"],
    stats: { platform: "Rust · Swift", transport: "UDP / H.264", status: "v0.1.2 · in dev" },
  },
  {
    slug: "eternal-rich-presence",
    title: "Eternal Rich Presence",
    tagline: "Apple Music → Discord · eternalrichpresence.dev",
    accent: "#FF3B54",
    status: "live",
    description:
      "Windows system-tray bridge putting Apple Music and Spotify on your Discord profile — with a Listen Along built on raw named pipes.",
    longDescription:
      "Problem: Apple Music doesn't talk to Discord, period. And Discord's Listen Along is Spotify-only, so an Apple Music listener can't share what they're playing at all.\n\n" +
      "Solution: A Python tray app that reads Now Playing from the iTunes COM interface and Windows' System Media Transport Controls, then pushes it to Discord through pypresence. Cover art is pulled from the media session and uploaded so Discord has a public URL to show, with a fallback chain (litterbox → 0x0 → catbox) so a single host being down doesn't kill the artwork.\n\n" +
      "The part I'm actually proud of: pypresence is send-only, so Listen Along was impossible with it. The app opens Discord's IPC named pipes (\\\\.\\pipe\\discord-ipc-0..9) directly over ctypes/kernel32, speaks the frame protocol by hand, and subscribes to ACTIVITY_JOIN — so when a friend clicks Join, it registers eternalrp:// and discord-{client_id}:// in HKCU and catches the launch. That's how an Apple Music listener and a Spotify listener end up in sync.\n\n" +
      "Shipped as v1.0.0-beta: a PyInstaller --onefile build distributed through GitHub Releases, with a SHA-256 published for every build. Windows-only by construction — it's built on the registry, COM and WinRT.",
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
    accent: "#5B9DFF",
    status: "live",
    description:
      "100%-in-browser face + emotion + age/gender detection with TensorFlow.js. No frames leave the device.",
    longDescription:
      "Problem: Most face-analytics tools ship frames to a cloud endpoint — privacy-hostile and slow.\n\n" +
      "Solution: TensorFlow.js + face-api.js running the full inference pipeline client-side. Multi-face detection, 7-emotion classification, age + gender estimation, all in-browser.\n\n" +
      "Impact: Real-time performance on consumer hardware; zero data egress.",
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
    accent: "#6E63E8",
    status: "live",
    description:
      "Production marketing + lead-gen site for a Chicopee barbershop. Next.js 14 SSG, static export, WhatsApp-driven booking flow.",
    longDescription:
      "Problem: Local barbershop with no digital footprint and 100% phone-based bookings.\n\n" +
      "Solution: Next.js 14 App Router site with configuration-driven content (team, services, hours, gallery), Framer Motion animations, and a booking flow that compiles form state into a URI-encoded WhatsApp/SMS deeplink — no backend required.\n\n" +
      "Impact: Deployed via GH Pages SSG. Bebas Neue + Plus Jakarta Sans typography, glassmorphic 'Quartz' palette, JSON-LD BarberShop schema for local SEO. Premium 'Ali Younes' booking mode supports out-of-hours / at-home appointments.",
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

export const otherProjects = [
  { title: "CS3520 · C++", description: "Course work: nested containers, Makefiles, GDB, CLI formatting.", tech: ["C++", "GDB", "Makefile"], github: "https://github.com/whoisaldo/CS3520-Summer-2025" },
  { title: "Password Generator", description: "Configurable password generator across Java and Swift.", tech: ["Java", "Swift"], github: "https://github.com/whoisaldo/Password-Generator" },
  { title: "Grade Calculator", description: "Weighted grade calculator with simple desktop UI.", tech: ["Java", "GUI"], github: "https://github.com/whoisaldo/Grade-Calculator" },
  { title: "BetterAppleMusic", description: "Windows desktop Apple Music client — Electron + MusicKit JS.", tech: ["TypeScript", "Electron", "React"], github: "https://github.com/whoisaldo/BetterAppleMusic" },
  { title: "topchoicerealty", description: "Cross-referencing tool for real estate property listing data.", tech: ["TypeScript", "React"], github: "https://github.com/whoisaldo/topchoicerealty" },
  { title: "VirtualDyno", description: "Virtual dynamometer — vehicle horsepower + torque estimation.", tech: ["Simulation"], github: "https://github.com/whoisaldo/VirtualDyno" },
  { title: "Lua-Roblox-Commands", description: "Quick utility commands for Roblox game development.", tech: ["Lua", "Roblox"], github: "https://github.com/whoisaldo/Lua-Roblox-Commands" },
];
