// src/components/Interests.jsx
import React, { useState, useEffect } from "react";
import MotionSection from "./MotionSection";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import bmwEngine from "../assets/personal pictures/BMWengineTuningFullpicture.jpg";
import bmwModule from "../assets/personal pictures/BMWTuningModule.jpg";
import wrestlingPhoto from "../assets/personal pictures/WrestlingPicture.jpg";
import computerBuild from "../assets/personal pictures/ComputerBuilds.jpg";
import sumoBot from "../assets/personal pictures/CornerstoneEngineeringSumoWrestlingBot.png";
import robloxGame from "../assets/personal pictures/RobloxGameDevelopment.png";
import carplayRetrofit from "../assets/personal pictures/CarplayRetrofitting.JPG";

export default function Interests() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const slideshowData = [
    {
      image: bmwEngine,
      title: "BMW Engine Tuning",
      description: "Passionate about German automotive engineering and performance tuning. Working on ECU modifications and understanding the mechanics behind high-performance engines.",
      gradient: "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
      textColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      image: wrestlingPhoto,
      title: "Wrestling Training",
      description: "Competitive wrestling builds discipline, mental toughness, and physical strength. The sport teaches me about strategy, quick thinking, and pushing through challenges.",
      gradient: "from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20",
      textColor: "text-red-600 dark:text-red-400"
    },
    {
      image: computerBuild,
      title: "Computer Builds",
      description: "Building custom PCs from scratch, optimizing performance, and understanding hardware. It's like solving puzzles with components to create the perfect system.",
      gradient: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
      textColor: "text-blue-600 dark:text-blue-400"
    },
    {
      image: bmwModule,
      title: "Tuning Module",
      description: "Working with aftermarket tuning modules to enhance vehicle performance. Learning about engine management systems and the science of automotive optimization.",
      gradient: "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
      textColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      image: sumoBot,
      title: "Sumo Wrestling Bot",
      description: "Engineering project building autonomous sumo wrestling robots. Combines mechanical design, programming, and strategy in competitive robotics.",
      gradient: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      textColor: "text-purple-600 dark:text-purple-400"
    },
    {
      image: robloxGame,
      title: "Roblox Game Development",
      description: "Creating immersive games and experiences in Roblox Studio using Lua scripting. Building interactive worlds, game mechanics, and engaging gameplay systems.",
      gradient: "from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
      textColor: "text-orange-600 dark:text-orange-400"
    },
    {
      image: carplayRetrofit,
      title: "CarPlay Retrofit",
      description: "Modernizing older vehicles by retrofitting Apple CarPlay systems. Combining automotive electronics knowledge with hands-on installation work.",
      gradient: "from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20",
      textColor: "text-slate-600 dark:text-slate-400"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slideshowData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slideshowData.length) % slideshowData.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowData.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [slideshowData.length, isPlaying]);

  return (
    <MotionSection id="interests" className="max-w-6xl mx-auto px-4 py-16 md:py-20" aria-labelledby="interests-heading">
      <h2 id="interests-heading" className="text-3xl md:text-4xl font-bold tracking-tight gradient-heading mb-4 text-center">
        My Interests & Projects
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto text-center">
        Beyond coding, here's what drives my passion and creativity.
      </p>
      
      {/* Slideshow Container */}
      <div className="relative max-w-4xl mx-auto">
        {/* Main Slideshow */}
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/50 dark:border-gray-700/50
                        bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl shadow-2xl">
          
          {/* Image Container */}
          <div className="aspect-[4/3] overflow-hidden relative bg-gray-100 dark:bg-gray-800">
            <img
              src={slideshowData[currentSlide].image}
              alt={slideshowData[currentSlide].title}
              className="w-full h-full object-contain transition-all duration-700 ease-out"
              style={{
                transform: currentSlide === 0 
                  ? 'rotate(-90deg) scale(1.3)' 
                  : currentSlide === 2 
                    ? 'rotate(-90deg) scale(1.3)' 
                    : 'none'
              }}
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            
            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 dark:bg-gray-900/20 
                         backdrop-blur-sm border border-white/30 dark:border-gray-700/30
                         hover:bg-white/30 dark:hover:bg-gray-900/30 hover:scale-110
                         transition-all duration-300 group"
              aria-label="Previous slide"
            >
              <ChevronLeft size={24} className="text-white group-hover:text-gray-100" />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 dark:bg-gray-900/20 
                         backdrop-blur-sm border border-white/30 dark:border-gray-700/30
                         hover:bg-white/30 dark:hover:bg-gray-900/30 hover:scale-110
                         transition-all duration-300 group"
              aria-label="Next slide"
            >
              <ChevronRight size={24} className="text-white group-hover:text-gray-100" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="absolute top-4 right-4 p-3 rounded-full bg-white/20 dark:bg-gray-900/20 
                         backdrop-blur-sm border border-white/30 dark:border-gray-700/30
                         hover:bg-white/30 dark:hover:bg-gray-900/30 hover:scale-110
                         transition-all duration-300 group"
              aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            >
              {isPlaying ? (
                <Pause size={20} className="text-white group-hover:text-gray-100" />
              ) : (
                <Play size={20} className="text-white group-hover:text-gray-100" />
              )}
            </button>
          </div>

          {/* Content Section */}
          <div className={`p-8 bg-gradient-to-br ${slideshowData[currentSlide].gradient} 
                          transition-all duration-500 ease-out`}>
            <h3 className={`text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 
                            ${slideshowData[currentSlide].textColor} transition-colors duration-300`}>
              {slideshowData[currentSlide].title}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
              {slideshowData[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center mt-8 space-x-3">
          {slideshowData.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 scale-125 shadow-lg'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentSlide + 1} of {slideshowData.length}
            {isPlaying ? (
              <span className="ml-2 text-green-500">● Auto-playing</span>
            ) : (
              <span className="ml-2 text-yellow-500">⏸ Paused</span>
            )}
          </span>
        </div>
      </div>
    </MotionSection>
  );
}
