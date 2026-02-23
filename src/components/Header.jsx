// src/components/Header.jsx
import React from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50
                       bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <a 
          href="#" 
          className="group font-display text-xl font-bold transition-all duration-300 hover:scale-105"
        >
          <span className="bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent
                          group-hover:from-red-600 group-hover:to-rose-600 transition-all duration-300">
            Ali Younes
          </span>
        </a>
        <nav className="hidden sm:flex items-center gap-8 text-sm">
          <a 
            href="#about" 
            className="relative font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 
                       transition-colors duration-300 group"
          >
            About
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-500 
                            group-hover:w-full transition-all duration-300"></span>
          </a>
          <a 
            href="#projects" 
            className="relative font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 
                       transition-colors duration-300 group"
          >
            Projects
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-500 
                            group-hover:w-full transition-all duration-300"></span>
          </a>
          <a 
            href="#resume" 
            className="relative font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 
                       transition-colors duration-300 group"
          >
            Resume
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-500 
                            group-hover:w-full transition-all duration-300"></span>
          </a>
          <a 
            href="#contact" 
            className="relative font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 
                       transition-colors duration-300 group"
          >
            Contact
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-500 
                            group-hover:w-full transition-all duration-300"></span>
          </a>
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </nav>
        <div className="sm:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
