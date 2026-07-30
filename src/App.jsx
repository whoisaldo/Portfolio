// src/App.jsx — Cyberpunk-restrained Heads-Up Portfolio
import React, { useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar";
import Chrome from "./components/Chrome";
import Hero from "./components/Hero";
import ProjectsSection from "./components/projects/ProjectsSection";
import Experience from "./components/Experience";
import Terminal from "./components/Terminal";
import BootSequence from "./components/BootSequence";
import ErrorBoundary from "./components/ErrorBoundary";
import { Github, Linkedin, Download, ArrowRight } from "lucide-react";
import eternalReverseMark from "./assets/EternalReverse/EternalReverseMiniLogo.png";

export default function App() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      // Only reset when there is no deep link; otherwise this races the
      // browser's own hash scroll and dumps /#experience at the top.
      if (!window.location.hash) window.scrollTo(0, 0);
    }  }, []);

  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-ink text-bone font-mono">
      <BootSequence />

      <Navbar />
      <Chrome />

      <main>
        <Hero />
        <ProjectsSection />
        <Experience />
        <Terminal />

        {/* Resume — Personnel File */}
        <section id="resume" className="relative py-24 md:py-32 px-6 bg-ink border-t border-bone/10 grain">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="flex items-baseline justify-between gap-4 mb-10 border-b border-hud/15 pb-6"
            >
              <div className="flex items-baseline gap-6">
                <span className="font-display italic text-hud text-3xl lg:text-4xl leading-none">V.</span>
                <div>
                  <p className="font-mono text-[10px] tracking-editorial text-hud/70 uppercase mb-2">// personnel_file</p>
                  <h2 className="serif-display italic text-4xl md:text-6xl text-bone">résumé.</h2>
                </div>
              </div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45 hidden sm:block">[ .pdf · current ]</div>
            </motion.div>

            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-end pt-4">
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-serif italic text-bone/80 text-base md:text-lg max-w-xl leading-[1.6]"
              >
                <span className="text-signal not-italic">AWS CloudFormation</span> now, fresh off my <span className="text-bone not-italic">Philips co-op</span> &mdash; the current rundown of what I&rsquo;m working on and what I&rsquo;ve shipped.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="flex flex-wrap gap-3"
              >
                <a
                  href={pdf}
                  download
                  data-hud-target="link"
                  className="scan-beam-host group inline-flex items-center gap-3 px-6 py-3 bg-signal text-ink font-mono text-sm uppercase tracking-[0.2em] font-bold
                             border-2 border-signal hover:bg-transparent hover:text-signal transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  ▶ download_pdf
                </a>
                <a
                  href={pdf}
                  target="_blank"
                  rel="noreferrer"
                  data-hud-target="link"
                  className="scan-beam-host group inline-flex items-center gap-3 px-6 py-3 border-2 border-hud/40 text-hud
                             font-mono text-sm uppercase tracking-[0.2em] font-bold
                             hover:bg-hud/5 hover:border-hud transition-colors duration-200"
                >
                  ↗ view_in_browser
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact — Encrypted Channel */}
        <section id="contact" className="relative py-24 md:py-32 px-6 bg-ink border-t border-bone/10 grain">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="flex items-baseline justify-between gap-4 mb-12 border-b border-hud/15 pb-6"
            >
              <div className="flex items-baseline gap-6">
                <span className="font-display italic text-hud text-3xl lg:text-4xl leading-none">VI.</span>
                <div>
                  <p className="font-mono text-[10px] tracking-editorial text-hud/70 uppercase mb-2">// encrypted_channel</p>
                  <h2 className="serif-display italic text-4xl md:text-6xl text-bone">let's talk.</h2>
                </div>
              </div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45 hidden sm:block text-right">
                <div>◆ boston, ma</div>
                <div>⏵ seattle, wa — summer ’26</div>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-0 border border-bone/10">
              {/* Email column */}
              <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-bone/10">
                <div className="font-mono text-[10px] tracking-editorial uppercase text-hud/70 mb-6">// mail_channels</div>
                <dl className="space-y-4">
                  {[
                    { k: "primary", v: "younes.al@northeastern.edu", primary: true },
                    { k: "personal", v: "whois.younes@gmail.com" },
                    { k: "business", v: "Aliyounes@eternalreverse.com" },
                  ].map(({ k, v, primary }, i) => (
                    <motion.div
                      key={k}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="flex flex-col gap-1"
                    >
                      <dt className={`font-mono text-[10px] tracking-[0.22em] uppercase flex items-center gap-2 ${primary ? 'text-signal' : 'text-bone/55'}`}>
                        <span className="text-hud/70">▸</span>
                        {primary && <span aria-hidden className="h-1 w-1 rounded-full bg-signal animate-signal-ping" />}
                        {k}
                      </dt>
                      <dd>
                        <a
                          href={`mailto:${v}`}
                          className="font-mono text-sm md:text-base text-bone hover:text-signal transition-colors break-all"
                        >
                          <span className="ink-underline">{v}</span>
                        </a>
                      </dd>
                    </motion.div>
                  ))}
                </dl>
              </div>

              {/* Social column */}
              <div className="p-8 md:p-10">
                <div className="font-mono text-[10px] tracking-editorial uppercase text-hud/70 mb-6">// presence_nodes</div>
                <div className="flex flex-col gap-3">
                  <motion.a
                    href="https://github.com/whoisaldo"
                    target="_blank"
                    rel="noreferrer"
                    data-hud-target="link"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.6, delay: 0 }}
                    className="scan-beam-host group flex items-center justify-between px-4 py-3 border border-hud/25
                               hover:border-hud hover:bg-hud/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Github className="w-4 h-4 text-bone/60 group-hover:text-signal transition-colors" />
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-bone">GitHub</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-bone/40 group-hover:text-signal group-hover:translate-x-1 transition-all" />
                  </motion.a>
                  <motion.a
                    href="https://www.linkedin.com/in/alialdoyounes/"
                    target="_blank"
                    rel="noreferrer"
                    data-hud-target="link"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.6, delay: 0.08 }}
                    className="scan-beam-host group flex items-center justify-between px-4 py-3 border border-hud/25
                               hover:border-hud hover:bg-hud/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Linkedin className="w-4 h-4 text-bone/60 group-hover:text-signal transition-colors" />
                      <span className="font-mono text-sm uppercase tracking-[0.2em] text-bone">LinkedIn</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-bone/40 group-hover:text-signal group-hover:translate-x-1 transition-all" />
                  </motion.a>
                  <motion.a
                    href="mailto:younes.al@northeastern.edu"
                    data-hud-target="link"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.6, delay: 0.16 }}
                    className="scan-beam-host group flex items-center justify-between px-4 py-3 border-2 border-signal
                               bg-signal text-ink hover:bg-transparent hover:text-signal transition-colors"
                  >
                    <span className="font-mono text-sm uppercase tracking-[0.2em] font-bold">
                      ▶ send_a_message
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — System Idle */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="border-t border-hud/15 bg-ink grain relative"
      >
        <div className="absolute inset-x-0 top-0 hud-rule" aria-hidden />
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={eternalReverseMark}
              alt="Eternal Reverse"
              className="h-8 w-auto opacity-70"
            />
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bone/50">
              <div className="text-bone/70">eternalreverse.system</div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hud opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-hud" />
                </span>
                <span>▮ system_idle · ali younes · {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.22em]">
            <a href="https://github.com/whoisaldo" target="_blank" rel="noreferrer"
               className="text-bone/55 hover:text-signal transition-colors">
              <span className="ink-underline">github</span>
            </a>
            <a href="https://www.linkedin.com/in/alialdoyounes/" target="_blank" rel="noreferrer"
               className="text-bone/55 hover:text-signal transition-colors">
              <span className="ink-underline">linkedin</span>
            </a>
            <a href="mailto:younes.al@northeastern.edu"
               className="text-bone/55 hover:text-signal transition-colors">
              <span className="ink-underline">email</span>
            </a>
            <span className="hidden md:inline text-bone/25">/</span>
            <span className="hidden md:inline text-bone/45">v05.10.26</span>
          </div>
        </div>
      </motion.footer>

    </div>
    </MotionConfig>
    </ErrorBoundary>
  );
}
