// src/components/hud/HUDOverlay.jsx — fixed four-corner heads-up chrome
import React, { useEffect, useState } from "react";

const sections = [
  { id: "hero",       num: "I",   label: "HERO_COVER" },
  { id: "projects",   num: "II",  label: "MISSION_DOSSIER" },
  { id: "experience", num: "III", label: "SERVICE_RECORD" },
  { id: "terminal",   num: "IV",  label: "DIRECT_CONSOLE" },
  { id: "resume",     num: "V",   label: "PERSONNEL_FILE" },
  { id: "contact",    num: "VI",  label: "ENCRYPTED_CHANNEL" },
];

function pad2(n) { return String(n).padStart(2, "0"); }

export default function HUDOverlay({ visible = true }) {
  const [active, setActive] = useState(sections[0]);
  const [scroll, setScroll] = useState(0);
  const [clock, setClock] = useState("--:--:--");

  // Live clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Scroll progress — rAF-throttled, only re-renders on integer-percent change
  useEffect(() => {
    let raf = 0;
    let pendingPct = -1;
    let lastSet = -1;
    const compute = () => {
      raf = 0;
      const top = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = h > 0 ? Math.min(top / h, 1) : 0;
      pendingPct = Math.round(ratio * 100);
      if (pendingPct !== lastSet) {
        lastSet = pendingPct;
        setScroll(ratio);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const s = sections.find((s) => s.id === visible[0].target.id);
          if (s) setActive(s);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.05, 0.25, 0.5, 0.75] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="hidden md:block fixed inset-0 z-30 pointer-events-none font-mono text-[10px] tracking-[0.22em] uppercase"
    >
      {/* Corner brackets — at viewport edges */}
      <span className="absolute top-3 left-3 w-3 h-3 border-t border-l border-hud/40" />
      <span className="absolute top-3 right-3 w-3 h-3 border-t border-r border-hud/40" />
      <span className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-hud/40" />
      <span className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-hud/40" />

      {/* Top-left — active section */}
      <div className="absolute top-3 left-8 flex items-center gap-2 text-hud/60">
        <span className="text-hud/85">[ {active.num} ]</span>
        <span className="text-bone/55 hidden lg:inline">{active.label}</span>
      </div>

      {/* Top-right — clock + scroll % */}
      <div className="absolute top-3 right-8 flex items-center gap-4 text-bone/55">
        <span className="text-hud/85">{clock}</span>
        <span className="text-hud/40 hidden lg:inline">▸</span>
        <span className="text-bone/65 hidden lg:inline">scroll {Math.round(scroll * 100)}%</span>
      </div>

      {/* Bottom-left — location */}
      <div className="absolute bottom-3 left-8 text-bone/45 hidden lg:flex items-center gap-2">
        <span className="text-hud/70">◆</span>
        <span>boston, ma · 42.36°n 71.06°w</span>
      </div>

      {/* Bottom-right — uplink */}
      <div className="absolute bottom-3 right-8 flex items-center gap-2 text-bone/55">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hud opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-hud" />
        </span>
        <span className="text-hud/85">uplink_stable</span>
      </div>
    </div>
  );
}
