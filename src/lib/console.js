// src/lib/console.js: the way to open the console from anywhere.
//
// The backtick opens it, /console opens it, and now a button in the header
// does too. The button lives in Navbar.jsx and the panel in Console.jsx; one
// event between them rather than a context provider for a boolean.
export const CONSOLE_EVENT = "aly:console";

export function openConsole() {
  window.dispatchEvent(new CustomEvent(CONSOLE_EVENT, { detail: { open: true } }));
}
