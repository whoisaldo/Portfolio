// src/braindance/format.js: the recording's time as the editor writes it.
export const fmt = (t) => {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
