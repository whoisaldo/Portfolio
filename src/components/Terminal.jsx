// src/components/Terminal.jsx - Interactive Terminal
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon, Cpu } from "lucide-react";

// Command definitions
const commands = {
  help: {
    description: "Show available commands",
    output: `Available commands:
  help          - Show this help message
  banner        - Show ASCII art banner
  about         - Learn about Ali
  skills        - View technical skills
  experience    - View work experience
  education     - View education
  projects      - View featured projects
  contact       - Get contact information
  resume        - Download resume link
  socials       - View social links
  clear         - Clear terminal
  
Type a command and press Enter!`
  },
  banner: {
    description: "Show ASCII banner",
    ascii: true,
  },
  about: {
    description: "About Ali",
    output: `┌─────────────────────────────────────────┐
│           ALI YOUNES                    │
│     Full-Stack Developer                │
└─────────────────────────────────────────┘

👋 Hey! I'm Ali, a Computer Science student at 
   Northeastern University with a passion for 
   building clean, performant software.

💼 Currently working as a Systems Integration 
   Engineering Co-op at Philips.

🎯 I love solving complex problems, creating 
   great user experiences, and shipping 
   products that make a difference.

🎮 Fun fact: I also do game development in Lua!

Type 'skills' to see my technical abilities.`
  },
  skills: {
    description: "Technical skills",
    output: `📊 TECHNICAL SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💻 Languages:
   JavaScript  ████████████████████  Expert
   TypeScript  ██████████████████░░  Advanced
   C++         ████████████████░░░░  Advanced
   Java        ██████████████░░░░░░  Proficient
   Python      ████████████░░░░░░░░  Proficient
   Lua         ████████████████░░░░  Advanced
   Swift       ██████████░░░░░░░░░░  Intermediate

🎨 Frontend:
   React, Tailwind CSS, Framer Motion, HTML5, CSS3

⚙️ Backend:
   Node.js, Express, MongoDB, REST APIs, JWT Auth

🛠️ Tools:
   Git, Linux, GDB, VS Code, Heroku, Vercel

Type 'projects' to see what I've built!`
  },
  experience: {
    description: "Work experience",
    output: `💼 WORK EXPERIENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 PHILIPS
   Software Engineering Co-op (System Integration)
   📅 2025 - Present | Cambridge, MA
   
   • PicIX platform development & enterprise imaging
   • Performance testing & optimization
   • Server automation (100s of computers)
   • Healthcare IT systems impact

🏠 TOP CHOICE REALTY
   Frontend Developer Intern
   📅 Apr 2024 - Aug 2024 | New York, NY
   
   • Built full-stack app (React, Python, SQL)
   • 85% faster lookups, 3x query speed
   • Managed 800+ client records
   • Saved team 15+ hours/week

🖥️ ROBERT DEFALCO REALTY
   Computer Technician Intern
   📅 Jun 2023 - Sep 2023 | New York, NY
   
   • On-site support across 3+ offices
   • Configured 15+ systems (Win/Mac/Linux)
   • Resolved 25+ technical issues
   • Maintained 95%+ system uptime

Type 'education' to see my academic background.`
  },
  education: {
    description: "Education",
    output: `🎓 EDUCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏫 NORTHEASTERN UNIVERSITY
   B.S. Computer Science & Engineering
   📅 2023 - 2027 (Expected)
   📍 Boston, MA
   
   Relevant Coursework:
   • Data Structures & Algorithms
   • Object-Oriented Design
   • Systems Programming
   • Database Management
   • Software Engineering

Type 'contact' to get in touch!`
  },
  projects: {
    description: "Featured projects",
    output: `🚀 FEATURED PROJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 MOOPS BOOKSTORE
   Full-stack social book tracking platform
   Tech: React, TypeScript, Node.js, MongoDB
   🔗 github.com/whoisaldo/MoopBookstore

💪 EXERLY FITNESS
   Comprehensive fitness tracking platform
   Tech: React, Node.js, MongoDB, JWT
   🔗 github.com/whoisaldo/Exerly-Fitness

✂️ FADE EMPIRE BARBERSHOP
   Modern barbershop website
   Tech: HTML5, CSS3, JavaScript
   🔗 chicopeefadeempire.com

Type 'contact' to discuss opportunities!`
  },
  contact: {
    description: "Contact information",
    output: `📬 CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Email (Primary):
   younes.al@northeastern.edu

📧 Email (Personal):
   whois.younes@gmail.com

📱 Phone:
   (413) 409-9563

📍 Location:
   Boston, MA

💼 Status:
   Open to internships & part-time roles!

Type 'socials' to see my profiles.`
  },
  resume: {
    description: "Resume download",
    output: `📄 RESUME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Download my resume to learn more about my
experience, skills, and qualifications.

🔗 Click the "Resume" button in the navbar
   or scroll to the Resume section below.

Want to chat? Type 'contact' for my info!`
  },
  socials: {
    description: "Social links",
    output: `🌐 SOCIAL LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐙 GitHub:
   github.com/whoisaldo

💼 LinkedIn:
   linkedin.com/in/ali-younes-41a2b4296

Thanks for checking out my portfolio!
Type 'contact' to get in touch.`
  },
  whoami: {
    description: "Who am I",
    output: "ali@portfolio - Full-Stack Developer & Problem Solver"
  },
  ls: {
    description: "List contents",
    output: `about.txt    contact.json    education.md
experience.md    projects/    resume.pdf
skills.json    socials.txt`
  },
  pwd: {
    description: "Print working directory",
    output: "/home/ali/portfolio"
  },
  date: {
    description: "Show date",
    output: new Date().toLocaleString()
  },
  echo: {
    description: "Echo text",
    handler: (args) => args.join(" ") || ""
  },
  neofetch: {
    description: "System info",
    output: `        /\\          ali@portfolio
       /  \\         ─────────────────
      /\\   \\        OS: React 18.x
     /      \\       Host: Northeastern University
    /   ,,   \\      Kernel: Node.js 20.x
   /_-''  ''-_\\     Shell: TypeScript 5.x
                    Terminal: Interactive v1.0
                    CPU: Coffee-Powered
                    Memory: Unlimited Ambition`
  },
  sudo: {
    description: "Superuser",
    output: "Nice try! 😄 But you don't need sudo here."
  },
  exit: {
    description: "Exit",
    output: "Thanks for visiting! Scroll down to explore more. 👋"
  },
  hire: {
    description: "Hire me",
    output: `🎉 GREAT CHOICE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I'm actively looking for opportunities!

📧 Email me at: younes.al@northeastern.edu
📱 Or call: (413) 409-9563

Let's build something amazing together! 🚀`
  },
};

export default function Terminal() {
  const asciiName = `
   █████╗ ██╗     ██╗    ██╗   ██╗ ██████╗ ██╗   ██╗███╗   ██╗███████╗███████╗
  ██╔══██╗██║     ██║    ╚██╗ ██╔╝██╔═══██╗██║   ██║████╗  ██║██╔════╝██╔════╝
  ███████║██║     ██║     ╚████╔╝ ██║   ██║██║   ██║██╔██╗ ██║█████╗  ███████╗
  ██╔══██║██║     ██║      ╚██╔╝  ██║   ██║██║   ██║██║╚██╗██║██╔══╝  ╚════██║
  ██║  ██║███████╗██║       ██║   ╚██████╔╝╚██████╔╝██║ ╚████║███████╗███████║
  ╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝
                        [ Full-Stack Developer ]
`;

  const [history, setHistory] = useState([
    { type: "ascii", text: asciiName },
    { type: "system", text: "Welcome to Ali's Interactive Terminal! 🚀" },
    { type: "system", text: "Type 'help' to see available commands.\n" },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on click
  const focusInput = () => inputRef.current?.focus();

  const handleCommand = (cmd) => {
    const trimmed = cmd.trim().toLowerCase();
    const [command, ...args] = trimmed.split(" ");
    
    // Add command to history
    setHistory(prev => [...prev, { type: "command", text: cmd }]);
    
    if (command === "") return;
    
    // Save to command history for arrow key navigation
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    if (command === "clear") {
      setHistory([
        { type: "system", text: "Terminal cleared. Type 'help' for commands.\n" },
      ]);
      return;
    }

    const cmdDef = commands[command];
    if (cmdDef) {
      if (cmdDef.ascii) {
        setHistory(prev => [...prev, { type: "ascii", text: asciiName }]);
      } else {
        const output = cmdDef.handler ? cmdDef.handler(args) : cmdDef.output;
        setHistory(prev => [...prev, { type: "output", text: output }]);
      }
    } else {
      setHistory(prev => [...prev, { 
        type: "error", 
        text: `Command not found: ${command}\nType 'help' to see available commands.` 
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Auto-complete
      const matches = Object.keys(commands).filter(c => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  };

  return (
    <section id="terminal" className="relative py-24 px-6 bg-[#0a0a0f]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-5">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-400">Interactive</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent mb-3">
            Terminal
          </h2>
          <p className="text-neutral-500">Type commands to explore my profile</p>
        </div>

        {/* Terminal Window */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-xl overflow-hidden border border-purple-500/20 shadow-[0_0_50px_-20px_rgba(168,85,247,0.3)]"
          style={{ backgroundColor: '#0c0c14' }}
          onClick={focusInput}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#16161e] border-b border-white/5">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
            </div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-neutral-500">ali@portfolio ~ bash</span>
            </div>
            <div className="text-[10px] text-neutral-600">click to focus</div>
          </div>

          {/* Terminal content */}
          <div 
            ref={terminalRef}
            className="p-4 font-mono text-sm h-[400px] overflow-auto cursor-text"
          >
            {history.map((line, i) => (
              <div key={i} className="mb-1 whitespace-pre-wrap">
                {line.type === "command" && (
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 select-none">❯</span>
                    <span className="text-neutral-200">{line.text}</span>
                  </div>
                )}
                {line.type === "output" && (
                  <div className="text-neutral-400 pl-4 my-2">{line.text}</div>
                )}
                {line.type === "error" && (
                  <div className="text-red-400 pl-4 my-1">{line.text}</div>
                )}
                {line.type === "system" && (
                  <div className="text-purple-400 my-1">{line.text}</div>
                )}
                {line.type === "ascii" && (
                  <pre className="text-[8px] md:text-[10px] leading-tight bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent font-bold my-2 overflow-x-auto">{line.text}</pre>
                )}
              </div>
            ))}
            
            {/* Input line */}
            <div className="flex items-center gap-2">
              <span className="text-green-500 select-none">❯</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-neutral-200 outline-none caret-purple-500"
                placeholder="Type a command..."
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Quick commands bar */}
          <div className="px-4 py-2 bg-[#12121a] border-t border-white/5 flex flex-wrap gap-2">
            <span className="text-[10px] text-neutral-600 mr-2">Quick:</span>
            {["help", "about", "skills", "projects", "contact", "hire"].map((cmd) => (
              <button
                key={cmd}
                onClick={() => {
                  handleCommand(cmd);
                  setInput("");
                }}
                className="px-2 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-400 
                           hover:bg-purple-500/20 transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Hint */}
        <p className="text-center text-neutral-600 text-xs mt-4">
          💡 Try: help, about, skills, projects, contact, hire, neofetch
        </p>
      </div>
    </section>
  );
}
