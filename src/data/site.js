// src/data/site.js — page structure.
//
// This list used to exist three times, in three slightly different shapes:
// Navbar.jsx (as `[01]`-style numbered links), SideRail.jsx (as Roman numerals
// I-VI) and HUDOverlay.jsx (as SCREAMING_SNAKE codenames). Three numbering
// systems on screen at once, none of which agreed. One list now.

export const sections = [
  { id: "hero", label: "Top", nav: false },
  { id: "projects", label: "Work", nav: true },
  { id: "experience", label: "Experience", nav: true },
  { id: "terminal", label: "Terminal", nav: true },
  { id: "contact", label: "Contact", nav: true },
];

export const navSections = sections.filter((s) => s.nav);
