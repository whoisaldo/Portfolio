// src/App.jsx
import React from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Resume from "./components/Resume";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <About />
        <Projects />
        <Resume />

        <section id="contact" className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Let's Connect
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              I'm always interested in new opportunities, collaborations, or just having a chat about tech, cars, or anything interesting!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info Card */}
            <div className="group rounded-2xl border border-gray-200/50 dark:border-gray-700/50 
                            bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl p-8 
                            shadow-lg hover:shadow-xl transition-all duration-300
                            hover:border-gray-300/50 dark:hover:border-gray-600/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Get in Touch</h3>
              </div>
              
              <div className="space-y-4">
                <div className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                  <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Primary Email</p>
                    <a 
                      href="mailto:younes.al@northeastern.edu"
                      className="text-gray-900 dark:text-gray-100 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                    >
                      younes.al@northeastern.edu
                    </a>
                  </div>
                </div>

                <div className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                  <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Personal Email</p>
                    <a 
                      href="mailto:whois.younes@gmail.com"
                      className="text-gray-900 dark:text-gray-100 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                    >
                      whois.younes@gmail.com
                    </a>
                  </div>
                </div>

                <div className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                  <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <a 
                      href="tel:+14134099563"
                      className="text-gray-900 dark:text-gray-100 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                    >
                      (413) 409-9563
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links Card */}
            <div className="group rounded-2xl border border-gray-200/50 dark:border-gray-700/50 
                            bg-white/90 dark:bg-neutral-900/80 backdrop-blur-xl p-8 
                            shadow-lg hover:shadow-xl transition-all duration-300
                            hover:border-gray-300/50 dark:hover:border-gray-600/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Connect Online</h3>
              </div>
              
              <div className="space-y-4">
                <a 
                  href="https://github.com/whoisaldo"
                  target="_blank"
                  rel="noreferrer"
                  className="group/link flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 
                             hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700
                             border border-transparent transition-all duration-300 hover:scale-105 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-gray-900 dark:bg-gray-100">
                    <svg className="w-5 h-5 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover/link:text-indigo-600 dark:group-hover/link:text-indigo-400 transition-colors duration-200">
                      GitHub
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Check out my projects and code</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover/link:text-indigo-500 group-hover/link:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <a 
                  href="https://www.linkedin.com/in/ali-younes-41a2b4296/"
                  target="_blank"
                  rel="noreferrer"
                  className="group/link flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 
                             hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700
                             border border-transparent transition-all duration-300 hover:scale-105 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-blue-600">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors duration-200">
                      LinkedIn
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Professional networking and updates</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover/link:text-blue-500 group-hover/link:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <a 
                  href="https://whoisaldo.github.io/Exerly-Fitness/#/"
                  target="_blank"
                  rel="noreferrer"
                  className="group/link flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 
                             hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-700
                             border border-transparent transition-all duration-300 hover:scale-105 hover:shadow-md"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover/link:text-purple-600 dark:group-hover/link:text-purple-400 transition-colors duration-200">
                      Exerly Fitness
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Try my latest project</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover/link:text-purple-500 group-hover/link:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} Ali Younes. Built with React, Vite, and Tailwind CSS.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a 
                href="https://github.com/whoisaldo" 
                target="_blank" 
                rel="noreferrer"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
              >
                GitHub
              </a>
              <a 
                href="https://www.linkedin.com/in/ali-younes-41a2b4296/" 
                target="_blank" 
                rel="noreferrer"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
              >
                LinkedIn
              </a>
              <a 
                href="mailto:younes.al@northeastern.edu"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
