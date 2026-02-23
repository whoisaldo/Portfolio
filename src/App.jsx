// src/App.jsx - OPTIMIZED
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import BentoProjects from "./components/BentoProjects";
import Experience from "./components/Experience";
import TechStackMarquee from "./components/TechStackMarquee";
import Terminal from "./components/Terminal";
import { Github, Linkedin, Mail, Phone, Download } from "lucide-react";

export default function App() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";
  const [showResumeButton, setShowResumeButton] = useState(false);

  // Always start at top on load; prevent scroll restoration from previous visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
    
    const handleScroll = () => {
      setShowResumeButton(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-neutral-100">
      <Navbar />
      
      <main>
        <Hero />
        
        {/* Skills at a Glance */}
        <section className="py-12 px-6 bg-[#0a0a0f] border-b border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="p-4 rounded-xl bg-[#12121a]/70 border border-red-500/20 hover:border-red-500/40 transition-colors">
                <div className="text-2xl font-black text-red-400 mb-1">React/TS</div>
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Frontend Architecture</div>
              </div>
              <div className="p-4 rounded-xl bg-[#12121a]/70 border border-red-500/20 hover:border-red-500/40 transition-colors">
                <div className="text-2xl font-black text-red-400 mb-1">Node.js</div>
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Backend Scaling</div>
              </div>
              <div className="p-4 rounded-xl bg-[#12121a]/70 border border-red-500/20 hover:border-red-500/40 transition-colors">
                <div className="text-2xl font-black text-red-400 mb-1">C# / .NET</div>
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Enterprise Systems</div>
              </div>
              <div className="p-4 rounded-xl bg-[#12121a]/70 border border-red-500/20 hover:border-red-500/40 transition-colors">
                <div className="text-2xl font-black text-red-400 mb-1">DevOps</div>
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Cloud & CI/CD</div>
              </div>
              <div className="p-4 rounded-xl bg-[#12121a]/70 border border-red-500/20 hover:border-red-500/40 transition-colors md:col-span-1 col-span-2">
                <div className="text-2xl font-black text-red-400 mb-1">C++</div>
                <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">High-Performance</div>
              </div>
            </div>
          </div>
        </section>

        <BentoProjects />
        <Experience />
        <TechStackMarquee />
        <Terminal />

        {/* Resume Section */}
        <section id="resume" className="py-24 md:py-28 px-6 bg-[#0a0a0f]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
              Resume
            </h2>
            <p className="text-neutral-400 mb-8 max-w-xl mx-auto">
              Download my resume to learn more about my experience and skills
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={pdf}
                download
                className="px-6 py-3 rounded-full text-white font-semibold 
                           bg-gradient-to-r from-red-500 to-rose-500 
                           shadow-[0_0_30px_-8px_rgba(239,68,68,0.5)]
                           hover:shadow-[0_0_40px_-8px_rgba(239,68,68,0.7)]
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                Download PDF
              </a>
              <a
                href={pdf}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-full text-white font-semibold 
                           border border-red-500/50 hover:border-red-500 hover:bg-red-500/10
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                View in Browser
              </a>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 md:py-28 px-6 bg-[#0a0a0f]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
                Let's Connect
              </h2>
              <p className="text-neutral-400 max-w-xl mx-auto">
                I'm always interested in new opportunities and collaborations
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                Based in Boston, MA · Open to internships/part-time
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Contact Info */}
              <div className="p-5 rounded-xl bg-[#12121a]/70 border border-white/5 hover:border-red-500/20 transition-colors">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-500" />
                  Get in Touch
                </h3>
                <div className="space-y-3">
                  <a href="mailto:younes.al@northeastern.edu" className="flex items-center gap-3 text-neutral-400 hover:text-red-400 transition-colors text-sm">
                    younes.al@northeastern.edu
                  </a>
                  <a href="mailto:whois.younes@gmail.com" className="flex items-center gap-3 text-neutral-400 hover:text-red-400 transition-colors text-sm">
                    whois.younes@gmail.com
                  </a>
                  <a href="tel:+14134099563" className="flex items-center gap-3 text-neutral-400 hover:text-red-400 transition-colors text-sm">
                    <Phone className="w-4 h-4" />
                    (413) 409-9563
                  </a>
                </div>
              </div>

              {/* Social Links */}
              <div className="p-5 rounded-xl bg-[#12121a]/70 border border-white/5 hover:border-red-500/20 transition-colors">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Github className="w-5 h-5 text-red-500" />
                  Connect Online
                </h3>
                <div className="space-y-2">
                  <a
                    href="https://github.com/whoisaldo"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
                               hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                  >
                    <Github className="w-5 h-5 text-neutral-400" />
                    <span className="text-neutral-300 font-medium">GitHub</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/ali-younes-41a2b4296/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
                               hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                  >
                    <Linkedin className="w-5 h-5 text-neutral-400" />
                    <span className="text-neutral-300 font-medium">LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-neutral-500 text-sm">
            © {new Date().getFullYear()} Ali Younes. Built with React & Tailwind.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://github.com/whoisaldo" target="_blank" rel="noreferrer" 
               className="text-neutral-500 hover:text-red-400 transition-colors text-sm">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/ali-younes-41a2b4296/" target="_blank" rel="noreferrer"
               className="text-neutral-500 hover:text-red-400 transition-colors text-sm">
              LinkedIn
            </a>
            <a href="mailto:younes.al@northeastern.edu"
               className="text-neutral-500 hover:text-red-400 transition-colors text-sm">
              Email
            </a>
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
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full 
                       bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold text-sm
                       shadow-[0_0_40px_-8px_rgba(239,68,68,0.6)] hover:shadow-[0_0_50px_-8px_rgba(239,68,68,0.8)]
                       hover:-translate-y-1 transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Resume
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
