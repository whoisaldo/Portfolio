// src/components/Navbar.jsx - OPTIMIZED
import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { name: "Projects", href: "#projects" },
  { name: "Experience", href: "#experience" },
  { name: "Skills", href: "#terminal" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5" : ""
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a
          href="#"
          className="text-xl font-bold bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent
                     hover:opacity-80 transition-opacity"
        >
          Ali Younes
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
          <a
            href="#resume"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 
                       text-white text-sm font-semibold shadow-[0_0_20px_-8px_rgba(168,85,247,0.5)]
                       hover:shadow-[0_0_25px_-8px_rgba(168,85,247,0.7)] hover:-translate-y-0.5
                       transition-all duration-200"
          >
            Resume
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {isMobileOpen && (
        <div className="md:hidden bg-[#12121a]/98 backdrop-blur-md border-t border-white/5">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className="block text-neutral-300 hover:text-white py-2 transition-colors"
              >
                {link.name}
              </a>
            ))}
            <a
              href="#resume"
              onClick={() => setIsMobileOpen(false)}
              className="block w-full text-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold"
            >
              Resume
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
