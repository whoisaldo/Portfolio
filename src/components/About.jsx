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

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {/* Quick facts */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 backdrop-blur p-6">
          <h3 className="font-semibold">Quick Facts</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Terminal size={16} className="opacity-70" />
              Full-stack dev who enjoys both frontend polish and backend APIs.
            </li>
            <li className="flex items-center gap-3">
              <Gamepad2 size={16} className="opacity-70" />
              Game dev fan — experienced with Roblox Studio (Lua), Unity basics (C#).
            </li>
            <li className="flex items-center gap-3">
              <Car size={16} className="opacity-70" />
              Car enthusiast — German cars, performance, and clean builds.
            </li>
            <li className="flex items-center gap-3">
              <Dumbbell size={16} className="opacity-70" />
              Gym + wrestling mentality: consistent reps, steady progress.
            </li>
            <li className="flex items-center gap-3">
              <Puzzle size={16} className="opacity-70" />
              Rubik’s Cube, chess, and logic puzzles for fun.
            </li>
            <li className="flex items-center gap-3">
              <Globe size={16} className="opacity-70" />
              Love to travel and learn from different cultures.
            </li>
            <li className="flex items-center gap-3">
              <Brain size={16} className="opacity-70" />
              Interested in systems, reasoning, and clean abstractions.
            </li>
          </ul>
        </div>

        {/* Tech stack */}
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 backdrop-blur p-6">
          <h3 className="font-semibold">What I Work With</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "React", "Vite", "Tailwind CSS", "Node.js", "Express",
              "MongoDB", "Java", "C++", "C#", "Lua (Roblox)", "TypeScript", "Git/GitHub",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1 text-xs
                           bg-white/60 dark:bg-neutral-800/60"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-6 text-sm">
            <p>
              Currently building <strong>Exerly Fitness</strong>: sleep tracking, calorie counter,
              maintenance calculator, and more—full-stack with auth and dashboards.
            </p>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
