// src/components/About.jsx
import React from "react";
import MotionSection from "./MotionSection";
import { Car, Dumbbell, Gamepad2, Globe, Brain, Puzzle, Terminal } from "lucide-react";
import personalPhoto from "../assets/personal pictures/PersonalFacePicture.jpg";

export default function About() {

  return (
    <MotionSection id="about" className="max-w-6xl mx-auto px-4 py-16 md:py-20" aria-labelledby="about-heading">
      {/* Hero Section with Photo, Intro, and Quick Facts */}
      <div className="text-center mb-16">
        <div className="flex flex-col lg:flex-row items-start gap-12">
          {/* Personal Photo */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative shadow-[0_0_80px_rgba(99,102,241,0.25)]">
                <img 
                  src={personalPhoto} 
                  alt="Ali Younes" 
                  className="w-64 h-64 rounded-2xl object-cover shadow-2xl border-4 border-white dark:border-gray-800
                             group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          {/* Introduction Text and Quick Facts */}
          <div className="flex-1 text-left lg:text-left">
            <h2 id="about-heading" className="font-display text-3xl md:text-4xl font-bold tracking-tight gradient-heading mb-6">
              About Me
            </h2>
            <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-2xl mb-8">
              I'm a Lebanese-American developer from Massachusetts, studying Computer Science & Political Science
              at Northeastern (Class of 2027). I love building polished, intuitive software—from full-stack web apps
              to game prototypes. Outside the editor: cars, the gym, wrestling, soccer, and any puzzle I can get my hands on.
              I also love to travel and explore new ideas.
            </p>

            {/* Integrated Quick Facts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 mt-0.5">
                  <Terminal size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Full-stack dev who enjoys both frontend polish and backend APIs.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 mt-0.5">
                  <Gamepad2 size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Game dev fan — experienced with Roblox Studio (Lua), Unity basics (C#).
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Car size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Car enthusiast — German cars, performance, and clean builds.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30 mt-0.5">
                  <Dumbbell size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Gym + wrestling mentality: consistent reps, steady progress.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 mt-0.5">
                  <Puzzle size={16} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Rubik's Cube, chess, and logic puzzles for fun.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                  <Globe size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Love to travel and learn from different cultures.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </MotionSection>
  );
}
