// src/components/Hero.jsx — Mission Briefing
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Download, ArrowRight, MapPin, Radio } from "lucide-react";
import GlitchText from "./hud/GlitchText";
import BracketFrame from "./hud/BracketFrame";

export default function Hero() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";

  const [subtitleText, setSubtitleText] = useState("");
  const fullSubtitle = "architecting scalable enterprise infrastructure.";
  const [cursorOn, setCursorOn] = useState(true);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    let i = 0;
    const tick = () => {
      if (i <= fullSubtitle.length) {
        setSubtitleText(fullSubtitle.slice(0, i));
        i++;
        setTimeout(tick, 32);
      }
    };
    const t = setTimeout(tick, 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 540);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-ink grain"
    >
      {/* Background layers — lighter blur to reduce GPU cost */}
      <div className="absolute inset-0 crt-grid opacity-40 pointer-events-none" />
      <div
        className="absolute -top-44 -right-40 h-[520px] w-[520px] rounded-full signal-bloom opacity-40 blur-2xl pointer-events-none"
        aria-hidden
      />
      <div className="scan-rule top-[26%] left-[-50%]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full py-32">
        {/* Top kicker — mission briefing tag */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10"
        >
          <BracketFrame as="div" size="sm" className="inline-flex items-center gap-3 px-3 py-1.5 bg-concrete/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hud opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-hud" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-hud uppercase">
              mission_briefing // 001
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-bone/45 uppercase hidden sm:inline">
              — subject: ali_younes
            </span>
          </BracketFrame>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left 8 cols */}
          <div className="lg:col-span-8">
            {/* Status pills */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col gap-2 mb-10 max-w-xl"
            >
              <BracketFrame size="sm" className="flex items-center gap-3 px-3 py-2 bg-concrete/40">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-signal" />
                </span>
                <span className="mono-label text-signal">now</span>
                <span className="font-mono text-xs text-bone/85">SDE Intern @ AWS CloudFormation · Infrastructure as Code · Seattle, WA</span>
              </BracketFrame>
              <BracketFrame size="sm" className="flex items-center gap-3 px-3 py-2 bg-concrete/40">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-bone/40" />
                </span>
                <span className="mono-label text-bone/50">prev · jan–jun ’26</span>
                <span className="font-mono text-xs text-bone/60">SWE Co-op @ Philips · Cambridge, MA</span>
              </BracketFrame>
            </motion.div>

            {/* Display headline — GlitchText reveal */}
            <h1
              className="serif-display text-bone mb-8"
              style={{ fontSize: 'clamp(3.2rem, 12vw, 12rem)', lineHeight: 0.88 }}
            >
              <span className="block">
                <GlitchText text="Ali" delay={0.3} italic />
              </span>
              <span className="block">
                <span className="text-bone/40">
                  <GlitchText text="/" delay={0.7} />
                </span>
                <span className="text-signal">
                  <GlitchText text=" Younes" delay={0.8} />
                </span>
                <span
                  className={`align-middle inline-block w-3 md:w-5 h-[0.85em] bg-signal ml-2 md:ml-3 ${cursorOn ? 'opacity-100' : 'opacity-0'} transition-opacity duration-75`}
                  aria-hidden
                />
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="font-mono text-sm md:text-base text-bone/70 max-w-2xl mb-2"
            >
              <span className="text-hud">›</span>{" "}
              <span className="text-bone">ali@eternalreverse:~$</span>{" "}
              <span className="text-bone/85">{subtitleText}</span>
              <span className={`inline-block w-2 h-4 align-middle bg-bone/70 ml-0.5 ${cursorOn ? 'opacity-100' : 'opacity-0'}`} />
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 2.0 }}
              className="font-serif italic text-sm md:text-base text-bone/60 max-w-2xl mb-10"
            >
              CS &amp; Political Science · Northeastern University · Class of ’27
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="flex flex-wrap gap-3 mb-10"
            >
              <a
                href="#projects"
                data-hud-target="link"
                className="scan-beam-host group relative inline-flex items-center gap-3 px-6 py-3 bg-signal text-ink font-mono text-sm uppercase tracking-[0.2em] font-bold
                           border-2 border-signal hover:bg-transparent hover:text-signal transition-colors duration-200"
              >
                view work
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </a>
              <a
                href={pdf}
                download
                data-hud-target="link"
                className="scan-beam-host group relative inline-flex items-center gap-3 px-6 py-3 border-2 border-bone/40 text-bone
                           font-mono text-sm uppercase tracking-[0.2em] font-bold
                           hover:bg-bone hover:text-ink hover:border-bone transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                résumé
              </a>
              <a
                href="#contact"
                data-hud-target="link"
                className="scan-beam-host group relative inline-flex items-center gap-3 px-6 py-3 border-2 border-hud/40 text-hud/85
                           font-mono text-sm uppercase tracking-[0.2em] font-bold
                           hover:text-hud hover:border-hud transition-colors duration-200"
              >
                let’s talk
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </a>
            </motion.div>

            {/* Social */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="flex items-center gap-6"
            >
              <a
                href="https://github.com/whoisaldo"
                target="_blank"
                rel="noreferrer"
                data-hud-target="link"
                className="flex items-center gap-2 text-bone/60 hover:text-hud transition-colors font-mono text-xs uppercase tracking-[0.2em]"
              >
                <Github className="w-4 h-4" /> <span className="ink-underline">github</span>
              </a>
              <a
                href="https://www.linkedin.com/in/alialdoyounes/"
                target="_blank"
                rel="noreferrer"
                data-hud-target="link"
                className="flex items-center gap-2 text-bone/60 hover:text-hud transition-colors font-mono text-xs uppercase tracking-[0.2em]"
              >
                <Linkedin className="w-4 h-4" /> <span className="ink-underline">linkedin</span>
              </a>
              <a
                href="mailto:younes.al@northeastern.edu"
                data-hud-target="link"
                className="text-bone/60 hover:text-hud transition-colors font-mono text-xs uppercase tracking-[0.2em]"
              >
                ✉ <span className="ink-underline">email</span>
              </a>
            </motion.div>
          </div>

          {/* Right 4 cols — Vitals panel */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="lg:col-span-4 lg:mt-4"
          >
            <BracketFrame className="dossier-shell p-5 lg:p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="telemetry text-hud/85">// current_status</span>
                <span className="font-mono text-[10px] text-bone/35">v.05.10.26</span>
              </div>

              <div className="space-y-3 font-mono text-[12px]">
                <div className="flex items-center justify-between border-b border-bone/8 pb-2">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px]">clock</span>
                  <span className="text-hud font-bold tabular-nums">{clock}</span>
                </div>

                <div className="flex items-center justify-between border-b border-bone/8 pb-2">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> loc
                  </span>
                  <span className="text-bone">boston, ma</span>
                </div>

                <div className="flex items-center justify-between border-b border-bone/8 pb-2">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px]">coords</span>
                  <span className="text-bone/75 tabular-nums">42.3601°N 71.0589°W</span>
                </div>

                <div className="flex items-center justify-between border-b border-bone/8 pb-2">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px]">edition</span>
                  <span className="text-bone/75">IV — vol. xxvi</span>
                </div>

                <div className="flex items-center justify-between border-b border-bone/8 pb-2">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px]">subject</span>
                  <span className="text-bone/75">cs · polisci · neu ’27</span>
                </div>

                <div className="flex items-center justify-between border-b border-bone/8 pb-2">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px] flex items-center gap-1">
                    <Radio className="w-3 h-3" /> uplink
                  </span>
                  <span className="flex items-center gap-1.5 text-hud">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hud opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-hud" />
                    </span>
                    stable
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-bone/45 uppercase tracking-[0.2em] text-[10px]">now</span>
                  <span className="text-ember tracking-tight">⏵ aws_cfn // seattle</span>
                </div>
              </div>
            </BracketFrame>
          </motion.aside>
        </div>

        {/* Scroll prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 2.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] text-hud/60 uppercase">
            ▼ initialize_scroll
          </span>
          <span className="h-8 w-px bg-gradient-to-b from-hud/60 to-transparent animate-dot-drift" />
        </motion.div>
      </div>
    </section>
  );
}
