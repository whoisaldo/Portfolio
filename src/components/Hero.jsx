// src/components/Hero.jsx - OPTIMIZED
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Download, ArrowRight } from "lucide-react";

export default function Hero() {
  const pdf = (import.meta.env.BASE_URL || '/') + "resume.pdf";

  // Terminal typing effect state
  const [prefixText, setPrefixText] = useState("");
  const [nameText, setNameText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const prefix = "Hi, I'm ";
    const name = "Ali";
    let pIdx = 0;
    let nIdx = 0;

    const typeNext = () => {
      if (pIdx < prefix.length) {
        setPrefixText(prefix.slice(0, pIdx + 1));
        pIdx++;
        setTimeout(typeNext, 60); // typing speed
      } else if (nIdx < name.length) {
        setNameText(name.slice(0, nIdx + 1));
        nIdx++;
        setTimeout(typeNext, 120); // slightly slower for the name
      }
    };

    const startTimeout = setTimeout(typeNext, 500); // initial delay
    return () => clearTimeout(startTimeout);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Static gradient orbs - NO ANIMATION, just CSS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 -left-32 w-[400px] h-[400px] rounded-full opacity-60 blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full opacity-50 blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.35) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-40 blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)' }}
        />
      </div>

      {/* Grid pattern - static */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(239,68,68,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.08) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 30%, transparent 100%)'
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full"
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid rgba(239, 68, 68, 0.4)' 
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-sm font-medium text-red-300">
            Software Engineering (System Integration and Automation) @ Philips
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 flex items-center justify-center min-h-[1.2em]"
        >
          <span>
            <span className="text-white">{prefixText}</span>
            <span className="bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
              {nameText}
            </span>
            <span 
              className={`text-red-500 font-mono ml-1 md:ml-2 ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
              style={{ textShadow: '0 0 15px rgba(239, 68, 68, 0.8)' }}
            >
              _
            </span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Architecting scalable enterprise infrastructure & high-performance full-stack applications.<br/>
          Computer Science @ Northeastern University (Class of 2027).
        </motion.p>

        {/* CTA Buttons - simple CSS hover */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-12"
        >
          <a
            href="#projects"
            className="group flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold 
                       bg-gradient-to-r from-red-500 to-rose-500 
                       shadow-[0_0_30px_-8px_rgba(239,68,68,0.5)]
                       hover:shadow-[0_0_40px_-8px_rgba(239,68,68,0.7)]
                       hover:-translate-y-0.5 active:translate-y-0
                       transition-all duration-200"
          >
            View My Work
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </a>
          
          <a
            href={pdf}
            download
            className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold 
                       border border-red-500/50 hover:border-red-500 hover:bg-red-500/10
                       hover:-translate-y-0.5 active:translate-y-0
                       transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Resume
          </a>
        </motion.div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex items-center justify-center gap-4"
        >
          <a
            href="https://github.com/whoisaldo"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-full bg-white/5 border border-white/10 
                       hover:bg-red-500/20 hover:border-red-500/50
                       transition-colors duration-200"
          >
            <Github className="w-5 h-5 text-neutral-300" />
          </a>
          <a
            href="https://www.linkedin.com/in/ali-younes-41a2b4296/"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-full bg-white/5 border border-white/10 
                       hover:bg-red-500/20 hover:border-red-500/50
                       transition-colors duration-200"
          >
            <Linkedin className="w-5 h-5 text-neutral-300" />
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator - CSS animation only */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-red-500/50 flex justify-center pt-2">
          <div className="w-1 h-2 rounded-full bg-red-500" />
        </div>
      </div>
    </section>
  );
}
