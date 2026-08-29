// src/data/site.js: page structure.
//
// This list used to exist three times, in three slightly different shapes:
// Navbar.jsx (as `[01]`-style numbered links), SideRail.jsx (as Roman numerals
// I-VI) and HUDOverlay.jsx (as SCREAMING_SNAKE codenames). Three numbering
// systems on screen at once, none of which agreed. One list now.
//
// Labels stay plain English through the cyberpunk pass. The theme is carried
// by the chrome around them (chamfers, hazard tape, the decode on entry) and
// not by renaming Experience to SERVICE RECORD. A recruiter should never have
// to translate a nav item before they can use it.
//
// `nav: false` means "in the right-edge index rail, not in the top bar".
// Stack sits immediately below About, so scrolling to About lands on both and
// the top bar stays at five items rather than six.
//
// The console is not in this list on purpose. It used to be section five; it
// is an easter egg now (backtick, or /console). See src/components/Console.jsx.
export const sections = [
  { id: "hero", label: "Top", nav: false },
  { id: "projects", label: "Work", nav: true },
  { id: "experience", label: "Experience", nav: true },
  { id: "about", label: "About", nav: true },
  { id: "stack", label: "Stack", nav: false },
  { id: "teardown", label: "Teardown", nav: true },
  { id: "contact", label: "Contact", nav: true },
];

export const navSections = sections.filter((s) => s.nav);
