// src/components/Navbar.jsx — the fixed header.
//
// Three things changed. The `[01]`–`[04]` prefixes are gone: they were the
// first of three competing numbering systems on the page and they numbered
// four links that any reader can count. The `ALI_YOUNES // ETERNALREVERSE`
// wordmark is now just his name, set in the display face — snake_case is for
// identifiers, and this is a person. And the link list comes from
// src/data/site.js rather than a fourth private copy of the same array.
//
// In-page links go through scrollToSection(): the projects reel is ~460vh of
// pinned scrolling, so a native smooth jump past it strobes through every
// project for several seconds. scroll.js picks smooth or instant by distance.
// The href stays a real `#id` so middle-click, copy-link and no-JS still work.
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navSections } from "../data/site";
import { profile } from "../data/profile";
import { scrollToSection } from "../lib/scroll";

const pdf = (import.meta.env.BASE_URL || "/") + "resume.pdf";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // scrollToSection() looks the element up by id and returns silently when it
  // is not there, so from a case study every header link would appear dead.
  // Off the home page, route there and let Home's hash effect do the scrolling.
  const jumpTo = (event, id) => {
    event.preventDefault();
    setIsMobileOpen(false);
    if (onHome) scrollToSection(id);
    else navigate(`/#${id}`);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300
                  ${isScrolled ? "bg-ink/90 backdrop-blur-md border-b border-hud/20" : "bg-transparent"}`}
    >
      <nav className="gutter py-4 flex items-center justify-between gap-6">
        <a
          href={onHome ? "#hero" : "/"}
          onClick={(e) => jumpTo(e, "hero")}
          className="serif-display text-primary text-base md:text-lg leading-none transition-colors duration-200 hover:text-signal-soft"
        >
          {profile.name}
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navSections.map((section) => (
            <a
              key={section.id}
              href={onHome ? `#${section.id}` : `/#${section.id}`}
              onClick={(e) => jumpTo(e, section.id)}
              className="mono-label text-dim transition-colors duration-200 hover:text-primary"
            >
              <span className="ink-underline">{section.label}</span>
            </a>
          ))}

          <a
            href={pdf}
            download="Ali_Younes_Resume.pdf"
            className="scan-beam-host mono-ui font-bold border border-signal px-5 py-2.5 text-signal
                       transition-colors duration-200 hover:bg-signal hover:text-ink"
          >
            Résumé
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileOpen((open) => !open)}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-nav"
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden p-2 text-muted transition-colors duration-200 hover:text-signal-soft"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-ink/95 backdrop-blur-md border-t border-hud/20"
          >
            <div className="gutter py-5 flex flex-col gap-1">
              {navSections.map((section, i) => (
                <motion.a
                  key={section.id}
                  href={onHome ? `#${section.id}` : `/#${section.id}`}
                  onClick={(e) => jumpTo(e, section.id)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="mono-ui text-dim py-3 transition-colors duration-200 hover:text-primary"
                >
                  {section.label}
                </motion.a>
              ))}

              <motion.a
                href={pdf}
                download="Ali_Younes_Resume.pdf"
                onClick={() => setIsMobileOpen(false)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navSections.length * 0.04 }}
                className="mono-ui font-bold border border-signal text-signal text-center px-5 py-3 mt-3"
              >
                Résumé
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
