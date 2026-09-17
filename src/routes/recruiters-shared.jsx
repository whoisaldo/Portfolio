// Components and styles shared only by the recruiter routes.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Github,
  Linkedin,
  Play,
  Moon,
  Sun,
} from "lucide-react";
import { profile, links } from "../data/profile";
import { NAV, pdf, recruiterAvatar } from "./recruiters-lib";
import { useRecruiterTheme, setRecruiterTheme } from "./recruiters-theme";
// The display serif. Imported here rather than in main.jsx so its one 18 KB
// file ships in the recruiter chunk and the cinematic never requests it.
import "@fontsource/fraunces/latin-400.css";
import "./recruiters.css";

export function PlainBar({ home = false }) {
  const [active, setActive] = useState("");
  const theme = useRecruiterTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    if (!home) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = NAV.filter(({ id }) => {
        const section = document.getElementById(id);
        return section && section.getBoundingClientRect().top <= 180;
      });
      const atEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4;
      setActive(atEnd ? "contact" : (sections.at(-1)?.id ?? ""));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [home]);

  return (
    <header className="rp-bar">
      <a href="#main-content" className="rp-skip">
        Skip to content
      </a>
      <div className="rp-wrap rp-bar-inner">
        <Link
          to="/recruiters"
          className="rp-brand"
          aria-label={`${profile.name}, portfolio home`}
        >
          <img
            className="rp-avatar"
            src={recruiterAvatar}
            alt=""
            width="80"
            height="80"
          />
          <span>
            {profile.name}
            <span className="rp-brand-caption">Software engineer</span>
          </span>
        </Link>
        <nav aria-label="Portfolio sections" className="rp-nav">
          {NAV.map((n) =>
            home ? (
              <a
                key={n.id}
                href={`#${n.id}`}
                aria-current={active === n.id ? "location" : undefined}
              >
                {n.label}
              </a>
            ) : (
              <Link key={n.id} to={`/recruiters#${n.id}`}>
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <div className="rp-bar-actions">
          <button
            type="button"
            className="rp-theme-toggle"
            onClick={() => setRecruiterTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>
          <a
            href={pdf}
            download="Ali_Younes_Resume.pdf"
            className="rp-button rp-nav-download"
          >
            <ArrowDownToLine size={15} aria-hidden="true" /> Résumé{" "}
            <span className="rp-file-type">PDF</span>
          </a>
        </div>
      </div>
    </header>
  );
}

export function PlainFooter() {
  return (
    <footer className="rp-wrap rp-footer">
      <p>
        © {new Date().getFullYear()} {profile.name}
        <span className="rp-footer-location"> · {profile.base}</span>
      </p>
      <div className="rp-footer-links">
        <a href={links.github} target="_blank" rel="noreferrer">
          <Github size={15} aria-hidden="true" /> GitHub
        </a>
        <a href={links.linkedin} target="_blank" rel="noreferrer">
          <Linkedin size={15} aria-hidden="true" /> LinkedIn
        </a>
        <Link to="/" className="rp-cinematic-link">
          <Play size={13} aria-hidden="true" /> Cinematic experience{" "}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </footer>
  );
}

export function PlainSection({ id, title, children, aside, number }) {
  return (
    <section id={id} className="rp-section" aria-labelledby={`${id}-heading`}>
      <div className="rp-section-heading">
        <div className="rp-section-title">
          {number && (
            <span className="rp-section-number" aria-hidden="true">
              {number}
            </span>
          )}
          <h2 id={`${id}-heading`}>{title}</h2>
        </div>
        {aside && <p>{aside}</p>}
      </div>
      {children}
    </section>
  );
}

export function Chip({ children }) {
  return <li className="rp-chip">{children}</li>;
}
