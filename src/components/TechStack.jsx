// src/components/TechStack.jsx
import React from "react";
import { motion } from "framer-motion";
import MotionSection from "./MotionSection";
import { Code2, Server, Database, Wrench, FileText } from "lucide-react";

export default function TechStack() {
  const techGroups = [
    {
      title: "Frontend",
      icon: Code2,
      items: ["React", "TypeScript", "Vite", "Tailwind", "React Router", "MUI"]
    },
    {
      title: "Backend", 
      icon: Server,
      items: ["Node.js", "Express", "REST APIs"]
    },
    {
      title: "Databases",
      icon: Database,
      items: ["MongoDB (Atlas, Mongoose)", "PostgreSQL", "MySQL"]
    },
    {
      title: "DevOps & Tools",
      icon: Wrench,
      items: ["Git/GitHub", "Heroku", "JWT", "Linux", "Docker"]
    },
    {
      title: "Languages",
      icon: FileText,
      items: ["TypeScript", "JavaScript", "Python", "Java", "C++", "C#", "SQL", "Lua (Roblox)", "Racket"]
    }
  ];

  return (
    <MotionSection id="tech-stack" className="max-w-6xl mx-auto px-4 py-16 md:py-20" aria-labelledby="tech-stack-heading">
      <h2 id="tech-stack-heading" className="text-3xl md:text-4xl font-bold tracking-tight gradient-heading mb-12">
        Tech Stack
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl">
        Technologies and tools I work with to build modern, scalable applications.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {techGroups.map((group, index) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            viewport={{ once: true, margin: "-50px" }}
            className="card hover:border-red-400/40 hover:shadow-red-500/20 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500">
                <group.icon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {group.title}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 rounded-full text-sm bg-white/5 border border-white/10
                             text-gray-700 dark:text-gray-300 hover:bg-white/10 
                             transition-colors duration-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </MotionSection>
  );
}
