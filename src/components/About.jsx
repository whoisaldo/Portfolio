// src/components/About.jsx
import React from "react";
import MotionSection from "./MotionSection";
import { Car, Dumbbell, Gamepad2, Globe, Brain, Puzzle, Terminal } from "lucide-react";

export default function About() {
  return (
    <MotionSection id="about" className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-bold">About Me</h2>
      <p className="mt-3 text-neutral-700 dark:text-neutral-300 max-w-3xl">
        I’m a Lebanese-American developer from Massachusetts, studying Computer Science & Political Science
        at Northeastern (Class of 2027). I love building polished, human-friendly software—from full-stack web apps
        to game prototypes. Outside the editor: cars, the gym, wrestling, soccer, and any puzzle I can get my hands on.
        I also love to travel and explore new ideas.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {/* Quick facts */}
        <div className="group rounded-2xl border border-gray-200/50 dark:border-gray-700/50 
                        bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl p-8 
                        shadow-lg hover:shadow-xl transition-all duration-300
                        hover:border-gray-300/50 dark:hover:border-gray-600/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500">
              <Brain size={20} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Facts</h3>
          </div>
          <ul className="space-y-4">
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 mt-0.5">
                <Terminal size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Full-stack dev who enjoys both frontend polish and backend APIs.
              </span>
            </li>
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 mt-0.5">
                <Gamepad2 size={16} className="text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Game dev fan — experienced with Roblox Studio (Lua), Unity basics (C#).
              </span>
            </li>
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                <Car size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Car enthusiast — German cars, performance, and clean builds.
              </span>
            </li>
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30 mt-0.5">
                <Dumbbell size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Gym + wrestling mentality: consistent reps, steady progress.
              </span>
            </li>
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 mt-0.5">
                <Puzzle size={16} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Rubik's Cube, chess, and logic puzzles for fun.
              </span>
            </li>
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                <Globe size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Love to travel and learn from different cultures.
              </span>
            </li>
            <li className="flex items-start gap-4 group/item">
              <div className="p-1.5 rounded-md bg-pink-100 dark:bg-pink-900/30 mt-0.5">
                <Brain size={16} className="text-pink-600 dark:text-pink-400" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Interested in systems, reasoning, and clean abstractions.
              </span>
            </li>
          </ul>
        </div>

        {/* Tech stack */}
        <div className="group rounded-2xl border border-gray-200/50 dark:border-gray-700/50 
                        bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl p-8 
                        shadow-lg hover:shadow-xl transition-all duration-300
                        hover:border-gray-300/50 dark:hover:border-gray-600/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500">
              <Terminal size={20} className="text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">What I Work With</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              "React", "Vite", "Tailwind CSS", "Node.js", "Express",
              "MongoDB", "Java", "C++", "C#", "Lua (Roblox)", "TypeScript", "Git/GitHub",
            ].map((item) => (
              <span
                key={item}
                className="group/tag rounded-full border border-gray-200 dark:border-gray-700 
                           px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300
                           bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50
                           hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200
                           hover:scale-105 hover:shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 
                          dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200/50 
                          dark:border-indigo-700/50">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Currently building <strong className="text-indigo-600 dark:text-indigo-400">Exerly Fitness</strong>: 
              sleep tracking, calorie counter, maintenance calculator, and more—full-stack with auth and dashboards.
            </p>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
