// src/lib/reactive.js: the page breathes with the track.
//
// One requestAnimationFrame loop, running only while music plays, that reads
// the analyser and writes two numbers onto <html> as custom properties:
//
//   --bass   the kick, 0 to 1, fast up and slow down so a hit is a hit
//   --level  overall loudness, 0 to 1, smoothed
//
// Everything music-reactive on the site is plain CSS reading those two
// variables: the split on the hero's name, the VU bars beside the volume
// control, the hazard tape's brightness. No component subscribes to anything
// and no React state changes sixty times a second. When the music stops the
// loop stops and both variables go to zero, so the same CSS is simply still.
import { AMBIENT_EVENT, getLevels, isPlaying } from "./ambient";

export function startReactive() {
  const root = document.documentElement;
  let raf = 0;
  let bass = 0;
  let level = 0;

  const write = () => {
    root.style.setProperty("--bass", bass.toFixed(3));
    root.style.setProperty("--level", level.toFixed(3));
  };

  const tick = () => {
    const now = getLevels();
    // Asymmetric smoothing: attack in a frame or two, decay over ten.
    bass += (now.bass - bass) * (now.bass > bass ? 0.7 : 0.12);
    level += (now.level - level) * (now.level > level ? 0.4 : 0.1);
    write();
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    bass = 0;
    level = 0;
    write();
  };

  const onAmbient = (e) => (e.detail?.playing ? start() : stop());
  window.addEventListener(AMBIENT_EVENT, onAmbient);
  if (isPlaying()) start();

  return () => {
    window.removeEventListener(AMBIENT_EVENT, onAmbient);
    stop();
  };
}
