// src/braindance/roam/words.js: free roam's words.
//
// Labels for keys and buttons, nothing else: no claims, no figures. They
// sit beside the braindance's own (src/data/braindance.js) and are loaded
// with the braindance's interface, never by the page or /recruiters.

export const ROAM = {
  // The button on the timeline, and what it says while the map is made.
  enter: "Free roam",
  enterTitle: "Leave the recording and drive the S4",
  loading: "Mapping the streets",
  failed: "The streets would not map here",
  // In roam.
  header: "Free roam",
  drive: "Driving",
  walk: "On foot",
  leave: "Back to the recording",
  getOut: "Get out",
  stopping: "Stopping to let you out",
  noRoom: "No room to get out here",
  getIn: "Get in",
  getInFar: "Get in, from beside the car",
  reset: "Back onto the road",
  look: "Click the city to look with the mouse",
  unlock: "Esc frees the mouse",
  unit: "km/h",
  reverse: "R",
};

/** The controls list while roaming (the ? panel). */
export const ROAM_CONTROLS = [
  { keys: ["W", "A", "S", "D"], what: "Drive or walk (the arrows too)" },
  { keys: ["Space"], what: "Brake" },
  { keys: ["Shift"], what: "Run, on foot" },
  { keys: ["F"], what: "Get out of the car, or back in beside it" },
  { keys: ["R"], what: "Back onto the nearest road" },
  { keys: ["Drag"], what: "Look around; on foot a click holds the mouse, Esc lets go" },
  { keys: ["Hold click"], what: "Scan a highlighted clue" },
  { keys: ["1", "2", "3"], what: "Visual, audio, thermal layer" },
  { keys: ["J"], what: "Journal" },
  { keys: ["P"], what: "Photo mode" },
  { keys: ["M"], what: "Mute" },
  { keys: ["H"], what: "Hide the interface" },
  { keys: ["G"], what: "Back to the recording" },
];
