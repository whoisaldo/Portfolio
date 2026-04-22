// src/components/Hero.jsx — Editorial brutalist hero
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Download, ArrowRight } from "lucide-react";

export default function Hero() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";

  const [subtitleText, setSubtitleText] = useState("");
  const fullSubtitle = "architecting scalable enterprise infrastructure.";
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i <= fullSubtitle.length) {
        setSubtitleText(fullSubtitle.slice(0, i));
        i++;
        setTimeout(tick, 32);
      }
    };
    const t = setTimeout(tick, 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 540);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-ink grain">
      {/* Diagonal hairlines */}
      <div className="diag-rule top-[30%] left-[-50%]" />
      <div className="diag-rule top-[62%] left-[-60%] opacity-20" />

      {/* Corner mono metadata */}
      <div className="absolute top-24 left-6 md:left-10 z-20 mono-label text-bone/35 hidden md:block">
        <div>N 42.3601°</div>
        <div>W 71.0589°</div>
        <div className="mt-1 text-bone/25">Boston / Seattle</div>
      </div>
      <div className="absolute top-24 right-6 md:right-10 z-20 mono-label text-bone/35 text-right hidden md:block">
        <div>v04.20.26</div>
        <div>portfolio · edition iv</div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 w-full py-32">

        {/* Status stack */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-2 mb-12 max-w-xl"
        >
          <div className="flex items-center gap-3 px-3 py-2 border border-signal/40 bg-signal/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-signal" />
            </span>
            <span className="mono-label text-signal">Now</span>
            <span className="font-mono text-xs text-bone/85">SWE Co-op @ Philips · Cambridge, MA</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 border border-ember/50 bg-ember/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ember opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ember" />
            </span>
            <span className="mono-label text-ember">Incoming · Summer ’26</span>
            <span className="font-mono text-xs text-bone/85">SDE Intern @ AWS ADC · Seattle, WA</span>
          </div>
        </motion.div>

        {/* Display headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="serif-display text-bone mb-8"
          style={{ fontSize: 'clamp(3.2rem, 12vw, 11rem)', lineHeight: 0.9 }}
        >
          <span className="block italic">Ali</span>
          <span className="block">
            <span className="text-bone/40">/</span>
            <span className="text-signal"> Younes</span>
            <span
              className={`align-middle inline-block w-3 md:w-5 h-[0.85em] bg-signal ml-2 md:ml-3 ${cursorOn ? 'opacity-100' : 'opacity-0'} transition-opacity duration-75`}
              aria-hidden
            />
          </span>
        </motion.h1>

        {/* Mono subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-mono text-sm md:text-base text-bone/65 max-w-2xl mb-2"
        >
          <span className="text-signal">›</span>{" "}
          <span className="text-bone">ali@eternalreverse:~$</span>{" "}
          <span className="text-bone/80">{subtitleText}</span>
          <span className={`inline-block w-2 h-4 align-middle bg-bone/70 ml-0.5 ${cursorOn ? 'opacity-100' : 'opacity-0'}`} />
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.8 }}
          className="font-mono text-xs md:text-sm text-bone/45 max-w-2xl mb-12"
        >
          CS &amp; Political Science · Northeastern University · Class of ’27
        </motion.p>

        {/* CTAs — hard-edged */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap gap-3 mb-10"
        >
          <a
            href="#projects"
            className="group inline-flex items-center gap-3 px-6 py-3 bg-signal text-ink font-mono text-sm uppercase tracking-[0.2em] font-bold
                       border-2 border-signal hover:bg-transparent hover:text-signal transition-colors duration-200"
          >
            View Work
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </a>
          <a
            href={pdf}
            download
            className="group inline-flex items-center gap-3 px-6 py-3 border-2 border-bone/40 text-bone
                       font-mono text-sm uppercase tracking-[0.2em] font-bold
                       hover:bg-bone hover:text-ink hover:border-bone transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            Résumé
          </a>
          <a
            href="#contact"
            className="group inline-flex items-center gap-3 px-6 py-3 border-2 border-transparent text-bone/60
                       font-mono text-sm uppercase tracking-[0.2em] font-bold
                       hover:text-signal transition-colors duration-200"
          >
            Let’s Talk ↘
          </a>
        </motion.div>

        {/* Social */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex items-center gap-6"
        >
          <a href="https://github.com/whoisaldo" target="_blank" rel="noreferrer"
             className="flex items-center gap-2 text-bone/60 hover:text-signal transition-colors font-mono text-xs uppercase tracking-[0.2em]">
            <Github className="w-4 h-4" /> github
          </a>
          <a href="https://www.linkedin.com/in/ali-younes-41a2b4296/" target="_blank" rel="noreferrer"
             className="flex items-center gap-2 text-bone/60 hover:text-signal transition-colors font-mono text-xs uppercase tracking-[0.2em]">
            <Linkedin className="w-4 h-4" /> linkedin
          </a>
          <a href="mailto:younes.al@northeastern.edu"
             className="text-bone/60 hover:text-signal transition-colors font-mono text-xs uppercase tracking-[0.2em]">
            ✉ email
          </a>
        </motion.div>
      </div>

    </section>
  );
}
