// src/components/Header.jsx
import React from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 dark:border-white/10
                       bg-white/70 dark:bg-neutral-950/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#" className="font-display text-lg font-semibold">
          <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            Ali Younes
          </span>
        </a>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <a href="#about" className="hover:opacity-80">About</a>
          <a href="#projects" className="hover:opacity-80">Projects</a>
          <a href="#resume" className="hover:opacity-80">Resume</a>
          <a href="#contact" className="hover:opacity-80">Contact</a>
          <ThemeToggle />
        </nav>
        <div className="sm:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
