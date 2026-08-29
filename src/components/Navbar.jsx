// src/components/Navbar.jsx: the fixed header.
//
// The `[01]`–`[04]` prefixes were removed a while back: they were the first of
// three competing numbering systems on the page and they numbered four links
// any reader can count. The link list comes from src/data/site.js rather than
// a fourth private copy of the same array.
//
// In-page links go through scrollToSection(). The href stays a real `#id` so
// middle-click, copy-link and no-JS still work.
//
// The wordmark is set in the display face at a size the rest of the bar is
// not, because a header with six items all at 11px has no entry point. It is
// his name; it should look like the thing everything else hangs off.
//
// Opacity modifiers here must come from Tailwind's scale (…/85, /90, /95).
// This bar was written with `bg-ink/92` and the mobile panel with `bg-ink/96`,
// neither of which is a scale step, so Tailwind emitted no rule at all and
// both surfaces rendered fully transparent. It fails silently: no build error,
// no console warning, just a menu you can read the page through.
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navSections } from "../data/site";
import { profile } from "../data/profile";
import { scrollToSection } from "../lib/scroll";
import Panel from "./ui/Panel";

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
                  ${isScrolled ? "bg-ink/95 backdrop-blur-md border-b border-ink-line" : "bg-transparent"}`}
    >
      <nav className="gutter py-4 flex items-center justify-between gap-6">
        <a
          href={onHome ? "#hero" : "/"}
          onClick={(e) => jumpTo(e, "hero")}
          className="font-display font-bold uppercase tracking-tight text-primary text-lg md:text-xl
                     leading-none transition-colors duration-200 hover:text-volt"
        >
          {profile.name}
        </a>

        <div className="hidden md:flex items-center gap-7">
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

          {/* The one filled control in the bar. Volt is signage: it marks the
              thing you can act on, and there is exactly one of those here. */}
          <Panel
            as="a"
            size="sm"
            href={pdf}
            download="Ali_Younes_Resume.pdf"
            edge="bg-volt hover:bg-volt-deep transition-colors duration-200"
            fill="bg-volt"
            className="scan-beam-host"
            innerClassName="px-5 py-2.5 mono-ui font-bold text-ink"
          >
            Résumé
          </Panel>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileOpen((open) => !open)}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-nav"
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden p-2 text-muted transition-colors duration-200 hover:text-volt"
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
            className="md:hidden bg-ink/95 backdrop-blur-md border-t border-ink-line"
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
                className="chamfer chamfer-sm bg-volt mono-ui font-bold text-ink text-center px-5 py-3 mt-3"
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
