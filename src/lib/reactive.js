// src/lib/reactive.js: the page breathes with the track.
//
// One requestAnimationFrame loop, running only while music plays and the
// document is visible, that reads the analyser and writes two numbers onto
// the elements marked data-reactive as custom properties:
//
//   --bass   the kick, 0 to 1, fast up and slow down so a hit is a hit
//   --level  overall loudness, 0 to 1, smoothed
//
// Everything music-reactive on the site is plain CSS reading those two
// variables: the split on the hero's name, the VU bars beside the volume
// control, the hazard tape's brightness. No component subscribes to anything
// and no React state changes sixty times a second. When the music stops the
// loop stops and both variables go to zero, so the same CSS is simply still.
//
// These used to live on <html>. Inherited custom properties made Chrome
// resolve the whole document's styles on every music frame, even for text
// that never used them. Keep the writes on the few consumers instead, and
// leave changes smaller than 0.04 alone until they accumulate. The analyser
// and its smoothing still run each frame, so attacks and decays keep their
// shape without making every tiny change another style pass.
import { AMBIENT_EVENT, getLevels, isPlaying } from "./ambient";

export function startReactive() {
  let consumers = new Set();
  let raf = 0;
  let bass = 0;
  let level = 0;
  let writtenBass = 0;
  let writtenLevel = 0;

  const refreshConsumers = () => {
    const next = new Set(document.querySelectorAll("[data-reactive]"));
    for (const el of next) {
      if (consumers.has(el)) continue;
      el.style.setProperty("--bass", writtenBass.toFixed(3));
      el.style.setProperty("--level", writtenLevel.toFixed(3));
    }
    consumers = next;
  };

  // The intro, routes and sound toggle mount consumers after this starts.
  // Observe element mounts, never our own style writes or decoded text, so
  // React does not have to subscribe and a frame never queries the DOM.
  const observer = new MutationObserver((records) => {
    if (records.some(({ addedNodes, removedNodes }) =>
      [...addedNodes, ...removedNodes].some((node) => node.nodeType === 1)
    )) refreshConsumers();
  });
  refreshConsumers();
  observer.observe(document.body, { childList: true, subtree: true });

  const write = (force = false) => {
    if (force || Math.abs(bass - writtenBass) >= 0.04) {
      writtenBass = Number(bass.toFixed(3));
      for (const el of consumers) el.style.setProperty("--bass", writtenBass.toFixed(3));
    }
    if (force || Math.abs(level - writtenLevel) >= 0.04) {
      writtenLevel = Number(level.toFixed(3));
      for (const el of consumers) el.style.setProperty("--level", writtenLevel.toFixed(3));
    }
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
    if (!document.hidden && !raf) raf = requestAnimationFrame(tick);
  };
  const pause = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const stop = () => {
    pause();
    bass = 0;
    level = 0;
    write(true);
  };

  const onAmbient = (e) => (e.detail?.playing ? start() : stop());
  const onVisibility = () => {
    if (document.hidden) pause();
    else if (isPlaying()) start();
  };
  window.addEventListener(AMBIENT_EVENT, onAmbient);
  document.addEventListener("visibilitychange", onVisibility);
  if (isPlaying()) start();

  return () => {
    observer.disconnect();
    window.removeEventListener(AMBIENT_EVENT, onAmbient);
    document.removeEventListener("visibilitychange", onVisibility);
    stop();
  };
}
