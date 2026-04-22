// src/App.jsx — Editorial brutalist composition
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import BentoProjects from "./components/BentoProjects";
import Experience from "./components/Experience";

import Terminal from "./components/Terminal";
import { Github, Linkedin, Download, ArrowRight } from "lucide-react";
import eternalReverseMark from "./assets/EternalReverse/EternalReverseMiniLogo.png";

export default function App() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";
  const [showResumeButton, setShowResumeButton] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
    const handleScroll = () => setShowResumeButton(window.scrollY > 800);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-ink text-bone font-mono">
      <Navbar />

      <main>
        <Hero />
        <BentoProjects />
        <Experience />
<Terminal />

        {/* Resume */}
        <section id="resume" className="relative py-24 md:py-32 px-6 bg-ink border-t border-bone/10 grain">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-baseline justify-between gap-4 mb-10">
              <div>
                <div className="mono-label text-signal/80 mb-2">§ 05 — Document</div>
                <h2 className="serif-display italic text-4xl md:text-6xl text-bone">résumé.</h2>
              </div>
              <div className="mono-label text-bone/45 hidden sm:block">.pdf · current</div>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-end border-t border-bone/10 pt-10">
              <p className="text-bone/70 text-sm md:text-base max-w-xl leading-relaxed">
                One page. <span className="text-bone">Philips co-op</span>, incoming <span className="text-signal">AWS ADC</span>,
                a running inventory of what I've shipped. Updated April 2026.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href={pdf}
                  download
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-signal text-ink font-mono text-sm uppercase tracking-[0.2em] font-bold
                             border-2 border-signal hover:bg-transparent hover:text-signal transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
                <a
                  href={pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-3 px-6 py-3 border-2 border-bone/40 text-bone
                             font-mono text-sm uppercase tracking-[0.2em] font-bold
                             hover:bg-bone hover:text-ink hover:border-bone transition-colors duration-200"
                >
                  View in Browser
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="relative py-24 md:py-32 px-6 bg-ink border-t border-bone/10 grain">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between gap-4 mb-12">
              <div>
                <div className="mono-label text-signal/80 mb-2">§ 06 — Contact</div>
                <h2 className="serif-display italic text-4xl md:text-6xl text-bone">let's talk.</h2>
              </div>
              <div className="mono-label text-bone/45 hidden sm:block text-right">
                <div>boston, ma</div>
                <div>seattle, wa — summer ’26</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-0 border-t border-bone/10">
              {/* Email column */}
              <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-bone/10">
                <div className="mono-label text-bone/50 mb-6">// mail</div>
                <dl className="space-y-4">
                  {[
                    { k: "primary", v: "younes.al@northeastern.edu" },
                    { k: "personal", v: "whois.younes@gmail.com" },
                    { k: "business", v: "Aliyounes@eternalreverse.com" },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex flex-col gap-1">
                      <dt className="mono-label text-bone/35">{k}</dt>
                      <dd>
                        <a
                          href={`mailto:${v}`}
                          className="font-mono text-sm md:text-base text-bone hover:text-signal transition-colors break-all"
                        >
                          {v}
                        </a>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Social column */}
              <div className="p-8 md:p-10">
                <div className="mono-label text-bone/50 mb-6">// presence</div>
                <div className="flex flex-col gap-3">
                  <a
                    href="https://github.com/whoisaldo"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between px-4 py-3 border border-bone/15
                               hover:border-signal hover:bg-signal/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Github className="w-4 h-4 text-bone/60 group-hover:text-signal transition-colors" />
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-bone">GitHub</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-bone/40 group-hover:text-signal group-hover:translate-x-1 transition-all" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/ali-younes-41a2b4296/"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between px-4 py-3 border border-bone/15
                               hover:border-signal hover:bg-signal/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Linkedin className="w-4 h-4 text-bone/60 group-hover:text-signal transition-colors" />
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-bone">LinkedIn</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-bone/40 group-hover:text-signal group-hover:translate-x-1 transition-all" />
                  </a>
                  <a
                    href="mailto:younes.al@northeastern.edu"
                    className="group flex items-center justify-between px-4 py-3 border-2 border-signal
                               bg-signal text-ink hover:bg-transparent hover:text-signal transition-colors"
                  >
                    <span className="font-mono text-sm uppercase tracking-[0.2em] font-bold">
                      Send a message ↘
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-bone/10 bg-ink grain">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={eternalReverseMark}
              alt="Eternal Reverse"
              className="h-8 w-auto opacity-70"
            />
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bone/50">
              <div className="text-bone/70">eternalreverse</div>
              <div>Ali Younes · {new Date().getFullYear()}</div>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.22em]">
            <a href="https://github.com/whoisaldo" target="_blank" rel="noreferrer"
               className="text-bone/55 hover:text-signal transition-colors">
              github
            </a>
            <a href="https://www.linkedin.com/in/ali-younes-41a2b4296/" target="_blank" rel="noreferrer"
               className="text-bone/55 hover:text-signal transition-colors">
              linkedin
            </a>
            <a href="mailto:younes.al@northeastern.edu"
               className="text-bone/55 hover:text-signal transition-colors">
              email
            </a>
            <span className="hidden md:inline text-bone/25">/</span>
            <span className="hidden md:inline text-bone/35">v04.20.26</span>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showResumeButton && (
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            href={pdf}
            download="Ali_Younes_Resume.pdf"
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3
                       bg-signal text-ink font-mono text-xs uppercase tracking-[0.2em] font-bold
                       border-2 border-signal hover:bg-ink hover:text-signal transition-colors"
          >
            <Download className="w-4 h-4" />
            Résumé ↘
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
