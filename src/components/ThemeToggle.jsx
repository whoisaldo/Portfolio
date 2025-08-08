// src/components/ThemeToggle.jsx
import React from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const isDark = () => document.documentElement.classList.contains("dark");

  const toggle = () => {
    const enabled = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("theme", enabled ? "dark" : "light"); } catch {}
  };

  // initialize from storage/system on first render
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const prefers = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = stored ? stored === "dark" : prefers;
      document.documentElement.classList.toggle("dark", shouldDark);
    } catch {}
  }, []);

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5
                 bg-white/70 backdrop-blur text-sm shadow-sm hover:shadow
                 dark:bg-neutral-900/60 dark:border-neutral-800"
      aria-label="Toggle theme"
    >
      {isDark() ? <Sun size={16}/> : <Moon size={16}/>}
      {isDark() ? "Light" : "Dark"}
    </button>
  );
}
