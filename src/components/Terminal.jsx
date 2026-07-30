// src/components/Terminal.jsx — Direct Console (cyberpunk-restrained)
import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon, Wifi, Battery, Clock } from "lucide-react";

// Fun facts pool — surfaced on boot and via `funfact`
const FUN_FACTS = [
  "Daily driver is a fully built supercharged Audi S4 (B8.5). 540 whp. Tuned it myself.",
  "Ranked top-3 in Massachusetts during high school for powerlifting. Still take the gym seriously — diet + sleep + lifts dialed in.",
  "Spends weekends building agentic workflows in Claude Code. The same toolchain you're talking to right now helped ship this portfolio.",
  "Built Exerly Fitness because every commercial fitness app is paywalled. Wanted a free, open-source platform that actually coaches.",
  "VirtualDyno exists because I’m obsessed with cars and wanted to estimate horsepower without renting a dyno.",
  "Moops Bookstore started because I was reading more and wanted a social platform for me and my friends — Goodreads is fine, but it’s not ours.",
  "Has hosted Minecraft + Ark Survival servers for friends — running them and tuning the configs taught me more about Linux than any class.",
  "Currently watching / re-watching: Mr Robot, Pantheon, Vinland Saga. All-time list includes Breaking Bad, Better Call Saul, Snowfall, Invincible, Bojack Horseman.",
  "Plays Cyberpunk 2077 between sprints. The HUD on this portfolio is a love-letter to that game’s UI language.",
  "Eternal Monitor exists because I refused to pay $40 for an iPad-as-second-display app that lagged. Wrote my own in Rust + SwiftUI.",
  "Eternal Rich Presence exists because Apple Music doesn’t talk to Discord. So I made it talk — over Discord’s raw IPC named pipes.",
  "EternalExchange is my Fabric spin-off of ProjectE: a solver walks Minecraft’s whole recipe graph at world load and prices every item in the game.",
];

function pickFact() {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

// Virtual file system
const fileSystem = {
  "~": {
    type: "dir",
    children: {
      "about.txt": { type: "file", content: `Ali Younes — Software Engineer\n\nCS & Political Science @ Northeastern University (Class of '27).\nCurrently: SDE Intern at AWS CloudFormation · Infrastructure as Code — Seattle, WA.\nPreviously: SWE Co-op at Philips — VM automation & PicIX deployment pipelines (C#, PowerShell, .NET).\n\nI architect distributed, high-stakes systems — and I build the tools that keep them running.\n\nType 'cat skills.md' or 'skills' for the full stack.` },
      "skills.md": { type: "file", content: `# Technical Skills\n\n## Languages\n- TypeScript / JavaScript  ████████████████████  Expert\n- C++                      ████████████████░░░░  Advanced\n- C# / .NET                ██████████████░░░░░░  Proficient\n- Python                   ████████████░░░░░░░░  Proficient\n- Rust                     ████████████░░░░░░░░  Proficient\n- Swift / SwiftUI          ██████████░░░░░░░░░░  Intermediate\n- Go                       ████████░░░░░░░░░░░░  Learning\n\n## Frontend\nReact · TypeScript · Tailwind · Framer Motion · Next.js\n\n## Backend & Systems\nNode.js · Express · MongoDB · .NET · PowerShell\n\n## Cloud & Infra\nAWS · Linux · DevOps · IaC (CDK/CloudFormation) · CI/CD` },
      "contact.json": { type: "file", content: `{\n  "email": "younes.al@northeastern.edu",\n  "personal": "whois.younes@gmail.com",\n  "business": "Aliyounes@eternalreverse.com",\n  "location": "Boston, MA → Seattle, WA (Summer '26)",\n  "github": "github.com/whoisaldo",\n  "linkedin": "linkedin.com/in/alialdoyounes",\n  "status": "Open to opportunities"\n}` },
      "resume.pdf": { type: "file", content: `[Binary file — use 'open resume.pdf' to download]` },
      ".bashrc": { type: "file", content: `# Ali's bashrc\nexport PS1="\\u@eternalreverse:\\w %"\nalias ll="ls -la"\nalias cls="clear"` },
      ".gitconfig": { type: "file", content: `[user]\n  name = Ali Younes\n  email = younes.al@northeastern.edu\n[core]\n  editor = vim` },
      "projects": {
        type: "dir",
        children: {
          "eternal-monitor": { type: "dir", children: {
            "README.md": { type: "file", content: `# Eternal Monitor\nLow-latency remote desktop — Rust host + SwiftUI iPad client\n\nTech: Rust, SwiftUI, DXGI, H.264, VideoToolbox, UDP\nLive: eternalmonitor.dev\nRepo: github.com/whoisaldo/EternalMonitor` }
          }},
          "exerly-fitness": { type: "dir", children: {
            "README.md": { type: "file", content: `# Exerly Fitness\nWeb (React 19) + Node/Express API + AI coach, with a native SwiftUI iOS client built and awaiting the App Store\n\nTech: SwiftUI, React 19, Node.js, Express 5, MongoDB/SQLite, gemini-2.0-flash-lite, JWT\n51 REST endpoints · AI capped at 5/hr · 20/day\nLive: exerlyfitness.com\nRepo: github.com/whoisaldo/Exerly-Fitness` }
          }},
          "eternal-exchange": { type: "dir", children: {
            "README.md": { type: "file", content: `# EternalExchange\nEquivalent-exchange alchemy for Minecraft 1.21.1 on Fabric — a spin-off of ProjectE\n\nA recipe-graph solver prices every item at world load using exact BigFraction math.\nCarries a 2,031-line compatibility layer + 9 Mixins for primitives Fabric doesn't provide.\n\n39,399 LOC · 450 Java files · 86 items · 21 blocks · 15 GUIs\nTech: Java 21, Fabric Loader, Fabric API, Gradle/Loom, Mixin\nLive: eternalexchangemod.com\nRepo: github.com/whoisaldo/EternalExchange` }
          }},
          "moops-bookstore": { type: "dir", children: {
            "README.md": { type: "file", content: `# Moops Bookstore\nSocial reading tracker — shelves, reviews, clubs, streaks\n\nTech: React, TypeScript, Node.js, MongoDB, Google Books API, JWT\nLive: moopsbooks.com\nRepo: private` }
          }},
          "eternal-rich-presence": { type: "dir", children: {
            "README.md": { type: "file", content: `# Eternal Rich Presence\nWindows tray app bridging Apple Music & Spotify → Discord Rich Presence\n\nListen Along built on Discord's raw IPC named pipes (pypresence is send-only).\n\nTech: Python 3.9+, pypresence, spotipy, WinRT, pywin32, PyInstaller\n74 tests · ~3.9k lines\nLive: eternalrichpresence.dev\nRepo: github.com/whoisaldo/Eternal-Rich-Presence` }
          }},
          "signature-cuts-413": { type: "dir", children: {
            "README.md": { type: "file", content: `# Signature Cuts 413\nProduction barbershop site (Chicopee, MA)\n\nTech: Next.js 14, TypeScript, Tailwind, Framer Motion (SSG on GitHub Pages)\nLive: signaturecutschicopee.com` }
          }},
          "face-analytics": { type: "dir", children: {
            "README.md": { type: "file", content: `# Real-Time Face Analytics\nClient-side facial recognition & emotion detection\n\nTech: React, TensorFlow.js, face-api.js\nRepo: github.com/whoisaldo/real-time-face-analytics` }
          }},
        }
      },
      "experience": {
        type: "dir",
        children: {
          "aws.md": { type: "file", content: `# AWS — SDE Intern (Current)\nCloudFormation · Infrastructure as Code | Jun 2026 — Present | Seattle, WA\n\n- Defining cloud infrastructure as version-controlled CloudFormation templates\n- Service-level project across distributed systems & operational tooling\n- Security-first engineering under Principal/Senior SDE mentorship\n- Repeatable, auditable, declarative deployments at AWS scale` },
          "philips.md": { type: "file", content: `# Philips — Software Engineering Co-op\nSystem Integration and Automation | Jan 2026 — Jun 2026 | Cambridge, MA\n\n- Large- and small-scale VM automation\n- Automated setups & deployment pipelines for PicIX platform\n- C#, .NET Framework, PowerShell, DevOps\n- Enterprise imaging infrastructure at scale` },
          "topchoice.md": { type: "file", content: `# Top Choice Realty — Frontend Developer Intern\nApr 2024 — Aug 2024 | New York, NY\n\n- Built full-stack app (React, Python, SQL)\n- 85% faster lookups, 3x query speed\n- Managed 800+ client records` },
          "defalco.md": { type: "file", content: `# Robert DeFalco Realty — Computer Technician\nJun 2023 — Sep 2023 | New York, NY\n\n- On-site support across 3+ offices\n- Configured 15+ systems (Win/Mac/Linux)\n- Maintained 95%+ system uptime` },
        }
      }
    }
  }
};

const getDir = (path) => {
  const parts = path.replace(/^~/, "~").split("/").filter(Boolean);
  let current = fileSystem["~"];
  if (path === "~" || path === "") return current;
  for (const part of parts) {
    if (part === "~") continue;
    if (current.children && current.children[part]) {
      current = current.children[part];
    } else {
      return null;
    }
  }
  return current;
};

const resolvePath = (currentPath, targetPath) => {
  if (targetPath.startsWith("~")) return targetPath;
  if (targetPath.startsWith("/")) return "~" + targetPath;
  let parts = currentPath.split("/").filter(Boolean);
  const targetParts = targetPath.split("/");
  for (const part of targetParts) {
    if (part === "..") {
      if (parts.length > 1 || (parts.length === 1 && parts[0] !== "~")) parts.pop();
    } else if (part !== ".") {
      parts.push(part);
    }
  }
  return parts.join("/") || "~";
};

export default function Terminal() {
  const asciiArt = `
   █████╗ ██╗     ██╗    ██╗   ██╗ ██████╗ ██╗   ██╗███╗   ██╗███████╗███████╗
  ██╔══██╗██║     ██║    ╚██╗ ██╔╝██╔═══██╗██║   ██║████╗  ██║██╔════╝██╔════╝
  ███████║██║     ██║     ╚████╔╝ ██║   ██║██║   ██║██╔██╗ ██║█████╗  ███████╗
  ██╔══██║██║     ██║      ╚██╔╝  ██║   ██║██║   ██║██║╚██╗██║██╔══╝  ╚════██║
  ██║  ██║███████╗██║       ██║   ╚██████╔╝╚██████╔╝██║ ╚████║███████╗███████║
  ╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝`;

  const [history, setHistory] = useState(() => [
    { type: "ascii", text: asciiArt },
    { type: "system", text: "eternalreverse.system v4.0 — direct console" },
    { type: "system", text: `last login: ${new Date().toLocaleString()} on ttys000` },
    { type: "system", text: "uplink: stable · auth: ok · subject: ali_younes\n" },
    { type: "output", text: `  ▸ fact_of_the_session
    ${pickFact()}
` },
    { type: "output", text: `  QUICK START
  ───────────────────────────────────────────────
    help         all available commands
    about        personal brief
    experience   work history (AWS · Philips · ...)
    projects     featured builds
    skills       stack breakdown
    contact      how to reach me
    resume       open resume.pdf

    funfact      random fact about me
    interests    what i'm into (tv · cars · fitness · gaming · ai)
    vitals       current status
    uplink       system uplink status

  Tab = autocomplete   ↑↓ = history   Ctrl+L = clear
` },
  ]);
  const [input, setInput] = useState("");
  const [currentDir, setCurrentDir] = useState("~");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allCommands = useMemo(() => [
    "help", "man", "clear", "ls", "cd", "cat", "pwd", "whoami", "hostname",
    "date", "uptime", "echo", "history", "banner", "about", "skills",
    "experience", "education", "projects", "contact", "resume", "socials",
    "neofetch", "tree", "grep", "find", "open", "sudo", "exit", "hire",
    "git", "vim", "nano", "touch", "mkdir", "rm", "cp", "mv", "head", "tail",
    "funfact", "interests", "uplink", "vitals"
  ], []);

  const executeCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const [command, ...args] = trimmed.split(/\s+/);
    const lowerCmd = command.toLowerCase();

    setHistory(prev => [...prev, { type: "prompt", path: currentDir, text: trimmed }]);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setSuggestions([]);

    switch (lowerCmd) {
      case "help":
        setHistory(prev => [...prev, { type: "output", text: `
  AVAILABLE COMMANDS
  ═══════════════════════════════════════════════

  core           help · about · skills · experience · projects · contact · resume · hire
  fs             ls · cd · pwd · cat · tree · find · open · head · tail · grep
  system         whoami · hostname · date · uptime · neofetch · history · clear · banner
  fun            sudo hire · git status · git log · vim · nano

  keys           Tab = complete   ↑↓ = history   Ctrl+L = clear   Enter = run

  Start with 'about', 'experience', or 'projects'.
` }]);
        break;

      case "man":
        if (!args[0]) {
          setHistory(prev => [...prev, { type: "output", text: "What manual page do you want?\nUsage: man <command>" }]);
        } else {
          setHistory(prev => [...prev, { type: "output", text: `
${args[0].toUpperCase()}(1)                   User Commands                   ${args[0].toUpperCase()}(1)

NAME
       ${args[0]} — ${args[0] === "ls" ? "list directory contents" :
                      args[0] === "cd" ? "change directory" :
                      args[0] === "cat" ? "concatenate and print files" :
                      args[0] === "hire" ? "initiate hiring process for Ali" :
                      "portfolio command"}

SYNOPSIS
       ${args[0]} [OPTIONS] [ARGUMENTS]

DESCRIPTION
       Type 'help' to see all available commands.

AUTHOR
       Written by Ali Younes.
` }]);
        }
        break;

      case "clear":
        setHistory([]);
        break;

      case "ls": {
        const showHidden = args.includes("-a") || args.includes("-la") || args.includes("-al");
        const showLong = args.includes("-l") || args.includes("-la") || args.includes("-al");
        const targetPath = args.find(a => !a.startsWith("-")) || currentDir;
        const resolved = resolvePath(currentDir, targetPath);
        const dir = getDir(resolved);

        if (!dir || dir.type !== "dir") {
          setHistory(prev => [...prev, { type: "error", text: `ls: cannot access '${targetPath}': No such file or directory` }]);
        } else {
          let items = Object.keys(dir.children || {});
          if (!showHidden) items = items.filter(i => !i.startsWith("."));

          if (showLong) {
            const output = items.map(name => {
              const item = dir.children[name];
              const isDir = item.type === "dir";
              const perms = isDir ? "drwxr-xr-x" : "-rw-r--r--";
              const size = isDir ? "4096" : String(item.content?.length || 0).padStart(5);
              const date = "Apr 20 12:00";
              const colorClass = isDir ? "text-signal" : "text-bone/80";
              return `${perms}  1 ali  staff  ${size}  ${date}  <span class="${colorClass}">${name}${isDir ? "/" : ""}</span>`;
            }).join("\n");
            setHistory(prev => [...prev, { type: "html", text: `total ${items.length * 8}\n${output}` }]);
          } else {
            const output = items.map(name => {
              const item = dir.children[name];
              const isDir = item.type === "dir";
              return isDir ? `<span class="text-signal font-bold">${name}/</span>` :
                     name.endsWith(".md") ? `<span class="text-ember">${name}</span>` :
                     name.endsWith(".json") ? `<span class="text-bone/90">${name}</span>` :
                     `<span class="text-bone/70">${name}</span>`;
            }).join("  ");
            setHistory(prev => [...prev, { type: "html", text: output }]);
          }
        }
        break;
      }

      case "cd": {
        const target = args[0] || "~";
        const resolved = resolvePath(currentDir, target);
        const dir = getDir(resolved);
        if (!dir) {
          setHistory(prev => [...prev, { type: "error", text: `cd: no such file or directory: ${target}` }]);
        } else if (dir.type !== "dir") {
          setHistory(prev => [...prev, { type: "error", text: `cd: not a directory: ${target}` }]);
        } else {
          setCurrentDir(resolved);
        }
        break;
      }

      case "cat": {
        if (!args[0]) {
          setHistory(prev => [...prev, { type: "error", text: "cat: missing file operand" }]);
        } else {
          const resolved = resolvePath(currentDir, args[0]);
          const file = getDir(resolved);
          if (!file) {
            setHistory(prev => [...prev, { type: "error", text: `cat: ${args[0]}: No such file or directory` }]);
          } else if (file.type === "dir") {
            setHistory(prev => [...prev, { type: "error", text: `cat: ${args[0]}: Is a directory` }]);
          } else {
            setHistory(prev => [...prev, { type: "file", text: file.content }]);
          }
        }
        break;
      }

      case "pwd":
        setHistory(prev => [...prev, { type: "output", text: `/home/ali${currentDir.replace("~", "")}` }]);
        break;

      case "whoami":
        setHistory(prev => [...prev, { type: "output", text: `  ali_younes // operator
  ─────────────────────────────────────────────
  rank      sde-intern @ aws (active) · swe co-op @ philips (prev)
  loc       boston, ma → seattle, wa (summer '26)
  edition   iv · v05.10.26
  signal    online · uplink stable
  ─────────────────────────────────────────────
  try:  about · interests · funfact · vitals` }]);
        break;

      case "funfact":
        setHistory(prev => [...prev, { type: "output", text: `  ▸ ${pickFact()}` }]);
        break;

      case "interests":
        setHistory(prev => [...prev, { type: "output", text: `
  INTERESTS — ali_younes
  ═══════════════════════════════════════════════

  ▣ film/tv
    Cyberpunk 2077 · Mr Robot · Pantheon · Snowfall
    Breaking Bad · Better Call Saul · Vinland Saga
    Invincible · Bojack Horseman

  ▣ cars
    Daily: Audi S4 (B8.5) — fully built, supercharged,
    540 whp. Tuned it myself. VirtualDyno (in the
    'other work' list) is a side-effect of this hobby.

  ▣ fitness
    Top-3 ranked in Massachusetts during high school.
    Gym is serious — programmed lifts, nutrition,
    sleep. Exerly Fitness exists because i wanted a
    coaching platform that's free + open-source.

  ▣ tech / ai
    Building agentic workflows with Claude Code. The
    same toolchain you're talking to right now helped
    ship this portfolio.

  ▣ gaming / homelab
    Self-hosted Ark Survival + Minecraft servers for
    friends. The server-admin grind taught me more
    about Linux than any class.

  ▸ try 'projects' to see what these interests turned into.
` }]);
        break;

      case "uplink":
        setHistory(prev => [...prev, { type: "output", text: `
  ╔═══════════════════════════════════════════╗
  ║         UPLINK STATUS // EDITION_IV       ║
  ╠═══════════════════════════════════════════╣
  ║                                           ║
  ║   ▮  signal............................OK ║
  ║   ▮  auth..............................OK ║
  ║   ▮  channel.encrypted..........STABLE_AES║
  ║   ▮  edition.................IV · v05.10.26║
  ║   ◆  boston, ma · 42.36°n 71.06°w         ║
  ║   ⏵  next.............AWS_CFN // seattle  ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
` }]);
        break;

      case "vitals":
        setHistory(prev => [...prev, { type: "output", text: `
  CURRENT STATUS // ${new Date().toLocaleTimeString()}
  ───────────────────────────────────────────────
  now        SDE Intern @ AWS CloudFormation · IaC · Seattle, WA
             (Infrastructure as Code · CloudFormation)
  prev       SWE Co-op @ Philips · Cambridge, MA
             Jan–Jun '26
  current    CS & Political Science · Northeastern
             Class of '27
  open to    full-time '27, interesting side-quests
  ───────────────────────────────────────────────
  contact    younes.al@northeastern.edu` }]);
        break;

      case "hostname":
        setHistory(prev => [...prev, { type: "output", text: "eternalreverse" }]);
        break;

      case "date":
        setHistory(prev => [...prev, { type: "output", text: new Date().toString() }]);
        break;

      case "uptime":
        setHistory(prev => [...prev, { type: "output", text: `${new Date().toLocaleTimeString()}  up 999 days,  1 user,  load average: 0.42, 0.38, 0.35` }]);
        break;

      case "echo":
        setHistory(prev => [...prev, { type: "output", text: args.join(" ") }]);
        break;

      case "history":
        setHistory(prev => [...prev, { type: "output", text: commandHistory.map((c, i) => `  ${String(i + 1).padStart(3)}  ${c}`).join("\n") || "No commands in history" }]);
        break;

      case "tree": {
        const targetPath = args[0] || currentDir;
        const resolved = resolvePath(currentDir, targetPath);
        const dir = getDir(resolved);
        if (!dir || dir.type !== "dir") {
          setHistory(prev => [...prev, { type: "error", text: `tree: ${targetPath}: No such directory` }]);
        } else {
          const buildTree = (node, prefix = "") => {
            let result = [];
            const children = Object.entries(node.children || {}).filter(([name]) => !name.startsWith("."));
            children.forEach(([name, child], idx) => {
              const isLastChild = idx === children.length - 1;
              const connector = isLastChild ? "└── " : "├── ";
              const isDir = child.type === "dir";
              result.push(`${prefix}${connector}${isDir ? `${name}/` : name}`);
              if (isDir) {
                const newPrefix = prefix + (isLastChild ? "    " : "│   ");
                result = result.concat(buildTree(child, newPrefix));
              }
            });
            return result;
          };
          const tree = buildTree(dir);
          setHistory(prev => [...prev, { type: "tree", text: `${resolved}\n${tree.join("\n")}\n\n${tree.length} directories/files` }]);
        }
        break;
      }

      case "find":
        if (!args[0]) {
          setHistory(prev => [...prev, { type: "error", text: "find: missing argument" }]);
        } else {
          const pattern = args[0].toLowerCase();
          const results = [];
          const search = (node, path) => {
            Object.entries(node.children || {}).forEach(([name, child]) => {
              const fullPath = `${path}/${name}`;
              if (name.toLowerCase().includes(pattern)) results.push(fullPath);
              if (child.type === "dir") search(child, fullPath);
            });
          };
          search(fileSystem["~"], "~");
          setHistory(prev => [...prev, { type: "output", text: results.length ? results.join("\n") : `No files matching '${args[0]}'` }]);
        }
        break;

      case "open":
        if (args[0] === "resume.pdf" || args[0] === "~/resume.pdf") {
          setHistory(prev => [...prev, { type: "system", text: "Opening resume.pdf..." }]);
          window.open("/resume.pdf", "_blank");
        } else {
          setHistory(prev => [...prev, { type: "output", text: `open: ${args[0] || "missing argument"}` }]);
        }
        break;

      case "banner":
        setHistory(prev => [...prev, { type: "ascii", text: asciiArt }]);
        break;

      case "about":
        setHistory(prev => [...prev, { type: "output", text: `
  ALI YOUNES
  ─────────────────────────────────────────────
  Software Engineer — Boston → Seattle

  CS & Political Science · Northeastern University · Class of '27

  now       SDE Intern @ AWS CloudFormation · Infrastructure as Code · Seattle, WA
  prev      SWE Co-op @ Philips · Cambridge, MA · Jan–Jun '26

  I architect distributed, high-stakes systems and
  build the tools that keep them running.

  → try:  skills   experience   projects   contact
` }]);
        break;

      case "skills":
        setHistory(prev => [...prev, { type: "output", text: `
  TECHNICAL SKILLS
  ═══════════════════════════════════════════════════

  LANGUAGES
    TypeScript / JavaScript   ████████████████████  expert
    C++                       ████████████████░░░░  advanced
    C# / .NET                 ██████████████░░░░░░  proficient
    Python                    ████████████░░░░░░░░  proficient
    Rust                      ████████████░░░░░░░░  proficient
    Swift / SwiftUI           ██████████░░░░░░░░░░  intermediate
    Go                        ████████░░░░░░░░░░░░  learning

  FRONTEND        React · TypeScript · Tailwind · Framer Motion · Next.js
  BACKEND         Node.js · Express · MongoDB · .NET · PowerShell
  SYSTEMS         Rust · C++ · DXGI · Metal · VideoToolbox · H.264
  CLOUD & INFRA   AWS · Linux · DevOps · IaC (CDK/CloudFormation) · CI/CD
  TOOLS           Git · Docker · Vim · VS Code · Xcode
` }]);
        break;

      case "experience":
        setHistory(prev => [...prev, { type: "output", text: `
  WORK EXPERIENCE
  ═══════════════════════════════════════════════════

  ┌─ AWS — CloudFormation · Infrastructure as Code ─────
  │  SDE Intern · Current
  │  Jun 2026 — Present · Seattle, WA
  │
  │  • Infrastructure as version-controlled CloudFormation
  │  • Repeatable, auditable, declarative deployments
  │  • Service-level project under Principal/Senior SDE mentor
  └──────────────────────────────────────────────────────

  ┌─ PHILIPS ────────────────────────────────────────────
  │  SWE Co-op · System Integration and Automation
  │  Jan 2026 — Jun 2026 · Cambridge, MA
  │
  │  • VM automation at scale · PicIX deployment pipelines
  │  • C# · .NET · PowerShell · DevOps
  └──────────────────────────────────────────────────────

  ┌─ TOP CHOICE REALTY ──────────────────────────────────
  │  Frontend Developer Intern
  │  Apr — Aug 2024 · New York, NY
  │
  │  • Full-stack app (React · Python · SQL)
  │  • 85% faster lookups · 3x query speed · 800+ records
  └──────────────────────────────────────────────────────

  → cat ~/experience/aws.md  ·  cat ~/experience/philips.md
` }]);
        break;

      case "education":
        setHistory(prev => [...prev, { type: "output", text: `
  EDUCATION
  ═══════════════════════════════════════════════════

  Northeastern University · Boston, MA
  B.S. Computer Science & Political Science
  2023 — 2027 (expected)

  Coursework
    Data Structures & Algorithms · Object-Oriented Design
    Systems Programming (C++) · Database Management
    Software Engineering · Discrete Structures

  Co-op Program: 3 work experiences integrated into degree
` }]);
        break;

      case "projects":
        setHistory(prev => [...prev, { type: "output", text: `
  FEATURED PROJECTS
  ═══════════════════════════════════════════════════

  01  ETERNAL MONITOR
      iPad as a wireless second display — Rust host + SwiftUI client
      Rust · SwiftUI · DXGI · H.264 · VideoToolbox · Metal · UDP
      → eternalmonitor.dev  ·  github.com/whoisaldo/EternalMonitor

  02  EXERLY FITNESS
      Web live · native SwiftUI iOS built, awaiting the App Store
      React 19 · SwiftUI · Node · Express 5 · MongoDB · Gemini · JWT
      → exerlyfitness.com  ·  github.com/whoisaldo/Exerly-Fitness

  03  ETERNALEXCHANGE
      Equivalent-exchange alchemy for Fabric 1.21.1 — ProjectE spin-off
      Java 21 · Fabric · Mixin · Gradle/Loom  ·  39,399 LOC
      → eternalexchangemod.com  ·  github.com/whoisaldo/EternalExchange

  04  MOOPS BOOKSTORE
      Social reading tracker — shelves, reviews, clubs, streaks
      React · TypeScript · Node · MongoDB · Google Books API
      → moopsbooks.com  (source private)

  05  ETERNAL RICH PRESENCE
      Windows tray bridge — Apple Music & Spotify → Discord RPC
      Python 3.9+ · pypresence · spotipy · WinRT · PyInstaller
      → eternalrichpresence.dev  ·  github.com/whoisaldo/Eternal-Rich-Presence

  06  SIGNATURE CUTS 413
      Production barbershop site (Chicopee, MA)
      Next.js 14 · TypeScript · Tailwind · Framer Motion · SSG
      → signaturecutschicopee.com

  07  REAL-TIME FACE ANALYTICS
      Client-side facial recognition & emotion detection
      React · TensorFlow.js · face-api.js
      → github.com/whoisaldo/real-time-face-analytics

  Run 'cd ~/projects && ls' to explore project directories
` }]);
        break;

      case "contact":
        setHistory(prev => [...prev, { type: "output", text: `
  CONTACT
  ═══════════════════════════════════════════════════

  email      younes.al@northeastern.edu
  personal   whois.younes@gmail.com
  business   Aliyounes@eternalreverse.com
  location   Boston, MA → Seattle, WA (Summer '26)

  github     github.com/whoisaldo
  linkedin   linkedin.com/in/alialdoyounes

  status     open to opportunities

  → cat ~/contact.json  for structured data
` }]);
        break;

      case "resume":
        setHistory(prev => [...prev, { type: "system", text: "Opening resume..." }]);
        window.open("/resume.pdf", "_blank");
        break;

      case "socials":
        setHistory(prev => [...prev, { type: "output", text: `
  SOCIAL LINKS
  ═══════════════════════════════════════════════════

  github     github.com/whoisaldo
  linkedin   linkedin.com/in/alialdoyounes

  → type 'hire' to discuss opportunities
` }]);
        break;

      case "neofetch":
        setHistory(prev => [...prev, { type: "output", text: `
         /\\         younes@eternalreverse
        /  \\        ─────────────────────
       /\\   \\       OS:        React 18.x
      /  ..  \\      Host:      Northeastern University
     /  .''.  \\     Kernel:    Node.js 20.x
    /.''    '.\\    Shell:     TypeScript 5.x
                    Terminal:  portfolio · edition iv
                    CPU:       coffee-powered
                    Memory:    unlimited ambition
                    Uptime:    999 days
` }]);
        break;

      case "git":
        if (args[0] === "status") {
          setHistory(prev => [...prev, { type: "output", text: `On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean` }]);
        } else if (args[0] === "log") {
          setHistory(prev => [...prev, { type: "output", text: `commit abc1234 (HEAD -> main, origin/main)\nAuthor: Ali Younes <younes.al@northeastern.edu>\nDate:   ${new Date().toDateString()}\n\n    portfolio: editorial redesign + AWS CloudFormation current` }]);
        } else {
          setHistory(prev => [...prev, { type: "output", text: `git: '${args[0] || ""}' is not a git command. Try 'git status' or 'git log'` }]);
        }
        break;

      case "vim":
      case "nano":
        setHistory(prev => [...prev, { type: "system", text: `${command}: web terminal — use 'cat <file>' to view contents.` }]);
        break;

      case "sudo":
        if (args.join(" ").includes("rm -rf")) {
          setHistory(prev => [...prev, { type: "error", text: "Nice try. System protected." }]);
        } else if (args[0] === "hire") {
          setHistory(prev => [...prev, { type: "system", text: "SUDO HIRE ACTIVATED\n\nemail:    younes.al@northeastern.edu\nbusiness: Aliyounes@eternalreverse.com\n\nlet's talk." }]);
        } else {
          setHistory(prev => [...prev, { type: "output", text: "younes is not in the sudoers file. This incident will be reported." }]);
        }
        break;

      case "hire":
        setHistory(prev => [...prev, { type: "success", text: `
  HIRE
  ═══════════════════════════════════════════════════

  Actively open to opportunities.

  email      younes.al@northeastern.edu
  business   Aliyounes@eternalreverse.com

  pro tip    try 'sudo hire' for VIP access
` }]);
        break;

      case "exit":
        setHistory(prev => [...prev, { type: "system", text: "logout\nConnection to eternalreverse closed.\n\n(scroll to continue)" }]);
        break;

      case "touch":
      case "mkdir":
      case "rm":
      case "cp":
      case "mv":
        setHistory(prev => [...prev, { type: "error", text: `${command}: Permission denied (read-only filesystem)` }]);
        break;

      case "head":
      case "tail": {
        if (!args[0]) {
          setHistory(prev => [...prev, { type: "error", text: `${command}: missing file operand` }]);
        } else {
          const resolved = resolvePath(currentDir, args[0]);
          const file = getDir(resolved);
          if (!file || file.type !== "file") {
            setHistory(prev => [...prev, { type: "error", text: `${command}: ${args[0]}: No such file` }]);
          } else {
            const lines = file.content.split("\n");
            const n = parseInt(args[1]) || 10;
            const output = command === "head" ? lines.slice(0, n) : lines.slice(-n);
            setHistory(prev => [...prev, { type: "file", text: output.join("\n") }]);
          }
        }
        break;
      }

      case "grep":
        if (args.length < 2) {
          setHistory(prev => [...prev, { type: "error", text: "Usage: grep <pattern> <file>" }]);
        } else {
          const pattern = args[0];
          const resolved = resolvePath(currentDir, args[1]);
          const file = getDir(resolved);
          if (!file || file.type !== "file") {
            setHistory(prev => [...prev, { type: "error", text: `grep: ${args[1]}: No such file` }]);
          } else {
            const matches = file.content.split("\n").filter(line =>
              line.toLowerCase().includes(pattern.toLowerCase())
            );
            setHistory(prev => [...prev, {
              type: "output",
              text: matches.length ? matches.join("\n") : `No matches for '${pattern}'`
            }]);
          }
        }
        break;

      default:
        setHistory(prev => [...prev, {
          type: "error",
          text: `zsh: command not found: ${command}\n\nType 'help' for the full command list.\nQuick start: about · experience · projects`
        }]);
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (isMaximized) setIsMaximized(false);
        setSuggestions([]);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMaximized]);

  useEffect(() => {
    if (input.length > 0) {
      const matches = allCommands.filter(c => c.startsWith(input.toLowerCase())).slice(0, 6);
      setSuggestions(matches);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
    }
  }, [input, allCommands]);

  const focusInput = () => inputRef.current?.focus();

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedSuggestion(prev => Math.max(0, prev - 1));
      } else if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedSuggestion(prev => Math.min(suggestions.length - 1, prev + 1));
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setInput(suggestions[selectedSuggestion]);
        setSuggestions([]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  // Prompt — younes@eternalreverse ~ %
  const renderPrompt = (path) => (
    <span className="select-none font-mono">
      <span className="text-signal font-semibold">younes</span>
      <span className="text-bone/30">@</span>
      <span className="text-bone">eternalreverse</span>
      <span className="text-bone/30"> </span>
      <span className="text-bone/60">{path}</span>
      <span className="text-signal"> %</span>
    </span>
  );

  return (
    <section id="terminal" className="relative py-20 md:py-28 px-6 bg-ink grain border-y border-bone/10">
      <div className={`mx-auto transition-all duration-300 ${isMaximized ? 'max-w-none' : 'max-w-5xl'}`}>
        {/* Editorial header — Roman-numeral kicker */}
        {!isMaximized && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="mb-10 flex items-baseline justify-between gap-4 border-b border-hud/15 pb-6"
          >
            <div className="flex items-baseline gap-6">
              <span className="font-display italic text-hud text-3xl lg:text-4xl leading-none">IV.</span>
              <div>
                <p className="font-mono text-[10px] tracking-editorial text-hud/70 uppercase mb-2">// direct_console</p>
                <h2 className="serif-display italic text-3xl md:text-5xl text-bone">a real shell.</h2>
              </div>
            </div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45 hidden sm:block text-right">
              <div>zsh · interactive</div>
              <div className="text-hud/70 mt-1">try: funfact · interests</div>
            </div>
          </motion.div>
        )}

        {/* Terminal frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
          className={`crt-curve bracket-frame border border-hud/20 bg-ink transition-all duration-300 ${
            isMaximized ? 'fixed inset-4 z-50' : ''
          }`}
          onClick={focusInput}
        >
          <span aria-hidden className="bracket-corner tl" />
          <span aria-hidden className="bracket-corner tr" />
          <span aria-hidden className="bracket-corner bl" />
          <span aria-hidden className="bracket-corner br" />
          {/* Title bar */}
          <div className="relative flex items-center justify-between px-4 py-2.5 bg-smoke border-b border-bone/10">
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all"
                title="Minimize"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all"
                title="Minimize"
              />
              <button
                onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); setIsMinimized(false); }}
                className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all"
                title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
              />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <TerminalIcon className="w-3.5 h-3.5 text-bone/50" />
              <span className="text-[11px] text-bone/60 font-mono uppercase tracking-[0.18em]">younes@eternalreverse — {currentDir}</span>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-bone/50 font-mono">
              <div className="flex items-center gap-1"><Wifi className="w-3 h-3" /></div>
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3" /><span>100%</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Terminal content */}
          <div
            ref={terminalRef}
            className={`p-4 font-mono text-[13px] leading-relaxed overflow-auto cursor-text transition-all duration-300 ${
              isMinimized ? 'h-0 p-0' : isMaximized ? 'h-[calc(100vh-120px)]' : 'h-[340px] sm:h-[420px] md:h-[500px]'
            }`}
          >
            {history.map((line, i) => (
              <div key={i} className="mb-1">
                {line.type === "prompt" && (
                  <div className="flex items-start gap-2 flex-wrap">
                    {renderPrompt(line.path)}
                    <span className="text-bone ml-2">{line.text}</span>
                  </div>
                )}
                {line.type === "output" && (
                  <pre className="text-bone/75 whitespace-pre-wrap pl-0 my-1 font-mono">{line.text}</pre>
                )}
                {line.type === "file" && (
                  <pre className="text-bone/90 whitespace-pre-wrap my-1 pl-0 font-mono">{line.text}</pre>
                )}
                {line.type === "html" && (
                  <pre className="my-1 font-mono" dangerouslySetInnerHTML={{ __html: line.text }} />
                )}
                {line.type === "tree" && (
                  <pre className="text-bone/75 whitespace-pre-wrap my-1 font-mono">{line.text}</pre>
                )}
                {line.type === "error" && (
                  <pre className="text-signal whitespace-pre-wrap my-1 font-mono">{line.text}</pre>
                )}
                {line.type === "system" && (
                  <pre className="text-ember whitespace-pre-wrap my-1 font-mono">{line.text}</pre>
                )}
                {line.type === "success" && (
                  <pre className="text-signal whitespace-pre-wrap my-1 font-mono">{line.text}</pre>
                )}
                {line.type === "ascii" && (
                  <pre className="text-[7px] md:text-[9px] leading-none text-signal font-bold my-2">{line.text}</pre>
                )}
              </div>
            ))}

            {/* Input line */}
            <div className="flex items-center gap-2 relative">
              {renderPrompt(currentDir)}
              <div className="relative flex-1 ml-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Terminal command input"
                  className="w-full bg-transparent text-bone outline-none font-mono"
                  style={{ caretColor: '#a855f7' }}
                  autoComplete="off"
                  spellCheck="false"
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 top-6 bg-smoke border border-bone/20 overflow-hidden shadow-xl z-10 min-w-[180px]">
                    {suggestions.map((s, i) => (
                      <div
                        key={s}
                        className={`px-3 py-1.5 text-xs cursor-pointer transition-colors font-mono uppercase tracking-[0.14em] ${
                          i === selectedSuggestion ? 'bg-signal/20 text-signal' : 'text-bone/60 hover:bg-bone/5'
                        }`}
                        onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus(); }}
                      >
                        {s}
                      </div>
                    ))}
                    <div className="px-3 py-1 text-[10px] text-bone/40 border-t border-bone/10 font-mono uppercase tracking-[0.14em]">
                      Tab to complete
                    </div>
                  </div>
                )}
              </div>
              <span className="animate-pulse text-signal">▊</span>
            </div>
          </div>

          {/* Status bar */}
          <div className={`px-4 py-1.5 bg-smoke border-t border-bone/10 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] transition-all ${isMinimized ? 'hidden' : ''}`}>
            <div className="flex items-center gap-4 text-bone/50">
              <span>zsh</span>
              <span>utf-8</span>
              <span>{history.filter(h => h.type === "prompt").length} cmds</span>
            </div>
            <div className="flex items-center gap-3 text-bone/40">
              <span>↑↓ history</span>
              <span>Tab complete</span>
              <span>Ctrl+L clear</span>
            </div>
          </div>
        </motion.div>

        {/* Fullscreen backdrop */}
        {isMaximized && (
          <div className="fixed inset-0 bg-ink/90 z-40" onClick={() => setIsMaximized(false)} />
        )}

        {/* Hint chips — hard edges, mono */}
        {!isMaximized && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label text-bone/50 mr-2">try:</span>
              {["help", "about", "skills", "experience", "projects", "resume", "contact"].map(c => (
                <button
                  key={c}
                  onClick={() => { executeCommand(c); setInput(""); }}
                  className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-bone/70
                             border border-bone/20 hover:border-signal hover:text-signal
                             hover:bg-signal/5 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
