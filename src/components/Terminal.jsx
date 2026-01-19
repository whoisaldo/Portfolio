// src/components/Terminal.jsx - Advanced Interactive Terminal
import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon, Cpu, Wifi, Battery, Clock } from "lucide-react";

// Virtual file system
const fileSystem = {
  "~": {
    type: "dir",
    children: {
      "about.txt": { type: "file", content: `Ali Younes - Full-Stack Developer\n\nCS student at Northeastern University.\nCurrently working at Philips on Systems Integration.\nPassionate about building clean, performant software.\n\nType 'cat skills.md' to see my technical abilities.` },
      "skills.md": { type: "file", content: `# Technical Skills\n\n## Languages\n- JavaScript/TypeScript ████████████████████ Expert\n- C++                  ████████████████░░░░ Advanced  \n- Java                 ██████████████░░░░░░ Proficient\n- Python               ████████████░░░░░░░░ Proficient\n- Lua                  ████████████████░░░░ Advanced\n\n## Frontend\nReact, Tailwind CSS, Framer Motion, HTML5, CSS3\n\n## Backend\nNode.js, Express, MongoDB, REST APIs, JWT` },
      "contact.json": { type: "file", content: `{\n  "email": "younes.al@northeastern.edu",\n  "phone": "(413) 409-9563",\n  "location": "Boston, MA",\n  "github": "github.com/whoisaldo",\n  "linkedin": "linkedin.com/in/ali-younes-41a2b4296",\n  "status": "Open to opportunities!"\n}` },
      "resume.pdf": { type: "file", content: `[Binary file - use 'open resume.pdf' to download]` },
      ".bashrc": { type: "file", content: `# Ali's bashrc\nexport PS1="\\u@portfolio:\\w$ "\nalias ll="ls -la"\nalias cls="clear"\necho "Welcome back, Ali!"` },
      ".gitconfig": { type: "file", content: `[user]\n  name = Ali Younes\n  email = younes.al@northeastern.edu\n[core]\n  editor = vim` },
      "projects": {
        type: "dir",
        children: {
          "moops-bookstore": { type: "dir", children: { 
            "README.md": { type: "file", content: `# Moops Bookstore\nFull-stack social book tracking platform\n\nTech: React, TypeScript, Node.js, MongoDB\nRepo: github.com/whoisaldo/MoopBookstore` }
          }},
          "exerly-fitness": { type: "dir", children: {
            "README.md": { type: "file", content: `# Exerly Fitness\nComprehensive fitness tracking platform\n\nTech: React, Node.js, MongoDB, JWT Auth\nRepo: github.com/whoisaldo/Exerly-Fitness` }
          }},
          "fade-empire": { type: "dir", children: {
            "README.md": { type: "file", content: `# Fade Empire Barbershop\nModern barbershop website\n\nTech: HTML5, CSS3, JavaScript\nLive: chicopeefadeempire.com` }
          }},
          "face-analytics": { type: "dir", children: {
            "README.md": { type: "file", content: `# Real-Time Face Analytics\nAI-powered facial recognition & emotion detection\n\nTech: React, TensorFlow.js, face-api.js\nRepo: github.com/whoisaldo/real-time-face-analytics` }
          }},
        }
      },
      "experience": {
        type: "dir",
        children: {
          "philips.md": { type: "file", content: `# Philips - Software Engineering Co-op\nSystem Integration | 2025 - Present | Cambridge, MA\n\n- PicIX platform development & enterprise imaging\n- Performance testing & optimization\n- Server automation (100s of computers)\n- Healthcare IT systems impact` },
          "topchoice.md": { type: "file", content: `# Top Choice Realty - Frontend Developer Intern\nApr 2024 - Aug 2024 | New York, NY\n\n- Built full-stack app (React, Python, SQL)\n- 85% faster lookups, 3x query speed\n- Managed 800+ client records\n- Saved team 15+ hours/week` },
          "defalco.md": { type: "file", content: `# Robert DeFalco Realty - Computer Technician\nJun 2023 - Sep 2023 | New York, NY\n\n- On-site support across 3+ offices\n- Configured 15+ systems (Win/Mac/Linux)\n- Maintained 95%+ system uptime` },
        }
      }
    }
  }
};

// Get directory contents
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

// Resolve path
const resolvePath = (currentPath, targetPath) => {
  if (targetPath.startsWith("~")) return targetPath;
  if (targetPath.startsWith("/")) return "~" + targetPath;
  
  let parts = currentPath.split("/").filter(Boolean);
  const targetParts = targetPath.split("/");
  
  for (const part of targetParts) {
    if (part === "..") {
      if (parts.length > 1 || (parts.length === 1 && parts[0] !== "~")) {
        parts.pop();
      }
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

  const [history, setHistory] = useState([
    { type: "ascii", text: asciiArt },
    { type: "system", text: "Portfolio Terminal v2.0 — Welcome!" },
    { type: "system", text: `Last login: ${new Date().toLocaleString()} on ttys000\n` },
    { type: "output", text: `
╔══════════════════════════════════════════════════════════════╗
║           🚀 QUICK START - Try these commands:              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📋 help          - Show all available commands             ║
║  👤 about         - Learn about me                          ║
║  💼 experience    - View work history                       ║
║  🚀 projects      - See featured projects                   ║
║  📄 resume        - Download my resume                       ║
║  📧 contact       - Get contact information                 ║
║  💻 skills        - Technical skills breakdown              ║
║  📁 ls            - List files in current directory         ║
║                                                              ║
║  💡 Tip: Type 'help' for the full command list              ║
║  💡 Tip: Use Tab for autocomplete, ↑↓ for history           ║
╚══════════════════════════════════════════════════════════════╝
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // All available commands
  const allCommands = useMemo(() => [
    "help", "man", "clear", "ls", "cd", "cat", "pwd", "whoami", "hostname",
    "date", "uptime", "echo", "history", "banner", "about", "skills",
    "experience", "education", "projects", "contact", "resume", "socials",
    "neofetch", "tree", "grep", "find", "open", "sudo", "exit", "hire",
    "git", "vim", "nano", "touch", "mkdir", "rm", "cp", "mv", "head", "tail"
  ], []);

  // Handle command execution
  const executeCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const [command, ...args] = trimmed.split(/\s+/);
    const lowerCmd = command.toLowerCase();
    
    setHistory(prev => [...prev, { type: "prompt", path: currentDir, text: trimmed }]);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setSuggestions([]);

    // Command handlers
    switch (lowerCmd) {
      case "help":
        setHistory(prev => [...prev, { type: "output", text: `
╔══════════════════════════════════════════════════════════════╗
║              📚 AVAILABLE COMMANDS - Portfolio Terminal      ║
╚══════════════════════════════════════════════════════════════╝

  ═══════════════════════════════════════════════════════════
  🎯 QUICK START (Most Popular)
  ═══════════════════════════════════════════════════════════
  help            Show this help menu
  about           Learn about me
  skills          Technical skills breakdown
  experience      Work history & internships
  projects        Featured projects with links
  contact         Contact information (email, phone)
  resume          Download my resume (PDF)
  hire            Want to hire me? Get in touch!

  ═══════════════════════════════════════════════════════════
  📁 Navigation & Files
  ═══════════════════════════════════════════════════════════
  ls [path]       List directory contents
                  Examples: ls, ls projects, ls -a (show hidden)
  cd <dir>        Change directory
                  Examples: cd projects, cd ~, cd ..
  pwd             Show current directory
  cat <file>      Display file contents
                  Examples: cat about.txt, cat skills.md
  tree [path]     Show directory tree structure
  find <name>     Search for files by name
  open resume.pdf Download resume PDF

  ═══════════════════════════════════════════════════════════
  ℹ️  Information Commands
  ═══════════════════════════════════════════════════════════
  about           Personal introduction
  skills          Technical skills with proficiency levels
  experience      Work experience details
  education       Academic background
  projects        Featured projects with GitHub links
  contact         Email, phone, location
  socials         GitHub, LinkedIn links
  resume          Download resume

  ═══════════════════════════════════════════════════════════
  🖥️  System Commands
  ═══════════════════════════════════════════════════════════
  whoami          Current user
  hostname        System hostname
  date            Current date/time
  uptime          System uptime
  neofetch        System information display
  history         Show command history
  clear           Clear terminal screen
  banner          Show ASCII art banner

  ═══════════════════════════════════════════════════════════
  🎮 Fun Commands
  ═══════════════════════════════════════════════════════════
  sudo hire       VIP hiring access 😄
  git status      Git repository status
  git log         Recent commits
  vim/nano        Text editor (simulated)

  ═══════════════════════════════════════════════════════════
  ⌨️  Keyboard Shortcuts
  ═══════════════════════════════════════════════════════════
  Tab             Auto-complete commands
  ↑ / ↓           Navigate command history
  Ctrl+L          Clear terminal
  Enter           Execute command

  💡 TIP: Start with 'about', 'skills', or 'experience' to learn more!
  💡 TIP: Type 'ls' to see available files, then 'cat <filename>' to read them
` }]);
        break;

      case "man":
        if (!args[0]) {
          setHistory(prev => [...prev, { type: "output", text: "What manual page do you want?\nUsage: man <command>" }]);
        } else {
          setHistory(prev => [...prev, { type: "output", text: `
${args[0].toUpperCase()}(1)                   User Commands                   ${args[0].toUpperCase()}(1)

NAME
       ${args[0]} - ${args[0] === "ls" ? "list directory contents" : 
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
              const date = "Jan 19 12:00";
              const colorClass = isDir ? "text-blue-400" : name.endsWith(".md") ? "text-yellow-400" : "text-neutral-300";
              return `${perms}  1 ali  staff  ${size}  ${date}  <span class="${colorClass}">${name}${isDir ? "/" : ""}</span>`;
            }).join("\n");
            setHistory(prev => [...prev, { type: "html", text: `total ${items.length * 8}\n${output}` }]);
          } else {
            const output = items.map(name => {
              const item = dir.children[name];
              const isDir = item.type === "dir";
              return isDir ? `<span class="text-blue-400 font-bold">${name}/</span>` : 
                     name.endsWith(".md") ? `<span class="text-yellow-400">${name}</span>` :
                     name.endsWith(".json") ? `<span class="text-green-400">${name}</span>` :
                     `<span class="text-neutral-300">${name}</span>`;
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
        setHistory(prev => [...prev, { type: "output", text: "ali" }]);
        break;

      case "hostname":
        setHistory(prev => [...prev, { type: "output", text: "portfolio.local" }]);
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
          const buildTree = (node, prefix = "", isLast = true) => {
            let result = [];
            const children = Object.entries(node.children || {}).filter(([name]) => !name.startsWith("."));
            children.forEach(([name, child], idx) => {
              const isLastChild = idx === children.length - 1;
              const connector = isLastChild ? "└── " : "├── ";
              const isDir = child.type === "dir";
              result.push(`${prefix}${connector}${isDir ? `\x1b[34m${name}/\x1b[0m` : name}`);
              if (isDir) {
                const newPrefix = prefix + (isLastChild ? "    " : "│   ");
                result = result.concat(buildTree(child, newPrefix, isLastChild));
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
          setHistory(prev => [...prev, { type: "system", text: "Opening resume.pdf... (Check your downloads)" }]);
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
┌─────────────────────────────────────────────────────────────┐
│                       ALI YOUNES                            │
│                  Full-Stack Developer                       │
└─────────────────────────────────────────────────────────────┘

  👋 Hey! I'm Ali, a Computer Science student at 
     Northeastern University with a passion for 
     building clean, performant software.

  💼 Currently: Systems Integration Engineering @ Philips

  🎯 I love solving complex problems and shipping
     products that make a difference.

  🎮 Fun fact: I also do game development in Lua!

  → Type 'cat ~/skills.md' or 'skills' to see my abilities
` }]);
        break;

      case "skills":
        setHistory(prev => [...prev, { type: "output", text: `
📊 TECHNICAL SKILLS
════════════════════════════════════════════════════════════

 LANGUAGES                           PROFICIENCY
 ─────────────────────────────────────────────────────────
 JavaScript/TypeScript    ████████████████████  Expert
 C++                      ████████████████░░░░  Advanced
 Java                     ██████████████░░░░░░  Proficient
 Python                   ████████████░░░░░░░░  Proficient
 Lua                      ████████████████░░░░  Advanced
 Swift                    ██████████░░░░░░░░░░  Intermediate

 FRONTEND          React • Tailwind CSS • Framer Motion • HTML5/CSS3
 BACKEND           Node.js • Express • MongoDB • REST APIs • JWT
 TOOLS             Git • Linux • GDB • Docker • VS Code • Vercel
` }]);
        break;

      case "experience":
        setHistory(prev => [...prev, { type: "output", text: `
💼 WORK EXPERIENCE
════════════════════════════════════════════════════════════

┌─ PHILIPS ──────────────────────────────────────────────────
│  Software Engineering Co-op (System Integration)
│  📅 2025 - Present  │  📍 Cambridge, MA
│
│  • PicIX platform development & enterprise imaging
│  • Performance testing & optimization at scale
│  • Server automation affecting 100s of computers
│  • Healthcare IT systems with global impact
└────────────────────────────────────────────────────────────

┌─ TOP CHOICE REALTY ────────────────────────────────────────
│  Frontend Developer Intern
│  📅 Apr - Aug 2024  │  📍 New York, NY
│
│  • Built full-stack app (React, Python, SQL)
│  • Achieved 85% faster lookups, 3x query speed
│  • Managed 800+ client records
│  • Saved team 15+ hours/week
└────────────────────────────────────────────────────────────

→ Run 'cat ~/experience/philips.md' for full details
` }]);
        break;

      case "education":
        setHistory(prev => [...prev, { type: "output", text: `
🎓 EDUCATION
════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────┐
  │  NORTHEASTERN UNIVERSITY                            │
  │  B.S. Computer Science & Engineering                │
  │  📅 2023 - 2027 (Expected)  │  📍 Boston, MA        │
  └─────────────────────────────────────────────────────┘

  Relevant Coursework:
  • Data Structures & Algorithms
  • Object-Oriented Design  
  • Systems Programming (C++)
  • Database Management
  • Software Engineering

  Co-op Program: 3 work experiences integrated into degree
` }]);
        break;

      case "projects":
        setHistory(prev => [...prev, { type: "output", text: `
🚀 FEATURED PROJECTS
════════════════════════════════════════════════════════════

  📚 MOOPS BOOKSTORE
     Full-stack social book tracking platform
     Tech: React, TypeScript, Node.js, MongoDB
     → github.com/whoisaldo/MoopBookstore

  💪 EXERLY FITNESS
     Comprehensive fitness tracking platform
     Tech: React, Node.js, MongoDB, JWT
     → github.com/whoisaldo/Exerly-Fitness

  🧠 FACE ANALYTICS
     AI-powered real-time facial recognition
     Tech: React, TensorFlow.js, face-api.js
     → github.com/whoisaldo/real-time-face-analytics

  ✂️  FADE EMPIRE
     Modern barbershop website
     Tech: HTML5, CSS3, JavaScript
     → chicopeefadeempire.com

Run 'cd ~/projects && ls' to explore project directories
` }]);
        break;

      case "contact":
        setHistory(prev => [...prev, { type: "output", text: `
📬 CONTACT
════════════════════════════════════════════════════════════

  📧 Email:     younes.al@northeastern.edu
  📧 Personal:  whois.younes@gmail.com
  📱 Phone:     (413) 409-9563
  📍 Location:  Boston, MA

  💼 Status:    Open to opportunities!

→ Run 'cat ~/contact.json' for structured data
` }]);
        break;

      case "resume":
        setHistory(prev => [...prev, { type: "system", text: "Opening resume..." }]);
        window.open("/resume.pdf", "_blank");
        break;

      case "socials":
        setHistory(prev => [...prev, { type: "output", text: `
🌐 SOCIAL LINKS
════════════════════════════════════════════════════════════

  🐙 GitHub:    github.com/whoisaldo
  💼 LinkedIn:  linkedin.com/in/ali-younes-41a2b4296

→ Type 'hire' to discuss opportunities!
` }]);
        break;

      case "neofetch":
        setHistory(prev => [...prev, { type: "neofetch", text: `
        \x1b[35m/\\         \x1b[0mali@portfolio
       \x1b[35m/  \\        \x1b[0m─────────────────────
      \x1b[35m/\\   \\       \x1b[33mOS:\x1b[0m React 18.x
     \x1b[35m/  ..  \\      \x1b[33mHost:\x1b[0m Northeastern University
    \x1b[35m/  .'''.\\     \x1b[33mKernel:\x1b[0m Node.js 20.x
   \x1b[35m/.''     '.\\   \x1b[33mShell:\x1b[0m TypeScript 5.x
                    \x1b[33mTerminal:\x1b[0m Portfolio v2.0
                    \x1b[33mCPU:\x1b[0m Coffee-Powered™
                    \x1b[33mMemory:\x1b[0m Unlimited Ambition
                    \x1b[33mUptime:\x1b[0m 999 days
` }]);
        break;

      case "git":
        if (args[0] === "status") {
          setHistory(prev => [...prev, { type: "output", text: `On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean` }]);
        } else if (args[0] === "log") {
          setHistory(prev => [...prev, { type: "output", text: `commit abc1234 (HEAD -> main, origin/main)
Author: Ali Younes <younes.al@northeastern.edu>
Date:   ${new Date().toDateString()}

    Updated portfolio with new projects` }]);
        } else {
          setHistory(prev => [...prev, { type: "output", text: `git: '${args[0] || ""}' is not a git command. Try 'git status' or 'git log'` }]);
        }
        break;

      case "vim":
      case "nano":
        setHistory(prev => [...prev, { type: "system", text: `${command}: This is a web terminal, but nice try! 😄\nUse 'cat <file>' to view file contents.` }]);
        break;

      case "sudo":
        if (args.join(" ").includes("rm -rf")) {
          setHistory(prev => [...prev, { type: "error", text: "Nice try! 🛡️ System protected." }]);
        } else if (args[0] === "hire") {
          setHistory(prev => [...prev, { type: "system", text: "🎉 SUDO HIRE ACTIVATED!\n\nEmail: younes.al@northeastern.edu\nPhone: (413) 409-9563\n\nLet's talk!" }]);
        } else {
          setHistory(prev => [...prev, { type: "output", text: "ali is not in the sudoers file. This incident will be reported. 😄" }]);
        }
        break;

      case "hire":
        setHistory(prev => [...prev, { type: "success", text: `
🎉 GREAT DECISION!
════════════════════════════════════════════════════════════

  I'm actively looking for opportunities!

  📧 Email:  younes.al@northeastern.edu
  📱 Phone:  (413) 409-9563

  Let's build something amazing together! 🚀

  Pro tip: Try 'sudo hire' for VIP access 😄
` }]);
        break;

      case "exit":
        setHistory(prev => [...prev, { type: "system", text: "logout\nConnection to portfolio.local closed.\n\n(Scroll down to continue exploring! 👋)" }]);
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
              text: matches.length ? matches.map(m => m.replace(new RegExp(`(${pattern})`, 'gi'), '\x1b[31m$1\x1b[0m')).join("\n") : `No matches for '${pattern}'`
            }]);
          }
        }
        break;

      default:
        setHistory(prev => [...prev, { 
          type: "error", 
          text: `zsh: command not found: ${command}\n\n💡 Type 'help' to see all available commands.\n💡 Quick start: Try 'about', 'skills', 'experience', or 'projects'`
        }]);
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // ESC to exit fullscreen
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

  // Update suggestions
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

  // Render prompt
  const renderPrompt = (path) => (
    <span className="select-none">
      <span className="text-green-400 font-semibold">ali</span>
      <span className="text-neutral-500">@</span>
      <span className="text-purple-400">portfolio</span>
      <span className="text-neutral-500">:</span>
      <span className="text-blue-400">{path}</span>
      <span className="text-neutral-500">$</span>
    </span>
  );

  return (
    <section id="terminal" className="relative py-24 px-6 bg-[#0a0a0f]">
      <div className={`mx-auto transition-all duration-300 ${isMaximized ? 'max-w-none' : 'max-w-4xl'}`}>
        {/* Header */}
        {!isMaximized && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-5">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-400">Interactive Shell</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent mb-3">
              Terminal
            </h2>
            <p className="text-neutral-500">A fully interactive terminal — try real commands!</p>
          </div>
        )}

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className={`rounded-xl overflow-hidden border border-purple-500/20 shadow-[0_0_60px_-15px_rgba(168,85,247,0.4)] transition-all duration-300 ${
            isMaximized ? 'fixed inset-4 z-50' : ''
          }`}
          style={{ backgroundColor: '#0d0d14' }}
          onClick={focusInput}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a24] border-b border-white/5">
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
            
            {/* Center title */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <TerminalIcon className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-500 font-medium">ali@portfolio: {currentDir}</span>
            </div>

            {/* Right status */}
            <div className="flex items-center gap-3 text-[10px] text-neutral-600">
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3" />
                <span>100%</span>
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
              isMinimized ? 'h-0 p-0' : isMaximized ? 'h-[calc(100vh-120px)]' : 'h-[500px]'
            }`}
            style={{ 
              backgroundColor: '#0d0d14',
              textShadow: '0 0 1px rgba(255,255,255,0.1)'
            }}
          >
            {history.map((line, i) => (
              <div key={i} className="mb-1">
                {line.type === "prompt" && (
                  <div className="flex items-start gap-2 flex-wrap">
                    {renderPrompt(line.path)}
                    <span className="text-neutral-200 ml-2">{line.text}</span>
                  </div>
                )}
                {line.type === "output" && (
                  <pre className="text-neutral-400 whitespace-pre-wrap pl-0 my-1">{line.text}</pre>
                )}
                {line.type === "file" && (
                  <pre className="text-emerald-400/90 whitespace-pre-wrap my-1 pl-0">{line.text}</pre>
                )}
                {line.type === "html" && (
                  <pre className="my-1" dangerouslySetInnerHTML={{ __html: line.text }} />
                )}
                {line.type === "tree" && (
                  <pre className="text-neutral-400 whitespace-pre-wrap my-1">{line.text.replace(/\x1b\[34m/g, '<span class="text-blue-400">').replace(/\x1b\[0m/g, '</span>')}</pre>
                )}
                {line.type === "neofetch" && (
                  <pre className="whitespace-pre-wrap my-1" dangerouslySetInnerHTML={{ 
                    __html: line.text
                      .replace(/\x1b\[35m/g, '<span class="text-purple-500">')
                      .replace(/\x1b\[33m/g, '<span class="text-yellow-500">')
                      .replace(/\x1b\[0m/g, '</span>')
                  }} />
                )}
                {line.type === "error" && (
                  <pre className="text-red-400 whitespace-pre-wrap my-1">{line.text}</pre>
                )}
                {line.type === "system" && (
                  <pre className="text-purple-400 whitespace-pre-wrap my-1">{line.text}</pre>
                )}
                {line.type === "success" && (
                  <pre className="text-emerald-400 whitespace-pre-wrap my-1">{line.text}</pre>
                )}
                {line.type === "ascii" && (
                  <pre className="text-[7px] md:text-[9px] leading-none bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent font-bold my-2">{line.text}</pre>
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
                  className="w-full bg-transparent text-neutral-200 outline-none"
                  style={{ caretColor: '#a855f7' }}
                  autoComplete="off"
                  spellCheck="false"
                  autoFocus
                />
                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute left-0 top-6 bg-[#1a1a24] border border-purple-500/30 rounded-lg overflow-hidden shadow-xl z-10 min-w-[150px]">
                    {suggestions.map((s, i) => (
                      <div
                        key={s}
                        className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                          i === selectedSuggestion ? 'bg-purple-500/20 text-purple-300' : 'text-neutral-400 hover:bg-white/5'
                        }`}
                        onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus(); }}
                      >
                        {s}
                      </div>
                    ))}
                    <div className="px-3 py-1 text-[10px] text-neutral-600 border-t border-white/5">
                      Tab to complete
                    </div>
                  </div>
                )}
              </div>
              <span className="animate-pulse text-purple-500">▊</span>
            </div>
          </div>

          {/* Status bar */}
          <div className={`px-4 py-1.5 bg-[#16161e] border-t border-white/5 flex items-center justify-between text-[10px] transition-all ${isMinimized ? 'hidden' : ''}`}>
            <div className="flex items-center gap-4 text-neutral-500">
              <span>zsh</span>
              <span>utf-8</span>
              <span>{history.filter(h => h.type === "prompt").length} commands</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-neutral-600">↑↓ history</span>
              <span className="text-neutral-600">Tab complete</span>
              <span className="text-neutral-600">Ctrl+L clear</span>
            </div>
          </div>
        </motion.div>

        {/* Fullscreen backdrop */}
        {isMaximized && (
          <div className="fixed inset-0 bg-black/90 z-40" onClick={() => setIsMaximized(false)} />
        )}

        {/* Hint */}
        {!isMaximized && (
          <div className="text-center mt-6">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
              <span className="text-neutral-400 text-xs font-medium">💡 Quick Commands:</span>
              <button 
                onClick={() => { executeCommand("help"); setInput(""); }}
                className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors border border-purple-500/30"
              >
                help
              </button>
              <button 
                onClick={() => { executeCommand("about"); setInput(""); }}
                className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors border border-purple-500/30"
              >
                about
              </button>
              <button 
                onClick={() => { executeCommand("skills"); setInput(""); }}
                className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors border border-purple-500/30"
              >
                skills
              </button>
              <button 
                onClick={() => { executeCommand("experience"); setInput(""); }}
                className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors border border-purple-500/30"
              >
                experience
              </button>
              <button 
                onClick={() => { executeCommand("resume"); setInput(""); }}
                className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors border border-purple-500/30"
              >
                resume
              </button>
              <button 
                onClick={() => { executeCommand("contact"); setInput(""); }}
                className="px-3 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors border border-purple-500/30"
              >
                contact
              </button>
            </div>
            <p className="text-neutral-600 text-xs mt-3">
              Click any command above to run it instantly, or type your own command
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
