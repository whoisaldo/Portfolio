// src/components/BentoProjects.jsx - Enhanced with Modal Gallery
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ExternalLink, Github, BookOpen, Dumbbell, Scissors, Code, Key, Calculator, 
  Star, ChevronDown, Users, Database, Globe, Sparkles, Check, Brain,
  X, ChevronLeft, ChevronRight, Maximize2
} from "lucide-react";

// Import project images - Moops
import moopsLanding from "../assets/MoopsBookStore 2/LandingPage.png";
import moopsReview from "../assets/MoopsBookStore 2/BookReview.png";
import moopsSignup from "../assets/MoopsBookStore 2/Signup.png";
import moopsDashboard from "../assets/MoopsBookStore 2/UserDashboard.png";
import moopsProfile from "../assets/MoopsBookStore 2/UserProfile.png";

// Import project images - Exerly
import exerlyMain from "../assets/Exerly-Fitness/image.png";
import exerly1 from "../assets/Exerly-Fitness/image1.png";
import exerly3 from "../assets/Exerly-Fitness/image3.png";
import exerly4 from "../assets/Exerly-Fitness/image4.png";

// Import project images - Fade Empire
import fadeMain from "../assets/ChicopeeFadeEmpire/MobileFrontFadeEmpire.png";
import fadeBooking from "../assets/ChicopeeFadeEmpire/MobileBookingFormFadeEmpire.png";
import fadeMiddle from "../assets/ChicopeeFadeEmpire/MobileMiddleFadeEmpire.png";

// Import project images - Facial Recognition
import facialFront from "../assets/Facial/FacialRecognitionFrontPage.png";
import facialHappy from "../assets/Facial/FacialRecognitionHappy.png";
import facialAngry from "../assets/Facial/FacialRegocnitionAngryFace.png";

const featuredProjects = [
  {
    title: "Moops Bookstore",
    tagline: "Your Social Reading Companion",
    description: "A full-stack social platform solving the fragmentation of reading lists by combining book discovery, tracking, and social features.",
    longDescription: "Problem: Readers struggle to track books across platforms and discover what friends are reading.\n\nSolution: Engineered a centralized social reading platform that combines tracking, discovery, and community into one seamless interface.\n\nImpact: Successfully integrated the Google Books API (1M+ books) with a custom MongoDB backend, implementing secure JWT authentication and real-time social features.",
    tech: ["React", "TypeScript", "Node.js", "MongoDB", "Express", "Google Books API"],
    features: [
      "User authentication with JWT",
      "Search millions of books via API",
      "Personal reading lists & tracking",
      "Write and share book reviews",
      "Social features & friend system",
      "Responsive mobile-first design"
    ],
    github: "https://github.com/whoisaldo/MoopBookstore",
    live: "https://whoisaldo.github.io/MoopBookstore",
    images: [moopsLanding, moopsDashboard, moopsReview, moopsProfile, moopsSignup],
    imageLabels: ["Landing Page", "Dashboard", "Book Reviews", "User Profile", "Sign Up"],
    icon: BookOpen,
    accentColor: "#ef4444",
    stats: { users: "Social", books: "1M+ Books", reviews: "Reviews" },
  },
  {
    title: "Exerly Fitness",
    tagline: "Your Complete Fitness Dashboard",
    description: "A comprehensive health platform engineered to centralize fragmented fitness data into a single, actionable dashboard.",
    longDescription: "Problem: Fitness enthusiasts often juggle multiple apps for workouts, nutrition, and sleep, losing sight of the big picture.\n\nSolution: Developed a unified, full-stack fitness dashboard featuring complex data visualization, macro calculations, and progress tracking.\n\nImpact: Delivered a scalable architecture using React and Node.js that securely handles multi-faceted user health data and provides intuitive analytics via Chart.js.",
    tech: ["React", "Node.js", "MongoDB", "JWT Auth", "Chart.js", "REST API"],
    features: [
      "Workout logging with exercises",
      "Nutrition tracking & macros",
      "Sleep pattern monitoring",
      "Progress analytics & charts",
      "Goal setting & achievements",
      "Dark mode interface"
    ],
    github: "https://github.com/whoisaldo/Exerly-Fitness",
    live: "https://whoisaldo.github.io/Exerly-Fitness/#/",
    images: [exerlyMain, exerly1, exerly3, exerly4],
    imageLabels: ["Dashboard", "Workouts", "Analytics", "Progress"],
    icon: Dumbbell,
    accentColor: "#f43f5e",
    stats: { workouts: "Workouts", nutrition: "Nutrition", sleep: "Sleep" },
  },
  {
    title: "Fade Empire",
    tagline: "Premium Barbershop Experience",
    description: "A modern, mobile-first business website engineered to drive customer conversions via automated WhatsApp booking integration.",
    longDescription: "Problem: A local barbershop relied on manual phone bookings and had no digital footprint to showcase their portfolio.\n\nSolution: Designed and developed a premium, mobile-first static site focused on high-performance image loading and streamlined UX.\n\nImpact: Eliminated friction in the booking process by integrating direct WhatsApp scheduling, and improved the business's local SEO and professional brand presence.",
    tech: ["HTML5", "CSS3", "JavaScript", "Responsive Design", "WhatsApp API"],
    features: [
      "Mobile-first responsive design",
      "WhatsApp booking integration",
      "Dynamic portfolio gallery",
      "Service menu & pricing",
      "Google Maps integration",
      "Fast loading & SEO optimized"
    ],
    github: "https://github.com/whoisaldo/FadeEmpire",
    live: "https://chicopeefadeempire.com",
    images: [fadeMain, fadeMiddle, fadeBooking],
    imageLabels: ["Home", "Services", "Booking"],
    icon: Scissors,
    accentColor: "#ec4899",
    stats: { mobile: "Mobile-First", booking: "WhatsApp", seo: "SEO Ready" },
  },
  {
    title: "Real-Time Face Analytics",
    tagline: "AI-Powered Facial Recognition",
    description: "A sophisticated web application demonstrating client-side machine learning by performing real-time facial and emotion analysis.",
    longDescription: "Problem: Many AI vision tools rely on expensive, latency-heavy cloud processing that compromises user privacy.\n\nSolution: Engineered a 100% client-side computer vision application utilizing TensorFlow.js to process video streams locally in the browser.\n\nImpact: Achieved real-time performance for multi-face detection, age/gender estimation, and emotion tracking, while ensuring zero data leaves the user's device.",
    tech: ["React", "TypeScript", "TensorFlow.js", "face-api.js", "Redux Toolkit", "Tailwind CSS"],
    features: [
      "Real-time multi-face detection",
      "Age & gender estimation",
      "7 emotion recognition types",
      "Analytics tracking over time",
      "100% client-side processing",
      "No data sent to servers"
    ],
    github: "https://github.com/whoisaldo/real-time-face-analytics",
    live: "https://whoisaldo.github.io/real-time-face-analytics/",
    images: [facialFront, facialHappy, facialAngry],
    imageLabels: ["Main Interface", "Happy Detection", "Emotion Analysis"],
    icon: Brain,
    accentColor: "#06b6d4",
    stats: { ai: "AI/ML", faces: "Multi-Face", privacy: "Local Only" },
  },
];

const otherProjects = [
  {
    title: "CS3520 - C++ Programming",
    description: "C++ coursework: nested containers, Makefiles, GDB debugging, and CLI formatting.",
    tech: ["C++", "GDB", "Makefile"],
    github: "https://github.com/whoisaldo/CS3520-Summer-2025",
    icon: Code,
  },
  {
    title: "Password Generator",
    description: "Configurable password generator with experiments in Java and Swift.",
    tech: ["Java", "Swift"],
    github: "https://github.com/whoisaldo/Password-Generator",
    icon: Key,
  },
  {
    title: "Grade Calculator",
    description: "Weighted grade calculator with simple desktop UI and export support.",
    tech: ["Java", "GUI"],
    github: "https://github.com/whoisaldo/Grade-Calculator",
    icon: Calculator,
  },
];

// Project Modal Component
function ProjectModal({ project, isOpen, onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const Icon = project?.icon;

  if (!isOpen || !project) return null;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % project.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + project.images.length) % project.images.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl"
          style={{ backgroundColor: '#0f0f18' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Gallery */}
          <div className="relative h-64 md:h-96 bg-black/50">
            <img
              src={project.images[currentImageIndex]}
              alt={project.imageLabels?.[currentImageIndex] || project.title}
              className="w-full h-full object-contain"
            />

            {/* Image Navigation */}
            {project.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>

                {/* Image Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {project.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'w-6 bg-white'
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Image Label */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm">
                  {project.imageLabels?.[currentImageIndex] || `Image ${currentImageIndex + 1}`}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {project.images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto bg-black/30">
              {project.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex
                      ? 'border-red-500 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Project Details */}
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="p-4 rounded-2xl"
                style={{ backgroundColor: `${project.accentColor}20` }}
              >
                <Icon className="w-8 h-8" style={{ color: project.accentColor }} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-black text-white mb-1">{project.title}</h2>
                <p className="text-lg" style={{ color: project.accentColor }}>{project.tagline}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mb-6">
              {Object.entries(project.stats).map(([key, value]) => (
                <div
                  key={key}
                  className="px-4 py-2 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: `${project.accentColor}15`,
                    color: project.accentColor,
                    border: `1px solid ${project.accentColor}30`
                  }}
                >
                  {value}
                </div>
              ))}
            </div>

            {/* Description */}
            <p className="text-neutral-300 leading-relaxed mb-6 whitespace-pre-wrap">
              {project.longDescription}
            </p>

            {/* Features */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: project.accentColor }} />
                Key Features
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {project.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 mt-0.5 shrink-0" style={{ color: project.accentColor }} />
                    <span className="text-neutral-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" style={{ color: project.accentColor }} />
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className="px-4 py-2 text-sm font-semibold rounded-xl"
                    style={{
                      backgroundColor: `${project.accentColor}15`,
                      color: project.accentColor,
                      border: `1px solid ${project.accentColor}30`
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(135deg, ${project.accentColor}, ${project.accentColor}cc)`,
                    boxShadow: `0 10px 40px -10px ${project.accentColor}60`
                  }}
                >
                  <ExternalLink className="w-5 h-5" />
                  View Live Site
                </a>
              )}
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white border border-white/20 hover:bg-white/5 transition-all hover:-translate-y-1"
              >
                <Github className="w-5 h-5" />
                View Source Code
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Featured Card Component
function FeaturedProjectCard({ project, index, onClick }) {
  const Icon = project.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      onClick={onClick}
      className="group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
      style={{
        backgroundColor: '#0f0f18',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={project.images[0]}
          alt={project.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, #0f0f18 0%, transparent 60%), 
                         linear-gradient(135deg, ${project.accentColor}20, transparent 50%)`
          }}
        />

        {/* Featured badge */}
        <div 
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${project.accentColor}30`, color: project.accentColor }}
        >
          <Star className="w-3 h-3" fill={project.accentColor} />
          Featured
        </div>

        {/* Image count badge */}
        {project.images.length > 1 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
            <Maximize2 className="w-3 h-3" />
            {project.images.length} images
          </div>
        )}

        {/* Stats bar */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2.5 px-4 bg-black/40 backdrop-blur-sm">
          {Object.entries(project.stats).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-xs font-bold text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="p-2.5 rounded-xl transition-all group-hover:scale-110"
            style={{ backgroundColor: `${project.accentColor}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: project.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">
              {project.title}
            </h3>
            <p className="text-sm" style={{ color: project.accentColor }}>{project.tagline}</p>
          </div>
        </div>

        <p className="text-neutral-400 text-sm leading-relaxed mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Tech tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tech.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 text-xs font-medium rounded-lg"
              style={{
                backgroundColor: `${project.accentColor}15`,
                color: project.accentColor,
              }}
            >
              {t}
            </span>
          ))}
          {project.tech.length > 3 && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/5 text-neutral-400">
              +{project.tech.length - 3}
            </span>
          )}
        </div>

        {/* Click to view hint */}
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 text-neutral-400 text-sm font-medium group-hover:bg-red-500/10 group-hover:text-red-400 transition-all">
          <Maximize2 className="w-4 h-4" />
          Click to view details
        </div>
      </div>
    </motion.div>
  );
}

export default function BentoProjects() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <section id="projects" className="relative py-24 md:py-28 px-6 bg-[#0a0a0f]">
      {/* Background accent */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <Star className="w-4 h-4 text-red-500" fill="#ef4444" />
            <span className="text-sm font-semibold text-red-400">Featured Work</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
            Projects
          </h2>
          <p className="text-neutral-500 text-lg max-w-xl mx-auto">
            Click on any project to explore screenshots, features, and more
          </p>
        </motion.div>

        {/* Featured Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-20">
          {featuredProjects.map((project, index) => (
            <FeaturedProjectCard
              key={project.title}
              project={project}
              index={index}
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>

        {/* Other Projects */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-red-500" />
            Other Projects
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {otherProjects.map((project, index) => {
            const Icon = project.icon;
            return (
              <motion.a
                key={project.title}
                href={project.github}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group p-4 rounded-xl bg-[#12121a]/60 border border-white/5
                           hover:border-red-500/20 hover:-translate-y-1
                           transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-md bg-red-500/10">
                    <Icon className="w-4 h-4 text-red-500" />
                  </div>
                  <h4 className="font-semibold text-white text-sm group-hover:text-red-400 transition-colors">
                    {project.title}
                  </h4>
                </div>
                <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{project.description}</p>
                <div className="flex flex-wrap gap-1">
                  {project.tech.map((t) => (
                    <span key={t} className="px-2 py-0.5 text-xs text-neutral-500 bg-white/5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
}
