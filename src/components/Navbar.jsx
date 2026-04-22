// src/components/Navbar.jsx — Editorial mono ribbon
import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { name: "01 Projects",   href: "#projects" },
  { name: "02 Experience", href: "#experience" },
  { name: "03 Terminal",   href: "#terminal" },
  { name: "04 Contact",    href: "#contact" },
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
                  ${isScrolled ? "bg-ink/90 backdrop-blur-md border-b border-bone/10" : "bg-transparent"}`}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
        {/* Brand mark */}
        <a href="#" className="group flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em]">
          <span className="w-2 h-2 bg-signal group-hover:rotate-45 transition-transform duration-300" />
          <span className="text-bone">ali_younes</span>
          <span className="hidden sm:inline text-bone/30">/</span>
          <span className="hidden sm:inline text-bone/50">eternalreverse</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="relative font-mono text-[11px] uppercase tracking-[0.22em] text-bone/55
                         hover:text-bone transition-colors"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-signal group-hover:w-full transition-all duration-300" />
            </a>
          ))}
          <a
            href="#resume"
            className="font-mono text-[11px] uppercase tracking-[0.22em] font-bold px-3 py-1.5
                       border border-signal/60 text-signal hover:bg-signal hover:text-ink transition-colors"
          >
            Résumé ↘
          </a>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 text-bone/70 hover:text-signal transition-colors"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {isMobileOpen && (
        <div className="md:hidden bg-ink/98 backdrop-blur-md border-t border-bone/10">
          <div className="px-6 py-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className="block font-mono text-[12px] uppercase tracking-[0.22em] text-bone/70 hover:text-signal py-2 transition-colors"
              >
                {link.name}
              </a>
            ))}
            <a
              href="#resume"
              onClick={() => setIsMobileOpen(false)}
              className="block font-mono text-[12px] uppercase tracking-[0.22em] font-bold w-full text-center px-4 py-2 border border-signal text-signal"
            >
              Résumé ↘
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
