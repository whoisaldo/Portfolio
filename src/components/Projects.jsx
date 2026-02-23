// src/components/Projects.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import MotionSection from "./MotionSection";
import { ExternalLink, ChevronLeft, ChevronRight, X } from "lucide-react";

// Import MoopsBookstore images
import landingPage from "../assets/MoopsBookStore 2/LandingPage.png";
import signup from "../assets/MoopsBookStore 2/Signup.png";
import userDashboard from "../assets/MoopsBookStore 2/UserDashboard.png";
import userProfile from "../assets/MoopsBookStore 2/UserProfile.png";
import bookReview from "../assets/MoopsBookStore 2/BookReview.png";
import universalDiscover from "../assets/MoopsBookStore 2/UniversalDiscover:Dashboard.png";

// Import Exerly Fitness images
import exerlyImage1 from "../assets/Exerly-Fitness/image.png";
import exerlyImage2 from "../assets/Exerly-Fitness/image1.png";
import exerlyImage3 from "../assets/Exerly-Fitness/image3.png";
import exerlyImage4 from "../assets/Exerly-Fitness/image4.png";

// Import Fade Empire images
import fadeEmpireImage1 from "../assets/ChicopeeFadeEmpire/MobileFrontFadeEmpire.png";
import fadeEmpireImage2 from "../assets/ChicopeeFadeEmpire/MobileMiddleFadeEmpire.png";
import fadeEmpireImage3 from "../assets/ChicopeeFadeEmpire/MobileBookingFormFadeEmpire.png";

const projects = [
  {
    title: "Moops Bookstore",
    blurb: "Full-stack social book tracking platform with user authentication, reading lists, reviews, and Google Books API integration. Features include personalized recommendations, social sharing, and comprehensive book management.",
    description: "A comprehensive book management platform that allows users to discover, track, and review books while connecting with other readers. Built with modern web technologies and deployed across multiple platforms for optimal performance.",
    features: [
      "User authentication & profile management",
      "Google Books API integration for book discovery",
      "Personal reading lists & progress tracking",
      "Book reviews & rating system",
      "Social features & user interactions",
      "Responsive design for all devices"
    ],
    challenges: [
      "Integrating Google Books API with custom backend",
      "Implementing real-time social features",
      "Optimizing database queries for large book catalogs",
      "Managing state across complex user interactions"
    ],
    accomplishments: [
      "Successfully deployed full-stack application",
      "Integrated third-party API with custom backend",
      "Implemented secure user authentication",
      "Created responsive, accessible UI/UX"
    ],
    tech: ["React", "TypeScript", "Node.js", "Express", "MongoDB", "Google Books API", "JWT", "Heroku"],
    gh: "https://github.com/whoisaldo/MoopBookstore",
    live: "https://whoisaldo.github.io/MoopBookstore",
    featured: true,
    buildLog: "Figma → Node API (Express) → GH Pages + Heroku (MongoDB Atlas)."
  },
  {
    title: "Portfolio Website",
    blurb: "Modern, responsive portfolio website showcasing projects, skills, and experience. Features interactive elements, smooth animations, and a built-in resume viewer with PDF integration.",
    tech: ["React", "Vite", "Tailwind CSS", "Framer Motion", "React-PDF", "Lucide React"],
    gh: "https://github.com/whoisaldo/Portfolio",
  },
  {
    title: "Exerly Fitness Platform",
    blurb: "Comprehensive fitness platform with workout tracking, nutrition logging, sleep monitoring, progress analytics, and user authentication. Currently implementing OpenAI's API for 'Exerly Coach' AI assistant.",
    description: "A full-featured fitness platform designed to help users achieve their health and wellness goals. Combines workout tracking, nutrition management, and progress analytics with an intuitive user interface and social features.",
    features: [
      "Workout tracking & exercise library",
      "Nutrition logging & meal planning",
      "Sleep monitoring & analysis",
      "Progress tracking & analytics",
      "User authentication & profiles",
      "Social features & community",
      "AI-powered coaching (in development)"
    ],
    challenges: [
      "Designing intuitive data visualization for fitness metrics",
      "Implementing complex workout tracking algorithms",
      "Creating responsive design for mobile fitness tracking",
      "Integrating multiple data sources and APIs"
    ],
    accomplishments: [
      "Built comprehensive fitness tracking system",
      "Implemented secure user authentication",
      "Created intuitive data visualization",
      "Successfully deployed to production"
    ],
    tech: ["React", "Node.js", "Express", "MongoDB", "JWT", "Chart.js", "OpenAI API", "Heroku"],
    gh: "https://github.com/whoisaldo/Exerly-Fitness",
    live: "https://whoisaldo.github.io/Exerly-Fitness/#/",
    featured: true,
    buildLog: "Auth (JWT) → Workout/Nutrition models → Dashboards → Heroku deploy."
  },
  {
    title: "Fade Empire Barbershop Website",
    blurb: "A modern, luxury barbershop website built with vanilla HTML, CSS, and JavaScript. Features a mobile-first responsive design with optimized image loading, WhatsApp/SMS booking integration, and a dynamic portfolio gallery. Deployed as a static site via GitHub Pages to minimize hosting costs while delivering a premium user experience across all devices.",
    description: "A premium barbershop website designed to showcase services, portfolio, and provide an easy booking experience for clients. Built as a static site to minimize hosting costs while delivering a luxury user experience.",
    features: [
      "Mobile-first responsive design",
      "WhatsApp/SMS booking integration",
      "Dynamic portfolio gallery",
      "Optimized image loading",
      "Service showcase with pricing",
      "Static site deployment (GitHub Pages)"
    ],
    challenges: [
      "Creating luxury aesthetic with vanilla CSS",
      "Implementing mobile-first responsive design",
      "Optimizing performance for static hosting",
      "Integrating WhatsApp/SMS booking without backend"
    ],
    accomplishments: [
      "Delivered premium user experience with static site",
      "Achieved fast loading times with optimized images",
      "Successfully deployed cost-effective solution",
      "Created responsive design for all devices"
    ],
    tech: ["HTML5", "CSS3", "JavaScript (ES6+)", "React (booking form)"],
    gh: "https://github.com/whoisaldo/FadeEmpire",
    live: "https://chicopeefadeempire.com",
    featured: true,
    buildLog: "Vanilla HTML/CSS/JS → React booking form → GitHub Pages deploy."
  },
  {
    title: "CS3520-Summer-2025",
    blurb: "C++ coursework: nested containers, Makefiles, GDB, CLI formatting.",
    tech: ["C++", "GDB", "Makefile"],
    gh: "https://github.com/whoisaldo/CS3520-Summer-2025",
  },
  {
    title: "Password-Generator",
    blurb: "Configurable generator across Java + Swift experiments.",
    tech: ["Java", "Swift"],
    gh: "https://github.com/whoisaldo/Password-Generator",
  },
  {
    title: "Grade-Calculator",
    blurb: "Weighted categories, simple desktop UI, export support.",
    tech: ["Java", "GUI"],
    gh: "https://github.com/whoisaldo/Grade-Calculator",
  },
];

export default function Projects() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImageSet, setCurrentImageSet] = useState(null);

  // Separate featured and other projects
  const featuredProjects = projects.filter(p => p.featured);
  const otherProjects = projects.filter(p => !p.featured);

  // MoopsBookstore images data
  const moopsImages = [
    { src: landingPage, title: "Landing Page", description: "Clean, modern homepage with featured books and navigation" },
    { src: signup, title: "User Registration", description: "Secure signup form with validation and user authentication" },
    { src: userDashboard, title: "User Dashboard", description: "Personalized dashboard showing reading progress and recommendations" },
    { src: userProfile, title: "User Profile", description: "Complete user profile with reading stats and preferences" },
    { src: bookReview, title: "Book Review System", description: "Detailed book review and rating interface" },
    { src: universalDiscover, title: "Book Discovery", description: "Advanced search and discovery features with filters" }
  ];

  // Exerly Fitness images data
  const exerlyImages = [
    { src: exerlyImage1, title: "Fitness Dashboard", description: "Comprehensive workout tracking and progress monitoring" },
    { src: exerlyImage2, title: "Exercise Library", description: "Extensive database of exercises with detailed instructions" },
    { src: exerlyImage3, title: "Nutrition Tracking", description: "Meal planning and nutrition logging interface" },
    { src: exerlyImage4, title: "Progress Analytics", description: "Data visualization and fitness progress tracking" }
  ];

  // Fade Empire images data
  const fadeEmpireImages = [
    { src: fadeEmpireImage1, title: "Mobile Homepage", description: "Modern, luxury barbershop homepage with service showcase" },
    { src: fadeEmpireImage2, title: "Portfolio Gallery", description: "Dynamic portfolio gallery displaying client transformations" },
    { src: fadeEmpireImage3, title: "Booking Form", description: "WhatsApp/SMS booking integration for easy appointment scheduling" }
  ];

  const openImageModal = (index, projectTitle) => {
    setCurrentImageIndex(index);
    if (projectTitle === "Moops Bookstore") {
      setCurrentImageSet(moopsImages);
      setSelectedImage(moopsImages[index]);
    } else if (projectTitle === "Exerly Fitness Platform") {
      setCurrentImageSet(exerlyImages);
      setSelectedImage(exerlyImages[index]);
    } else if (projectTitle === "Fade Empire Barbershop Website") {
      setCurrentImageSet(fadeEmpireImages);
      setSelectedImage(fadeEmpireImages[index]);
    }
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setCurrentImageSet(null);
  };

  const nextImage = () => {
    if (!currentImageSet) return;
    const next = (currentImageIndex + 1) % currentImageSet.length;
    setCurrentImageIndex(next);
    setSelectedImage(currentImageSet[next]);
  };

  const prevImage = () => {
    if (!currentImageSet) return;
    const prev = (currentImageIndex - 1 + currentImageSet.length) % currentImageSet.length;
    setCurrentImageIndex(prev);
    setSelectedImage(currentImageSet[prev]);
  };

  return (
    <MotionSection id="projects" className="max-w-6xl mx-auto px-4 py-16 md:py-20" aria-labelledby="projects-heading">
      <h2 id="projects-heading" className="text-3xl md:text-4xl font-bold tracking-tight gradient-heading mb-4">
        Featured Projects
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl">
        A few things I've built and shipped.
      </p>

      {/* Featured Projects */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-16">
        {featuredProjects.map((p, index) => (
          <motion.article
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ duration: 0.4, delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            viewport={{ once: true }}
            className="group relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50
                       bg-white/90 dark:bg-[#12121a] backdrop-blur-xl p-6 
                       shadow-lg hover:shadow-2xl transition-all duration-300
                       hover:border-red-400/40 hover:shadow-red-500/20
                       before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r 
                       before:from-red-500/5 before:to-rose-500/5 before:opacity-0 
                       hover:before:opacity-100 before:transition-opacity before:duration-300"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                  {p.title}
                </h3>
                <div className="flex items-center gap-3">
                {p.featured && (
                    <span className="rounded-full bg-gradient-to-r from-red-500 to-rose-500 
                                   text-white px-3 py-1 text-xs font-semibold shadow-sm">
                    Featured
                  </span>
                )}
              </div>
            </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {p.tech.slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-gray-200 dark:border-gray-700 
                               px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400
                               bg-gray-50 dark:bg-gray-800/50 group-hover:bg-red-50 
                               dark:group-hover:bg-red-900/20 group-hover:border-red-300 
                               dark:group-hover:border-red-600 transition-all duration-200"
                  >
                    {tech}
                  </span>
                ))}
                {p.tech.length > 4 && (
                  <span className="rounded-full border border-gray-200 dark:border-gray-700 
                                 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-500
                                 bg-gray-50 dark:bg-gray-800/50">
                    +{p.tech.length - 4} more
                  </span>
                )}
              </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    {p.blurb}
                  </p>

                  {/* Key Features - Simplified */}
                  {p.features && (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Key Features:</h5>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {p.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500 dark:text-red-400 mt-0.5">•</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* MoopsBookstore Image Gallery */}
                  {p.title === "Moops Bookstore" && (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Screenshots:</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {moopsImages.slice(0, 6).map((image, idx) => (
                          <button
                            key={idx}
                            onClick={() => openImageModal(idx, p.title)}
                            className="group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 aspect-video hover:scale-105 transition-transform duration-200"
                          >
                            <img
                              src={image.src}
                              alt={image.title}
                              className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exerly Fitness Image Gallery */}
                  {p.title === "Exerly Fitness Platform" && (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Screenshots:</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {exerlyImages.slice(0, 4).map((image, idx) => (
                          <button
                            key={idx}
                            onClick={() => openImageModal(idx, p.title)}
                            className="group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 aspect-video hover:scale-105 transition-transform duration-200"
                          >
                            <img
                              src={image.src}
                              alt={image.title}
                              className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fade Empire Image Gallery */}
                  {p.title === "Fade Empire Barbershop Website" && (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Screenshots:</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {fadeEmpireImages.slice(0, 3).map((image, idx) => (
                          <button
                            key={idx}
                            onClick={() => openImageModal(idx, p.title)}
                            className="group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 aspect-video hover:scale-105 transition-transform duration-200"
                          >
                            <img
                              src={image.src}
                              alt={image.title}
                              className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-200"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.buildLog && (
                    <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Build Log: <span className="text-gray-700 dark:text-gray-300">{p.buildLog}</span>
                      </p>
                    </div>
                  )}

              <div className="flex items-center gap-4">
              {p.gh && (
                <a
                    className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                               text-sm font-medium text-gray-700 dark:text-gray-300
                               bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/20
                               hover:text-red-600 dark:hover:text-red-400
                               transition-all duration-200 hover:scale-105 hover:shadow-md"
                  href={p.gh}
                  target="_blank"
                  rel="noreferrer"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                    </svg>
                    GitHub
                    <svg className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
              )}
              {p.live && (
                <a
                    className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                               text-sm font-medium text-white bg-gradient-to-r from-red-500 to-rose-500
                               hover:from-red-600 hover:to-rose-600 transition-all duration-200 
                               hover:scale-105 hover:shadow-lg"
                  href={p.live}
                  target="_blank"
                  rel="noreferrer"
                >
                    <ExternalLink size={16} className="group-hover/link:scale-110 transition-transform duration-200" />
                    Live Demo
                </a>
              )}
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Other Projects */}
      <div className="mt-16">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Other Projects
        </h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {otherProjects.map((p, index) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50
                         bg-white/90 dark:bg-[#12121a] backdrop-blur-xl p-6 
                         shadow-lg hover:shadow-xl transition-all duration-300
                         hover:border-gray-300/50 dark:hover:border-gray-600/50"
            >
              <div className="relative z-10">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                  {p.title}
                </h4>

                <div className="flex flex-wrap gap-2 mb-4">
                  {p.tech.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-gray-200 dark:border-gray-700 
                                 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400
                                 bg-gray-50 dark:bg-gray-800/50 group-hover:bg-red-50 
                                 dark:group-hover:bg-red-900/20 group-hover:border-red-300 
                                 dark:group-hover:border-red-600 transition-all duration-200"
                    >
                      {tech}
                    </span>
                  ))}
                  {p.tech.length > 3 && (
                    <span className="rounded-full border border-gray-200 dark:border-gray-700 
                                   px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-500
                                   bg-gray-50 dark:bg-gray-800/50">
                      +{p.tech.length - 3} more
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {p.blurb}
                </p>

                <div className="flex items-center gap-3">
                  {p.gh && (
                    <a
                      className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                                 text-sm font-medium text-gray-700 dark:text-gray-300
                                 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/20
                                 hover:text-red-600 dark:hover:text-red-400
                                 transition-all duration-200 hover:scale-105 hover:shadow-md
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                      href={p.gh}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                  )}
                  {p.live && (
                    <a
                      className="group/link inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                                 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-rose-500
                                 hover:from-red-600 hover:to-rose-600 transition-all duration-200 
                                 hover:scale-105 hover:shadow-lg
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                      href={p.live}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={16} className="group-hover/link:scale-110 transition-transform duration-200" />
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200"
            >
              <X size={24} className="text-white" />
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200"
            >
              <ChevronRight size={24} className="text-white" />
            </button>

            {/* Image */}
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />

            {/* Image Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
              <h3 className="text-white font-semibold text-lg mb-1">{selectedImage.title}</h3>
              <p className="text-gray-300 text-sm">{selectedImage.description}</p>
              <p className="text-gray-400 text-xs mt-2">{currentImageIndex + 1} of {currentImageSet?.length || 0}</p>
            </div>
          </div>
        </div>
      )}
    </MotionSection>
  );
}
