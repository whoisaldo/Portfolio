// src/components/Resume.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, ExternalLink } from "lucide-react";

export default function Resume() {
  const pdf = "/resume.pdf";
  const [useIframe, setUseIframe] = useState(true);

  return (
    <section id="resume" className="relative py-28 px-6 bg-[#0a0a0f]">
      {/* Background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-400">Resume</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
            My Resume
          </h2>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Quick preview + one-click download
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-10"
        >
          <a
            href={pdf}
            download="Ali_Younes_Resume.pdf"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all hover:-translate-y-1"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #f43f5e)',
              boxShadow: '0 10px 40px -10px rgba(168, 85, 247, 0.5)'
            }}
          >
            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Download PDF
          </a>
          <a
            href={pdf}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-all hover:-translate-y-1"
          >
            <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Open in New Tab
          </a>
        </motion.div>

        {/* PDF Viewer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl overflow-hidden border border-red-500/20"
          style={{ backgroundColor: '#0f0f18' }}
        >
          {/* Viewer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/20 bg-black/30">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-sm text-neutral-400 font-mono">resume.pdf</span>
            <div className="w-16" />
          </div>

          {/* PDF Content */}
          <div className="h-[700px] md:h-[900px] bg-neutral-900">
            <iframe
              src={pdf}
              className="w-full h-full"
              title="Ali Younes Resume"
              style={{ border: 'none' }}
            />
          </div>
        </motion.div>

        {/* Fallback */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          PDF not loading?{" "}
          <a 
            href={pdf} 
            target="_blank" 
            rel="noreferrer"
            className="text-red-400 hover:text-red-300 underline"
          >
            Open in new tab
          </a>
          {" "}or{" "}
          <a 
            href={pdf} 
            download="Ali_Younes_Resume.pdf"
            className="text-red-400 hover:text-red-300 underline"
          >
            download directly
          </a>
        </p>
      </div>
    </section>
  );
}
