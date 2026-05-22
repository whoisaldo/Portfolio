// src/components/BentoProjects.jsx — Mission Dossier (sticky scroll-pin, cyberpunk-HUD)
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  ExternalLink, Github, BookOpen, Dumbbell, Scissors, Code, Key, Calculator,
  Brain, X, ChevronLeft, ChevronRight, Maximize2, Monitor as MonitorIcon,
  Music, MessageCircle, Home, Gauge, Gamepad2, Check, Sparkles, Database,
  ArrowUpRight, ChevronDown, Hexagon,
} from "lucide-react";
import BracketFrame from "./hud/BracketFrame";

// Moops
import moopsLanding   from "../assets/MoopsBookStore 2/moopsbooks_Landing_page.png";
import moopsHome      from "../assets/MoopsBookStore 2/moopsbooks_Home.png";
import moopsDashboard from "../assets/MoopsBookStore 2/moopsbooks_dashboard.png";
import moopsClubs     from "../assets/MoopsBookStore 2/moopsbooks_clubs.png";

// Exerly Fitness (new ecosystem)
import exerlyLanding  from "../assets/ExerlyFitness/ExerlyWebViewLandingPage.png";
import exerlyDash     from "../assets/ExerlyFitness/ExerlyWebViewDashboard.png";
import exerlyAICoach  from "../assets/ExerlyFitness/ExerlyWebViewAICoach.png";
import exerlyFood     from "../assets/ExerlyFitness/ExerlyWebViewFoodTracker.png";
import exerlyProfile  from "../assets/ExerlyFitness/ExerlyWebViewProfileView.png";
import exerlySignup   from "../assets/ExerlyFitness/ExerlyWebViewSignup-Login.png";
import exerlyiOS1     from "../assets/ExerlyFitness/ExerlyFitnessPhoneView1.png";
import exerlyiOS2     from "../assets/ExerlyFitness/ExerlyFitnessPhoneView2.png";
import exerlyiOS3     from "../assets/ExerlyFitness/ExerlyFitnessPhoneView3.png";

// Signature Cuts 413
import sigCutsWeb   from "../assets/SignatureCuts/SignatureCutsWebView.png";
import sigCutsPhone from "../assets/SignatureCuts/SignatureCutsPhoneView.png";

// Eternal Rich Presence
import erpDiscord  from "../assets/EternalRichPresence/EternalRichPresenceDiscordProfileView.png";
import erpTerminal from "../assets/EternalRichPresence/EternalRichPresenceTerminal.png";

// Eternal Monitor
import emPC   from "../assets/EternalMonitor/EternalMonitorPCView.png";
import emIpad from "../assets/EternalMonitor/EternalMonitorIpadView.png";

// Facial Recognition
import facialFront from "../assets/Facial/FacialRecognitionFrontPage.png";
import facialHappy from "../assets/Facial/FacialRecognitionHappy.png";
import facialAngry from "../assets/Facial/FacialRegocnitionAngryFace.png";

// Eternal Reverse Studio
import erLanding       from "../assets/EternalReverseStudio/Eternal-Reverse-LandingPage.png";
import erProductsEM    from "../assets/EternalReverseStudio/Eternal-Reverse_ProductsEternalMonitor.png";
import erProductsExerly from "../assets/EternalReverseStudio/Eternal-Reverse_ProductsExerly-Fitness.png";

const featuredProjects = [
  {
    title: "Eternal Reverse",
    tagline: "indie software studio · eternalreverse.com",
    description: "An indie software studio I co-founded in Boston. Ships its own technically-ambitious products instead of doing client work — six and counting.",
    longDescription:
      "Premise: too many indie tools ship half-baked, bloat with features nobody asked for, and get abandoned the moment trends shift. Eternal Reverse exists to ship the opposite — software that's technically honest, built to last, and respects the person on the other end.\n\n" +
      "What it is: a two-person studio founded in Boston in 2025, with an open contributor model that lets outside engineers ship real features into live products and walk away with real credit. Six products live or in development across systems engineering (Rust + Swift display streaming), native iOS (HealthKit + SwiftUI), video pipelines (DaVinci + OpenCV), and modern web (Next.js + browser extensions).\n\n" +
      "What I do here: co-founder, lead engineer. Wrote the Rust host + Swift client behind Eternal Monitor (DXGI capture, hardware H.264, Metal render); the SwiftUI iOS app + Node API behind Exerly Fitness; and the studio's marketing site itself — Next.js 14 + custom design system, dynamic per-product detail pages, animated terminal boot on the hero.",
    tech: ["Next.js 14", "TypeScript", "React", "Tailwind CSS", "Framer Motion", "Rust", "SwiftUI", "Node.js"],
    features: [
      "6 products live or in active development",
      "Studio marketing site — Next.js 14 + dynamic product routes",
      "Custom design system (per-product accent colours + device frames)",
      "Animated terminal boot sequence on the hero",
      "Open contributor model — outside engineers ship real features",
      "Boston-based, two-person core, founded 2025",
    ],
    github: null,
    live: "https://eternalreverse.com",
    images: [erLanding, erProductsEM, erProductsExerly],
    imageLabels: ["Landing", "Products — Eternal Monitor", "Products — Exerly Fitness"],
    icon: Hexagon,
    stats: { role: "Co-founder", since: "2025", products: "6 shipped" },
  },
  {
    title: "Exerly Fitness",
    tagline: "iOS + Web + AI Coach · exerlyfitness.com",
    description: "Cross-platform fitness ecosystem: native SwiftUI iOS, React 19 web, Node/Express API, and a Gemini-powered AI coach.",
    longDescription:
      "Problem: Fitness enthusiasts juggle a half-dozen apps for workouts, nutrition, and sleep — and none of them actually coach.\n\n" +
      "Solution: Built a monorepo-backed ecosystem (apps/api, apps/web, apps/ios) with a unified REST backend, HealthKit-integrated iOS app, and a Gemini 2.0 Flash AI coach that adapts to each user's TDEE, goals, and logged progress.\n\n" +
      "Impact: Active production deployment on DigitalOcean + GH Pages. 12-step onboarding computes maintenance calories via Mifflin-St Jeor, nutrition logging falls back FatSecret → Open Food Facts, AI credits are rate-limited to keep API costs sane.",
    tech: ["SwiftUI", "React 19", "TypeScript", "Node.js", "Express 5", "MongoDB", "SQLite", "Gemini 2.0", "HealthKit"],
    features: [
      "Native iOS w/ HealthKit bi-directional sync",
      "React 19 web dashboard + admin panel",
      "Gemini 2.0 AI coach w/ rate-limited credits",
      "Dual-mode DB: MongoDB (prod) / SQLite (dev)",
      "Barcode scanning w/ FatSecret + OFF fallback",
      "12-step TDEE onboarding wizard",
    ],
    github: "https://github.com/whoisaldo/Exerly-Fitness",
    live: "https://exerlyfitness.com",
    images: [exerlyLanding, exerlyDash, exerlyAICoach, exerlyFood, exerlyProfile, exerlySignup, exerlyiOS1, exerlyiOS2, exerlyiOS3],
    imageLabels: ["Landing", "Dashboard", "AI Coach", "Food Tracker", "Profile", "Sign Up", "iOS Home", "iOS Workouts", "iOS Sleep"],
    icon: Dumbbell,
    stats: { clients: "iOS + Web", ai: "Gemini 2.0", api: "Express 5" },
  },
  {
    title: "Moops Bookstore",
    tagline: "social reading, full-stack",
    description: "Full-stack social platform combining book discovery, tracking, and community features on a custom MongoDB backend.",
    longDescription:
      "Problem: Readers juggle Goodreads, Amazon, and a notes app to track what they're reading.\n\n" +
      "Solution: Built a unified MERN app that integrates the Google Books API (1M+ titles) with JWT-authenticated social features.\n\n" +
      "Impact: Friends can share reading lists, write reviews, and discover in one place.",
    tech: ["React", "TypeScript", "Node.js", "MongoDB", "Express", "Google Books API", "JWT"],
    features: [
      "JWT auth + secure sessions",
      "Search 1M+ books via Google Books API",
      "Personal reading lists & tracking",
      "Write and share reviews",
      "Friend system & social feed",
      "Mobile-first responsive",
    ],
    github: "https://github.com/whoisaldo/MoopBookstore",
    live: "https://whoisaldo.github.io/MoopBookstore",
    images: [moopsLanding, moopsHome, moopsDashboard, moopsClubs],
    imageLabels: ["Landing", "Home", "Dashboard", "Clubs"],
    icon: BookOpen,
    stats: { books: "1M+ API", auth: "JWT", social: "Full" },
  },
  {
    title: "Eternal Monitor",
    tagline: "Windows → iPad over UDP · < 30ms",
    description: "Rust host + SwiftUI iPad client streaming a Windows desktop as a wireless second monitor with hardware H.264 encode/decode.",
    longDescription:
      "Problem: Wireless second-monitor apps either cost a fortune or buckle under latency.\n\n" +
      "Solution: Wrote a Rust host that captures the Windows desktop via DXGI, encodes H.264 through NVENC / AMF / QSV (software libx264 fallback), fragments frames into a custom 16-byte UDP header, and streams to an iPad client that decodes via VideoToolbox and renders through Metal.\n\n" +
      "Impact: Low-latency mirroring over a local network with multi-vendor GPU auto-detection. Demo at eternalmonitor.dev.",
    tech: ["Rust", "SwiftUI", "DXGI", "H.264", "VideoToolbox", "Metal", "FlatBuffers", "tokio", "mDNS"],
    features: [
      "DXGI desktop capture with hardware acceleration",
      "NVENC / AMF / QSV / libx264 encoder auto-selection",
      "Custom UDP fragmentation w/ u16 sequence counters",
      "H.264 Baseline for VideoToolbox compatibility",
      "Metal-backed MTKView rendering on iPad",
      "FlatBuffers serialization for FramePacket",
    ],
    github: "https://github.com/whoisaldo/EternalMonitor",
    live: "https://eternalmonitor.dev",
    images: [emPC, emIpad],
    imageLabels: ["Windows Host", "iPad Client"],
    icon: MonitorIcon,
    stats: { platform: "Rust · Swift", transport: "UDP / H.264", latency: "< 30ms" },
  },
  {
    title: "Eternal Rich Presence",
    tagline: "Apple Music → Discord",
    description: "Windows system-tray bridge between Apple Music / Spotify and Discord Rich Presence with custom Listen-Along via named-pipes.",
    longDescription:
      "Problem: Apple Music doesn't talk to Discord, period. And Listen Along is Spotify-only.\n\n" +
      "Solution: Python tray app interfacing iTunes COM and Windows SMTC to extract 'Now Playing' metadata, scrapes high-res cover art, and pushes to Discord via pypresence. A custom DiscordEventListener taps raw Windows named pipes to catch ACTIVITY_JOIN events, handled through a registered eternalrp:// URI protocol.\n\n" +
      "Impact: Cross-platform Listen Along sync between Apple Music and Spotify listeners, packaged as a single portable .exe.",
    tech: ["Python 3.8", "pypresence", "spotipy", "winrt", "pywin32", "pystray", "PyInstaller"],
    features: [
      "iTunes COM + Windows SMTC metadata extraction",
      "Raw named-pipe Discord event listener",
      "eternalrp:// + discord-{client_id}:// URI schemes",
      "High-res cover art scrape → catbox.moe",
      "Single-file portable .exe via PyInstaller",
      "First-run Tkinter config GUI",
    ],
    github: "https://github.com/whoisaldo/Eternal-Rich-Presence",
    live: null,
    images: [erpTerminal, erpDiscord],
    imageLabels: ["Terminal", "Discord Profile"],
    icon: MessageCircle,
    stats: { lang: "Python 3.8", dist: "Single EXE", os: "Windows" },
  },
  {
    title: "Real-Time Face Analytics",
    tagline: "client-side CV, zero cloud",
    description: "100%-in-browser face + emotion + age/gender detection with TensorFlow.js. No frames leave the device.",
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
    images: [facialFront, facialHappy, facialAngry],
    imageLabels: ["Main", "Happy", "Angry"],
    icon: Brain,
    stats: { engine: "TF.js", privacy: "Local", faces: "Multi" },
  },
  {
    title: "Signature Cuts 413",
    tagline: "signaturecutschicopee.com",
    description: "Production marketing + lead-gen site for a Chicopee barbershop. Next.js 14 SSG, static export, WhatsApp-driven booking flow.",
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
    images: [sigCutsWeb, sigCutsPhone],
    imageLabels: ["Desktop", "Mobile"],
    icon: Scissors,
    stats: { stack: "Next 14", deploy: "GH Pages SSG", booking: "WhatsApp" },
  },
];

const otherProjects = [
  { title: "CS3520 · C++", description: "Course work: nested containers, Makefiles, GDB, CLI formatting.", tech: ["C++", "GDB", "Makefile"], github: "https://github.com/whoisaldo/CS3520-Summer-2025", icon: Code },
  { title: "Password Generator", description: "Configurable password generator across Java and Swift.", tech: ["Java", "Swift"], github: "https://github.com/whoisaldo/Password-Generator", icon: Key },
  { title: "Grade Calculator", description: "Weighted grade calculator with simple desktop UI.", tech: ["Java", "GUI"], github: "https://github.com/whoisaldo/Grade-Calculator", icon: Calculator },
  { title: "BetterAppleMusic", description: "Windows desktop Apple Music client — Electron + MusicKit JS.", tech: ["TypeScript", "Electron", "React"], github: "https://github.com/whoisaldo/BetterAppleMusic", icon: Music },
  { title: "topchoicerealty", description: "Cross-referencing tool for real estate property listing data.", tech: ["TypeScript", "React"], github: "https://github.com/whoisaldo/topchoicerealty", icon: Home },
  { title: "VirtualDyno", description: "Virtual dynamometer — vehicle horsepower + torque estimation.", tech: ["Simulation"], github: "https://github.com/whoisaldo/VirtualDyno", icon: Gauge },
  { title: "Lua-Roblox-Commands", description: "Quick utility commands for Roblox game development.", tech: ["Lua", "Roblox"], github: "https://github.com/whoisaldo/Lua-Roblox-Commands", icon: Gamepad2 },
];

// ============================================================================
// Modal — preserved verbatim from previous iteration
// ============================================================================
function ProjectModal({ project, isOpen, onClose }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [project]);
  if (!isOpen || !project) return null;
  const Icon = project.icon;
  const next = () => setIdx(i => (i + 1) % project.images.length);
  const prev = () => setIdx(i => (i - 1 + project.images.length) % project.images.length);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center p-0 md:p-8"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-ink/95 backdrop-blur-sm" />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-ink border border-hud/30 bracket-frame"
          onClick={(e) => e.stopPropagation()}
        >
          <span aria-hidden className="bracket-corner tl lg" />
          <span aria-hidden className="bracket-corner tr lg" />
          <span aria-hidden className="bracket-corner bl lg" />
          <span aria-hidden className="bracket-corner br lg" />
          <button
            onClick={onClose}
            aria-label="Close project details"
            className="absolute top-4 right-4 z-10 p-2 border border-bone/30 text-bone/80 hover:bg-signal hover:text-ink hover:border-signal transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative h-72 md:h-[480px] bg-ink-deep border-b border-bone/10">
            <img src={project.images[idx]} alt={project.imageLabels?.[idx] || project.title} className="w-full h-full object-contain" />
            {project.images.length > 1 && (
              <>
                <button onClick={prev} aria-label="Previous image" className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 border border-bone/30 text-bone/80 bg-ink/60 hover:bg-hud hover:border-hud hover:text-ink transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={next} aria-label="Next image" className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 border border-bone/30 text-bone/80 bg-ink/60 hover:bg-hud hover:border-hud hover:text-ink transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute top-4 left-4 mono-label text-bone/80 px-2 py-1 bg-ink/70 border border-hud/40">
                  [{String(idx + 1).padStart(2, '0')}/{String(project.images.length).padStart(2, '0')}] · {project.imageLabels?.[idx]}
                </div>
              </>
            )}
          </div>

          {project.images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto border-b border-bone/10 bg-ink-deep">
              {project.images.map((img, i) => (
                <button key={i} onClick={() => setIdx(i)} className={`flex-shrink-0 w-24 h-16 overflow-hidden border transition-all ${i === idx ? 'border-hud' : 'border-bone/20 opacity-50 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-6 md:p-10 grid md:grid-cols-[1fr_280px] gap-10">
            <div>
              <div className="mono-label text-hud mb-3">— dossier_entry</div>
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 border border-hud/40">
                  <Icon className="w-6 h-6 text-hud" />
                </div>
                <div>
                  <h2 id="project-modal-title" className="serif-display italic text-4xl md:text-6xl text-bone leading-[0.9]">{project.title}</h2>
                  <p className="font-mono text-sm text-bone/60 mt-2">{project.tagline}</p>
                </div>
              </div>
              <p className="font-serif text-[15px] md:text-base text-bone/85 leading-relaxed whitespace-pre-wrap mb-8">{project.longDescription}</p>
              <div className="mb-8">
                <h3 className="mono-label text-bone/55 mb-4 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-hud" /> features</h3>
                <div className="grid md:grid-cols-2 gap-2.5">
                  {project.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 font-mono text-[13px] text-bone/80">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-hud" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-8">
                <h3 className="mono-label text-bone/55 mb-4 flex items-center gap-2"><Database className="w-3.5 h-3.5 text-hud" /> stack</h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <span key={t} className="mono-label px-2.5 py-1 border border-hud/25 text-bone/80">[{t}]</span>
                  ))}
                </div>
              </div>
            </div>
            <aside className="space-y-6">
              <div className="border border-hud/25 bracket-frame">
                <span aria-hidden className="bracket-corner tl sm" />
                <span aria-hidden className="bracket-corner tr sm" />
                <span aria-hidden className="bracket-corner bl sm" />
                <span aria-hidden className="bracket-corner br sm" />
                <div className="mono-label text-hud px-4 pt-4 pb-2">— telemetry</div>
                <dl className="divide-y divide-bone/10">
                  {Object.entries(project.stats).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5 font-mono text-[12px]">
                      <dt className="uppercase tracking-wider text-bone/45">{k}</dt>
                      <dd className="text-bone text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="space-y-2">
                {project.live && (
                  <a href={project.live} target="_blank" rel="noreferrer" className="scan-beam-host w-full flex items-center justify-center gap-2 py-3.5 bg-signal text-ink font-mono text-xs uppercase tracking-[0.2em] font-bold border-2 border-signal hover:bg-transparent hover:text-signal transition-colors">
                    <ExternalLink className="w-4 h-4" /> visit live
                  </a>
                )}
                <a href={project.github} target="_blank" rel="noreferrer" className="scan-beam-host w-full flex items-center justify-center gap-2 py-3.5 border-2 border-bone/30 text-bone font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-bone hover:text-ink hover:border-bone transition-colors">
                  <Github className="w-4 h-4" /> source
                </a>
              </div>
            </aside>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Dossier panel — single project rendered full-bleed
// ============================================================================
function DossierPanel({ project, idx, total, onOpen, active = true }) {
  const Icon = project.icon;
  const n = String(idx + 1).padStart(2, "0");
  const totalN = String(total).padStart(2, "0");

  return (
    <div className={`relative w-full h-full transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-center h-full px-4 lg:px-10">
        {/* Image left 7 cols */}
        <div className="lg:col-span-7">
          <BracketFrame
            size="lg"
            className="scan-beam-host relative aspect-[16/10] bg-concrete border border-bone/10 overflow-hidden"
            data-hud-target="card"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(project)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(project); }}
          >
            <img
              src={project.images[0]}
              alt={project.title}
              loading="lazy"
              className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-[1.02]"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(14,13,20,0.94) 0%, rgba(14,13,20,0.3) 60%, transparent 100%)" }}
            />
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase">
              <span className="text-hud">[ dossier_{n} ]</span>
              {project.images.length > 1 && (
                <span className="text-bone/70 flex items-center gap-1.5">
                  <Maximize2 className="w-3 h-3" />
                  {project.images.length}
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase text-bone/65">
              <span>▸ click_to_access</span>
              <span className="text-hud/70">[ {n} / {totalN} ]</span>
            </div>
          </BracketFrame>
        </div>

        {/* Metadata right 5 cols */}
        <div className="lg:col-span-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="p-2 border border-hud/40">
              <Icon className="w-4 h-4 text-hud" />
            </div>
            <span className="telemetry">// project_file</span>
          </div>

          <h3 className="serif-display italic text-bone text-4xl lg:text-6xl leading-[0.92] mb-3">
            {project.title}
          </h3>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bone/55 mb-6">
            {project.tagline}
          </p>

          <p className="font-serif text-bone/80 text-[15px] md:text-base leading-[1.55] mb-6 max-w-lg">
            {project.description}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-7 max-w-md">
            {project.tech.slice(0, 6).map((t) => (
              <span key={t} className="font-mono text-[10px] tracking-[0.12em] px-2 py-1 border border-hud/25 text-bone/75 uppercase">
                [{t}]
              </span>
            ))}
            {project.tech.length > 6 && (
              <span className="font-mono text-[10px] text-bone/45 px-2 py-1 uppercase tracking-[0.12em]">+{project.tech.length - 6}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onOpen(project)}
              data-hud-target="link"
              className="scan-beam-host group inline-flex items-center gap-3 px-5 py-2.5 bg-signal text-ink font-mono text-xs uppercase tracking-[0.2em] font-bold border-2 border-signal hover:bg-transparent hover:text-signal transition-colors"
            >
              ▶ access_file
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer"
                data-hud-target="link"
                className="scan-beam-host group inline-flex items-center gap-2 px-5 py-2.5 border-2 border-hud/40 text-hud font-mono text-xs uppercase tracking-[0.2em] font-bold hover:border-hud hover:bg-hud/5 transition-colors"
              >
                ↗ live
              </a>
            )}
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              data-hud-target="link"
              className="scan-beam-host group inline-flex items-center gap-2 px-5 py-2.5 border-2 border-bone/25 text-bone/85 font-mono text-xs uppercase tracking-[0.2em] font-bold hover:border-bone hover:text-bone transition-colors"
            >
              <Github className="w-3.5 h-3.5" /> source
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section — Mission Dossier
// ============================================================================
export default function BentoProjects() {
  const [selected, setSelected] = useState(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const wrapperRef = useRef(null);
  const pinRef = useRef(null);

  const total = featuredProjects.length;

  // Native sticky pin + framer-motion useScroll. wrapperRef is `total * 60vh + 40vh` tall;
  // pinRef sticks at top:0 for the duration. scrollYProgress is 0→1 across the wrapper.
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Progress bar width animates with scroll — feels like a video timeline.
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  // Drive `active` from progress, but only setState when the integer slice changes —
  // avoids re-rendering on every scroll frame.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(total - 1, Math.max(0, Math.floor(p * total)));
    setActive((prev) => (prev === next ? prev : next));
  });

  return (
    <section id="projects" className="relative bg-ink grain">
      {/* Section header */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-28 md:pt-36 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="flex items-end justify-between gap-8 border-b border-hud/15 pb-6"
        >
          <div className="flex items-baseline gap-6">
            <span className="font-display italic text-hud text-3xl lg:text-4xl leading-none">II.</span>
            <div>
              <p className="font-mono text-[10px] tracking-editorial text-hud/70 uppercase mb-2">// mission_dossier</p>
              <h2 className="serif-display text-[12vw] md:text-[8rem] leading-[0.88] text-bone">
                <span className="italic">selected</span>{" "}
                <span className="text-signal">works.</span>
              </h2>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45 hidden lg:block">
            <div>files {String(total).padStart(2, "0")} active</div>
            <div className="text-hud/60 mt-1">scroll to traverse ▾</div>
          </div>
        </motion.div>
      </div>

      {/* Pinned dossier — desktop. wrapper height = total × ~60vh of scroll
          per project so traversal feels snappy instead of crawling. */}
      <div
        ref={wrapperRef}
        className="relative hidden lg:block"
        style={{ height: `${total * 60 + 40}vh` }}
      >
        <div ref={pinRef} className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Top HUD strip — counter + title + progress bar, all in one
              header so the counter can't get clipped and reads like a media-player timeline. */}
          <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
            {/* Top row: counter, current title, scroll % */}
            <div className="flex items-center justify-between px-6 lg:px-10 pt-5 pb-3 font-mono text-[11px] tracking-[0.22em] uppercase">
              <div className="flex items-baseline gap-3">
                <span className="text-hud tabular-nums">
                  [
                  <motion.span
                    key={active}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                    className="inline-block text-hud font-bold"
                  >
                    {" " + String(active + 1).padStart(2, "0") + " "}
                  </motion.span>
                  / {String(total).padStart(2, "0")} ]
                </span>
                <span className="text-bone/30">·</span>
                <motion.span
                  key={`title-${active}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                  className="text-bone/85 tracking-[0.18em] normal-case font-display italic text-base lg:text-lg"
                >
                  {featuredProjects[active].title}
                </motion.span>
              </div>
              <div className="hidden md:flex items-center gap-3 text-bone/45">
                <span className="text-hud/70">▸</span>
                <span>mission_dossier</span>
                <span className="text-bone/20">·</span>
                <span className="tabular-nums text-hud/85">
                  <motion.span style={{
                    // Show progress as integer % using useTransform → string
                  }}>
                    {Math.round(((active + 1) / total) * 100)}%
                  </motion.span>
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="relative h-[3px] w-full bg-bone/8 overflow-hidden mx-6 lg:mx-10" style={{ width: "auto" }}>
              <motion.div
                className="h-full bg-gradient-to-r from-signal via-hud to-signal"
                style={{ width: progressWidth }}
              />
            </div>
            {/* Tick marks — one per project */}
            <div className="relative mx-6 lg:mx-10 mt-1 flex justify-between">
              {featuredProjects.map((_, i) => (
                <span
                  key={i}
                  className={`block transition-all duration-300 ${active >= i ? "h-2 w-px bg-hud" : "h-1 w-px bg-bone/25"}`}
                />
              ))}
            </div>
          </div>

          {/* Mini-index (left rail) */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
            {featuredProjects.map((p, i) => (
              <button
                key={p.title}
                onClick={() => {
                  const wrap = wrapperRef.current;
                  if (!wrap) return;
                  const rect = wrap.getBoundingClientRect();
                  const start = window.scrollY + rect.top;
                  const stepH = (total * 60 + 40) / total / 100 * window.innerHeight;
                  const target = start + stepH * (i + 0.5);
                  window.scrollTo({ top: target, behavior: "smooth" });
                }}
                className="group flex items-center gap-3 text-left"
                aria-label={`Jump to ${p.title}`}
              >
                <span className={`block transition-all duration-500 ${active === i ? "h-px w-8 bg-hud" : "h-px w-3 bg-bone/30 group-hover:w-5 group-hover:bg-bone/60"}`} />
                <span className={`font-mono text-[10px] tracking-[0.22em] uppercase transition-colors duration-500 ${active === i ? "text-hud" : "text-bone/35 group-hover:text-bone/60"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>

          {/* Giant watermark numeral — sits behind everything; animates with
              a chromatic-aberration burst that resolves into a clean ghost
              every time `active` advances. This is the obvious "you're on a
              new project now" cue. */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
            <motion.div
              key={`watermark-${active}`}
              initial={{ opacity: 0, scale: 1.08, x: 30 }}
              animate={{ opacity: 0.14, scale: 1, x: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
              className="absolute -bottom-16 -right-8 select-none flex items-end gap-4"
            >
              <motion.span
                key={`wm-num-${active}`}
                initial={{ textShadow: "6px 0 rgba(192,132,252,0.95), -6px 0 rgba(126,34,206,0.95)" }}
                animate={{ textShadow: "0px 0 rgba(192,132,252,0), 0px 0 rgba(126,34,206,0)" }}
                transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
                className="font-display italic text-signal leading-none tabular-nums block"
                style={{ fontSize: "clamp(14rem, 24vw, 26rem)", lineHeight: 0.78 }}
              >
                {String(active + 1).padStart(2, "0")}
              </motion.span>
              <span className="font-mono text-bone/15 text-2xl tracking-[0.2em] uppercase mb-8 lg:mb-12 select-none">
                / {String(total).padStart(2, "0")}
              </span>
            </motion.div>
            {/* Sweeping scan line that flashes on project change */}
            <motion.div
              key={`scan-${active}`}
              initial={{ x: "-110%", opacity: 0 }}
              animate={{ x: "110%", opacity: [0, 0.5, 0.5, 0] }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
              className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-signal/80 to-transparent"
            />
          </div>

          {/* Active dossier — slide-X transition between panels.
              Only render active panel + nearest neighbors so the DOM stays light. */}
          <div className="relative w-full h-full max-w-7xl mx-auto flex items-center z-[2]">
            {featuredProjects.map((p, i) => {
              const offset = i - active;
              if (Math.abs(offset) > 1) return null;
              const x = offset === 0 ? "0%" : offset > 0 ? "8%" : "-8%";
              const opacity = offset === 0 ? 1 : 0;
              return (
                <div
                  key={p.title}
                  className="absolute inset-0 flex items-center"
                  style={{
                    transform: `translateX(${x})`,
                    opacity,
                    transition: "transform 600ms cubic-bezier(0.2,0.7,0.2,1), opacity 500ms ease-out",
                    pointerEvents: offset === 0 ? "auto" : "none",
                    zIndex: offset === 0 ? 10 : 0,
                  }}
                >
                  <DossierPanel project={p} idx={i} total={total} onOpen={setSelected} active={offset === 0} />
                </div>
              );
            })}
          </div>

          {/* Bottom telemetry + scroll cue — animated chevron + current title */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.22em] uppercase text-bone/55">
              <span className="text-hud">[ {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} ]</span>
              <span className="text-bone/30">·</span>
              <span className="text-bone/80">{featuredProjects[active].title}</span>
            </div>
            {active < total - 1 ? (
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center gap-0.5"
              >
                <span className="font-mono text-[9px] tracking-[0.4em] text-hud/70 uppercase">scroll</span>
                <ChevronDown className="w-4 h-4 text-hud/80" />
              </motion.div>
            ) : (
              <span className="font-mono text-[9px] tracking-[0.4em] text-hud/60 uppercase">[ end of dossier ]</span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/tablet — stacked dossier */}
      <div className="lg:hidden space-y-16 pb-20 px-2">
        {featuredProjects.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
            className="min-h-[60vh]"
          >
            <DossierPanel project={p} idx={i} total={total} onOpen={setSelected} active />
          </motion.div>
        ))}
      </div>

      {/* Other projects — condensed bracket-numbered list */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-12 pb-24 md:pb-32">
        <div className="flex items-end justify-between gap-8 border-b border-bone/10 pb-5 mb-8">
          <div className="flex items-baseline gap-6">
            <span className="font-display italic text-hud/85 text-2xl lg:text-3xl leading-none">II.b</span>
            <div>
              <p className="font-mono text-[10px] tracking-editorial text-hud/60 uppercase mb-2">// auxiliary_files</p>
              <h3 className="serif-display italic text-3xl md:text-5xl text-bone">other work.</h3>
            </div>
          </div>
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45 hidden md:block">
            experiments · coursework · tools
          </span>
        </div>

        <div className="border border-bone/10 divide-y divide-bone/10">
          {otherProjects.map((p, i) => {
            const Icon = p.icon;
            const isOpen = expanded === i;
            const n = String(i + 7).padStart(2, "0");
            return (
              <div key={p.title} className="scan-beam-host">
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="w-full flex items-center gap-4 px-4 md:px-6 py-4 text-left hover:bg-concrete/40 transition-colors group"
                  data-hud-target="link"
                >
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-hud/70 w-10 shrink-0">
                    [{n}]
                  </span>
                  <div className="p-1.5 border border-hud/25 shrink-0">
                    <Icon className="w-3.5 h-3.5 text-hud" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-mono text-[13px] font-bold text-bone group-hover:text-hud transition-colors">
                      {p.title}
                    </h4>
                    <p className="font-mono text-[11px] text-bone/55 line-clamp-1 md:line-clamp-none mt-0.5">{p.description}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-bone/40 transition-transform ${isOpen ? "rotate-180 text-hud" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 md:px-6 pb-5 pt-1 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex flex-wrap gap-1.5">
                          {p.tech.map((t) => (
                            <span key={t} className="font-mono text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border border-bone/15 text-bone/65">[{t}]</span>
                          ))}
                        </div>
                        <a
                          href={p.github}
                          target="_blank"
                          rel="noreferrer"
                          data-hud-target="link"
                          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-hud hover:text-bone transition-colors"
                        >
                          <Github className="w-3.5 h-3.5" /> source ↗
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <ProjectModal project={selected} isOpen={!!selected} onClose={() => setSelected(null)} />
    </section>
  );
}
