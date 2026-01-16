// src/App.jsx - OPTIMIZED
import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import BentoProjects from "./components/BentoProjects";
import Experience from "./components/Experience";
import TechStackMarquee from "./components/TechStackMarquee";
import Terminal from "./components/Terminal";
import { Github, Linkedin, Mail, Phone } from "lucide-react";

export default function App() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-neutral-100">
      <Navbar />
      
      <main>
        <Hero />
        <BentoProjects />
        <Experience />
        <TechStackMarquee />
        <Terminal />

        {/* Resume Section */}
        <section id="resume" className="py-20 px-6 bg-[#0a0a0f]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
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
                           bg-gradient-to-r from-purple-500 to-fuchsia-500 
                           shadow-[0_0_30px_-8px_rgba(168,85,247,0.5)]
                           hover:shadow-[0_0_40px_-8px_rgba(168,85,247,0.7)]
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                Download PDF
              </a>
              <a
                href={pdf}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-full text-white font-semibold 
                           border border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10
                           hover:-translate-y-0.5 transition-all duration-200"
              >
                View in Browser
              </a>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 px-6 bg-[#0a0a0f]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
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
              <div className="p-5 rounded-xl bg-[#12121a]/70 border border-white/5 hover:border-purple-500/20 transition-colors">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-500" />
                  Get in Touch
                </h3>
                <div className="space-y-3">
                  <a href="mailto:younes.al@northeastern.edu" className="flex items-center gap-3 text-neutral-400 hover:text-purple-400 transition-colors text-sm">
                    younes.al@northeastern.edu
                  </a>
                  <a href="mailto:whois.younes@gmail.com" className="flex items-center gap-3 text-neutral-400 hover:text-purple-400 transition-colors text-sm">
                    whois.younes@gmail.com
                  </a>
                  <a href="tel:+14134099563" className="flex items-center gap-3 text-neutral-400 hover:text-purple-400 transition-colors text-sm">
                    <Phone className="w-4 h-4" />
                    (413) 409-9563
                  </a>
                </div>
              </div>

              {/* Social Links */}
              <div className="p-5 rounded-xl bg-[#12121a]/70 border border-white/5 hover:border-purple-500/20 transition-colors">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Github className="w-5 h-5 text-purple-500" />
                  Connect Online
                </h3>
                <div className="space-y-2">
                  <a
                    href="https://github.com/whoisaldo"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
                               hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
                  >
                    <Github className="w-5 h-5 text-neutral-400" />
                    <span className="text-neutral-300 font-medium">GitHub</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/ali-younes-41a2b4296/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 
                               hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
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
               className="text-neutral-500 hover:text-purple-400 transition-colors text-sm">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/ali-younes-41a2b4296/" target="_blank" rel="noreferrer"
               className="text-neutral-500 hover:text-purple-400 transition-colors text-sm">
              LinkedIn
            </a>
            <a href="mailto:younes.al@northeastern.edu"
               className="text-neutral-500 hover:text-purple-400 transition-colors text-sm">
              Email
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
