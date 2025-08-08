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

        <section id="contact" className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl font-bold">Contact</h2>

          <div className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 backdrop-blur p-6">
            <p className="text-lg font-semibold">Ali Younes</p>
            <ul className="mt-3 space-y-2 text-neutral-700 dark:text-neutral-300">
              <li>
                <a className="underline hover:opacity-80" href="mailto:younes.al@northeastern.edu">
                  Younes.al@northeastern.edu
                </a>
              </li>
              <li>
                <a className="underline hover:opacity-80" href="mailto:whois.younes@gmail.com">
                  Whois.younes@gmail.com
                </a>
              </li>
              <li>
                <a className="underline hover:opacity-80" href="tel:+14134099563">
                  413-409-9563
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-neutral-500">
          © {new Date().getFullYear()} Ali Younes
        </div>
      </footer>
    </div>
  );
}
