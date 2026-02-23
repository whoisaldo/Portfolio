// src/components/About.jsx
import React from "react";
import MotionSection from "./MotionSection";
import { Car, Dumbbell, Gamepad2, Globe, Brain, Puzzle, Terminal } from "lucide-react";
import personalPhoto from "../assets/personal pictures/PersonalFacePictureNEW.png";
import PhilipsLogo from "../assets/PreviousExperience/PhilipsLogo.svg";

export default function About() {

  return (
    <MotionSection id="about" className="max-w-6xl mx-auto px-4 py-16 md:py-20" aria-labelledby="about-heading">
      {/* Hero Section with Photo, Intro, and Quick Facts */}
      <div className="text-center mb-16">
        <div className="flex flex-col lg:flex-row items-start gap-12">
          {/* Personal Photo */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
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
            <div className="flex items-baseline justify-between mb-6 max-w-2xl">
              <h2 id="about-heading" className="font-display text-3xl md:text-4xl font-bold tracking-tight gradient-heading">
                About Me
              </h2>
              <img 
                src={PhilipsLogo} 
                alt="Philips" 
                className="h-20 w-auto opacity-80 hover:opacity-100 transition-opacity duration-200 flex-shrink-0"
              />
            </div>
            <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-2xl mb-8">
              I'm a software engineer and architect studying Computer Science & Political Science at Northeastern University (Class of 2027). I specialize in building highly scalable enterprise systems, automated deployment pipelines, and high-performance full-stack applications. Beyond engineering robust solutions, I enjoy German automotive tuning, competitive wrestling, and pushing the limits of game development in my free time.
            </p>

            {/* Integrated Quick Facts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Terminal size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Architecting robust backend APIs and highly optimized, modern frontend interfaces.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Gamepad2 size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Engineering advanced game mechanics and immersive virtual environments.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Car size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Passionate about high-performance automotive engineering and tuning.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Dumbbell size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Competitive wrestling & fitness: discipline, resilience, and continuous growth.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Puzzle size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Analytical problem solver thriving on complex algorithmic and logic challenges.
                </span>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mt-0.5">
                  <Globe size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Global perspective, eager to continuously learn and embrace new challenges.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </MotionSection>
  );
}
