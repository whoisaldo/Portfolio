// src/components/Navbar.jsx — Editorial mono ribbon
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { num: "01", name: "projects",   href: "#projects" },
  { num: "02", name: "experience", href: "#experience" },
  { num: "03", name: "terminal",   href: "#terminal" },
  { num: "04", name: "contact",    href: "#contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
                  ${isScrolled ? "bg-ink/90 backdrop-blur-md border-b border-hud/15" : "bg-transparent"}`}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
        {/* Brand mark */}
        <a href="#hero" data-hud-target="link" className="group flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em]">
          <span className="relative inline-flex">
            <span className="w-2 h-2 bg-hud group-hover:rotate-45 transition-transform duration-300" />
            <span className="absolute inset-0 w-2 h-2 bg-hud animate-ping opacity-50" />
          </span>
          <span className="text-bone">ali_younes</span>
          <span className="hidden sm:inline text-bone/30">//</span>
          <span className="hidden sm:inline text-hud/70">eternalreverse</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              data-hud-target="link"
              className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/70 hover:text-bone transition-colors"
            >
              <span className="text-hud/60 group-hover:text-hud transition-colors">[{link.num}]</span>
              <span className="ink-underline">{link.name}</span>
            </a>
          ))}
          <a
            href="#resume"
            data-hud-target="link"
            className="scan-beam-host font-mono text-[11px] uppercase tracking-[0.22em] font-bold px-3 py-1.5
                       border border-signal text-signal hover:bg-signal hover:text-ink transition-colors"
          >
            ▶ résumé
          </a>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 text-bone/70 hover:text-signal transition-colors"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-ink/98 backdrop-blur-md border-t border-bone/10"
          >
            <div className="px-6 py-4 space-y-2">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.22em] text-bone/70 hover:text-hud py-2 transition-colors"
                >
                  <span className="text-hud/60">[{link.num}]</span>
                  <span className="ink-underline">{link.name}</span>
                </motion.a>
              ))}
              <motion.a
                href="#resume"
                onClick={() => setIsMobileOpen(false)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.04 }}
                className="block font-mono text-[12px] uppercase tracking-[0.22em] font-bold w-full text-center px-4 py-2 border border-signal text-signal"
              >
                ▶ résumé ↘
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
