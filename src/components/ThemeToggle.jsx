// src/components/ThemeToggle.jsx
import React, { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  const toggle = () => {
    const enabled = document.documentElement.classList.toggle("dark");
    setIsDark(enabled);
    try { 
      localStorage.setItem("theme", enabled ? "dark" : "light"); 
    } catch {}
  };

  // initialize from storage/system on first render
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const prefers = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = stored ? stored === "dark" : prefers;
      document.documentElement.classList.toggle("dark", shouldDark);
      setIsDark(shouldDark);
    } catch {}
  }, []);

  return (
    <button
      onClick={toggle}
      className="group inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 
                 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                 bg-white/80 dark:bg-gray-800/80 backdrop-blur hover:bg-gray-50 dark:hover:bg-gray-700/80
                 hover:border-gray-300 dark:hover:border-gray-600
                 hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={16} className="group-hover:rotate-180 transition-transform duration-300"/> : <Moon size={16} className="group-hover:rotate-12 transition-transform duration-300"/>}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
