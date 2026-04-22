// src/components/BentoProjects.jsx — Editorial bento with modal gallery
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink, Github, BookOpen, Dumbbell, Scissors, Code, Key, Calculator,
  Brain, X, ChevronLeft, ChevronRight, Maximize2, Monitor as MonitorIcon,
  Music, MessageCircle, Home, Gauge, Gamepad2, Check, Sparkles, Database,
} from "lucide-react";

// Moops
import moopsLanding  from "../assets/MoopsBookStore 2/LandingPage.png";
import moopsReview   from "../assets/MoopsBookStore 2/BookReview.png";
import moopsSignup   from "../assets/MoopsBookStore 2/Signup.png";
import moopsDashboard from "../assets/MoopsBookStore 2/UserDashboard.png";
import moopsProfile  from "../assets/MoopsBookStore 2/UserProfile.png";

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

// Signature Cuts 413 (supersedes Fade Empire)
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

const featuredProjects = [
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
    accentColor: "#ff3b30",
    stats: { platform: "Rust · Swift", transport: "UDP / H.264", latency: "< 30ms" },
    size: "tall",
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
    accentColor: "#ff3b30",
    stats: { clients: "iOS + Web", ai: "Gemini 2.0", api: "Express 5" },
    size: "tall",
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
    images: [moopsLanding, moopsDashboard, moopsReview, moopsProfile, moopsSignup],
    imageLabels: ["Landing", "Dashboard", "Reviews", "Profile", "Sign Up"],
    icon: BookOpen,
    accentColor: "#ff3b30",
    stats: { books: "1M+ API", auth: "JWT", social: "Full" },
    size: "short",
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
    accentColor: "#ff3b30",
    stats: { lang: "Python 3.8", dist: "Single EXE", os: "Windows" },
    size: "short",
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
    accentColor: "#ff3b30",
    stats: { stack: "Next 14", deploy: "GH Pages SSG", booking: "WhatsApp" },
    size: "short",
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
    accentColor: "#ff3b30",
    stats: { engine: "TF.js", privacy: "Local", faces: "Multi" },
    size: "short",
  },
];

const otherProjects = [
  {
    title: "CS3520 · C++",
    description: "Course work: nested containers, Makefiles, GDB, CLI formatting.",
    tech: ["C++", "GDB", "Makefile"],
    github: "https://github.com/whoisaldo/CS3520-Summer-2025",
    icon: Code,
  },
  {
    title: "Password Generator",
    description: "Configurable password generator across Java and Swift.",
    tech: ["Java", "Swift"],
    github: "https://github.com/whoisaldo/Password-Generator",
    icon: Key,
  },
  {
    title: "Grade Calculator",
    description: "Weighted grade calculator with simple desktop UI.",
    tech: ["Java", "GUI"],
    github: "https://github.com/whoisaldo/Grade-Calculator",
    icon: Calculator,
  },
  {
    title: "BetterAppleMusic",
    description: "Windows desktop Apple Music client — Electron + MusicKit JS.",
    tech: ["TypeScript", "Electron", "React"],
    github: "https://github.com/whoisaldo/BetterAppleMusic",
    icon: Music,
  },
  {
    title: "topchoicerealty",
    description: "Cross-referencing tool for real estate property listing data.",
    tech: ["TypeScript", "React"],
    github: "https://github.com/whoisaldo/topchoicerealty",
    icon: Home,
  },
  {
    title: "VirtualDyno",
    description: "Virtual dynamometer — vehicle horsepower + torque estimation.",
    tech: ["Simulation"],
    github: "https://github.com/whoisaldo/VirtualDyno",
    icon: Gauge,
  },
  {
    title: "Lua-Roblox-Commands",
    description: "Quick utility commands for Roblox game development.",
    tech: ["Lua", "Roblox"],
    github: "https://github.com/whoisaldo/Lua-Roblox-Commands",
    icon: Gamepad2,
  },
];

// ============================================================================
// Modal
// ============================================================================
function ProjectModal({ project, isOpen, onClose }) {
  const [idx, setIdx] = useState(0);
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
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-8"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-ink/92 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-ink border border-bone/15"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 border border-bone/30 text-bone/80 hover:bg-signal hover:text-ink hover:border-signal transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image viewport */}
          <div className="relative h-72 md:h-[480px] bg-ink-deep border-b border-bone/10">
            <img
              src={project.images[idx]}
              alt={project.imageLabels?.[idx] || project.title}
              className="w-full h-full object-contain"
            />
            {project.images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 border border-bone/30 text-bone/80 bg-ink/60 hover:bg-signal hover:border-signal hover:text-ink transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 border border-bone/30 text-bone/80 bg-ink/60 hover:bg-signal hover:border-signal hover:text-ink transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute top-4 left-4 mono-label text-bone/80 px-2 py-1 bg-ink/70 border border-bone/20">
                  {String(idx + 1).padStart(2, '0')} / {String(project.images.length).padStart(2, '0')} · {project.imageLabels?.[idx]}
                </div>
              </>
            )}
          </div>

          {/* Thumbs */}
          {project.images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto border-b border-bone/10 bg-ink-deep">
              {project.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`flex-shrink-0 w-24 h-16 overflow-hidden border transition-all
                              ${i === idx ? 'border-signal' : 'border-bone/20 opacity-50 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-10 grid md:grid-cols-[1fr_280px] gap-10">
            <div>
              <div className="mono-label text-signal mb-3">— Project</div>
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 border border-signal/40">
                  <Icon className="w-6 h-6 text-signal" />
                </div>
                <div>
                  <h2 className="serif-display italic text-4xl md:text-6xl text-bone leading-[0.9]">
                    {project.title}
                  </h2>
                  <p className="font-mono text-sm text-bone/60 mt-2">{project.tagline}</p>
                </div>
              </div>

              <p className="font-mono text-[13px] md:text-sm text-bone/80 leading-relaxed whitespace-pre-wrap mb-8">
                {project.longDescription}
              </p>

              {/* Features */}
              <div className="mb-8">
                <h3 className="mono-label text-bone/55 mb-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-signal" /> Features
                </h3>
                <div className="grid md:grid-cols-2 gap-2.5">
                  {project.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 font-mono text-[13px] text-bone/80">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-signal" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stack */}
              <div className="mb-8">
                <h3 className="mono-label text-bone/55 mb-4 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-signal" /> Stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <span key={t} className="mono-label px-2.5 py-1 border border-bone/20 text-bone/80">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: metadata table + CTAs */}
            <aside className="space-y-6">
              <div className="border border-bone/15">
                <div className="mono-label text-bone/50 px-4 pt-4 pb-2">— Metadata</div>
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
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-signal text-ink font-mono text-xs uppercase tracking-[0.2em] font-bold border-2 border-signal hover:bg-transparent hover:text-signal transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Visit Live
                  </a>
                )}
                <a
                  href={project.github}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-bone/30 text-bone font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-bone hover:text-ink hover:border-bone transition-colors"
                >
                  <Github className="w-4 h-4" /> Source
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
// Featured card
// ============================================================================
function FeaturedProjectCard({ project, index, onClick }) {
  const Icon = project.icon;
  const num = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer bg-ink border border-bone/10
                 hover:border-signal/50 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image — uniform aspect ratio, contained (no crop), dark backdrop */}
      <div className="relative aspect-[16/10] overflow-hidden bg-smoke border-b border-bone/10 flex items-center justify-center">
        <img
          src={project.images[0]}
          alt={project.title}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
        />

        {/* Subtle bottom fade for meta legibility */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(11,11,12,0.92) 0%, rgba(11,11,12,0.3) 60%, transparent 100%)",
          }}
        />

        {/* Top meta strip */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-ink/70 to-transparent">
          <span className="mono-label text-bone/85 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-signal" />
            {num} / Project
          </span>
          {project.images.length > 1 && (
            <span className="mono-label text-bone/75 flex items-center gap-1.5">
              <Maximize2 className="w-3 h-3" />
              {project.images.length}
            </span>
          )}
        </div>
      </div>

      {/* Content — flex-1 so every card body is equal height */}
      <div className="flex flex-col flex-1 p-5 md:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 border border-signal/40 shrink-0">
            <Icon className="w-4 h-4 text-signal" />
          </div>
          <div className="min-w-0">
            <h3 className="serif-display italic text-2xl md:text-3xl text-bone leading-[0.95]">
              {project.title}
            </h3>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone/50 mt-1.5 line-clamp-1">
              {project.tagline}
            </p>
          </div>
        </div>

        <p className="font-mono text-[12px] md:text-[13px] text-bone/65 leading-relaxed mb-4 line-clamp-3 flex-1">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
          {project.tech.slice(0, 4).map((t) => (
            <span key={t} className="mono-label px-2 py-0.5 border border-bone/15 text-bone/70">
              {t}
            </span>
          ))}
          {project.tech.length > 4 && (
            <span className="mono-label px-2 py-0.5 text-bone/45">+{project.tech.length - 4}</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-bone/10 mt-auto">
          <span className="mono-label text-bone/50">Open project</span>
          <span className="mono-label text-signal group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Section
// ============================================================================
export default function BentoProjects() {
  const [selected, setSelected] = useState(null);

  return (
    <section id="projects" className="relative py-28 md:py-36 px-6 bg-ink grain overflow-hidden">
      <div className="diag-rule top-16 left-[-55%] opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <div className="mono-label text-signal/80 mb-4">§ 01 — Selected Work</div>
          <h2 className="serif-display text-[14vw] md:text-[9rem] leading-[0.88] text-bone">
            <span className="italic">the</span>
            <span> </span>
            <span className="text-signal">projects.</span>
          </h2>
          <p className="font-mono text-xs md:text-sm text-bone/55 mt-6 max-w-xl">
            <span className="text-signal">›</span> Production systems and research prototypes.
            Tap any card for deep specs, gallery, and source.
          </p>
          <div className="wipe-divider mt-10" />
        </div>

        {/* Uniform grid — equal cards, no row-spans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-24">
          {featuredProjects.map((p, i) => (
            <FeaturedProjectCard key={p.title} project={p} index={i} onClick={() => setSelected(p)} />
          ))}
        </div>

        {/* Other */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mono-label text-signal/80 mb-2">§ 01.5</div>
            <h3 className="serif-display italic text-3xl md:text-5xl text-bone">other work.</h3>
          </div>
          <span className="mono-label text-bone/40 hidden sm:block">experiments · coursework · tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {otherProjects.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.a
                key={p.title}
                href={p.github}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group p-4 bg-ink border border-bone/10 hover:border-signal/40 hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 border border-signal/30">
                    <Icon className="w-3.5 h-3.5 text-signal" />
                  </div>
                  <h4 className="font-mono text-[13px] font-bold text-bone group-hover:text-signal transition-colors">
                    {p.title}
                  </h4>
                </div>
                <p className="font-mono text-[11px] text-bone/55 mb-3 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1">
                  {p.tech.map((t) => (
                    <span key={t} className="mono-label px-1.5 py-0.5 text-bone/55 bg-bone/5">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>

      <ProjectModal
        project={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
