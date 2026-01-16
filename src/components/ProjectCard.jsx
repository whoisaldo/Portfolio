// src/components/ProjectCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

export default function ProjectCard({ project, index }) {
  const { title, description, tech, href, github, image, colSpan = 1 } = project;

  // Map colSpan to Tailwind classes
  const colSpanClasses = {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className={`group relative col-span-1 ${colSpanClasses[colSpan] || colSpanClasses[1]} rounded-3xl 
                  backdrop-blur-xl bg-midnight-dark/60 border border-electric-blue/20 
                  p-8 overflow-hidden cursor-pointer
                  hover:border-electric-blue/50 hover:shadow-electric
                  transition-all duration-500`}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-electric-blue/10 to-electric-cyan/10 opacity-0 
                   group-hover:opacity-100 transition-opacity duration-500"
      />
      
      {/* Tilt effect on hover */}
      <motion.div
        className="relative z-10 h-full flex flex-col"
        whileHover={{ rotateX: -2, rotateY: 2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {image && (
          <div className="mb-6 rounded-2xl overflow-hidden aspect-video">
            <motion.img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-electric-blue transition-colors">
            {title}
          </h3>
          
          <p className="text-neutral-400 mb-6 flex-1 leading-relaxed">
            {description}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {tech?.slice(0, 4).map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs font-medium rounded-full 
                           bg-electric-blue/10 text-electric-blue border border-electric-blue/30
                           group-hover:bg-electric-blue/20 group-hover:border-electric-blue/50
                           transition-all duration-300"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-auto">
            {github && (
              <motion.a
                href={github}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.05, x: 5 }}
                className="flex items-center gap-2 text-neutral-400 hover:text-electric-blue 
                           transition-colors text-sm font-medium"
              >
                <span>GitHub</span>
                <ExternalLink size={16} />
              </motion.a>
            )}
            {href && (
              <motion.a
                href={href}
                target="_blank"
                rel="noreferrer"
                whileHover={{ scale: 1.05, x: 5 }}
                className="flex items-center gap-2 text-electric-blue font-semibold text-sm"
              >
                <span>Live Demo</span>
                <ExternalLink size={16} />
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-electric-blue/20 to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}

