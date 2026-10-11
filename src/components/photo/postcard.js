// src/components/photo/postcard.js: photo mode's postcard.
//
// P, the camera in Look's strip or the film's controls, or `photo` in the
// console takes the city as it is that moment, without the page on it
// (world-scene.js `snapshot`), and saves it as a PNG the size of the screen's
// own pixels, framed: the viewfinder's corner marks, the name set as the hero
// sets it, and along the foot only what is true about the picture, which is
// the rule the page's chrome keeps (Chrome.jsx). Where it was taken (the shot,
// by its section's own number and name, or the case study's), the lens (the
// camera's real field of view as a full-frame focal length, as the film's
// viewfinder works it out), when (the reader's own clock), and the site it
// came from. Its own chunk: nobody who never takes one downloads it.
import { getWorld, stage } from "../../world/stage";
import { chapterLabel } from "../../world/scroll-stage";
import { profile } from "../../data/profile";
import { featuredProjects } from "../../data/projects";
import { experiences } from "../../data/experience";

const VOLT = "#fcee0a";
const PAPER = "#eceae4";
const DISPLAY = `"Chakra Petch", sans-serif`;
const MONO = `"JetBrains Mono Variable", "JetBrains Mono", monospace`;
const pad = (n) => String(n).padStart(2, "0");
/** A vertical field of view as a full-frame lens (24 mm tall). */
const lensMm = (fov) => 12 / Math.tan((fov * Math.PI) / 360);

/** Where the camera is, in the page's own words: "01", "Work". */
function placeOf() {
  const r = stage.route;
  if (r.kind === "project" || r.kind === "role") {
    const c = chapterLabel(r.kind === "project" ? "projects" : "experience");
    const item = r.kind === "project" ? featuredProjects.find((p) => p.slug === r.slug) : experiences.find((e) => e.slug === r.slug);
    const title = item ? (r.kind === "project" ? item.title : item.company) : null;
    if (c) return { num: c.num, name: title ? `${c.name} // ${title}` : c.name };
  }
  const shot = stage.shots[Math.round(stage.position)];
  return (shot && chapterLabel(shot.id)) || { num: "00", name: "" };
}

/** The postcard, as a PNG blob and the file name to save it under. */
export async function takePostcard() {
  const world = getWorld();
  const frame = world?.snapshot?.();
  if (!frame) return null;
  const W = frame.width;
  const H = frame.height;
  const fov = world.parts.camera.fov;
  const place = placeOf();
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // A unit: a hundredth of the short side, so a phone's postcard is laid
  // out as a monitor's is.
  const u = Math.min(W, H) / 100;
  await Promise.all([document.fonts.load(`700 ${Math.round(u * 9)}px ${DISPLAY}`), document.fonts.load(`500 ${Math.round(u * 1.6)}px ${MONO}`)]).catch(() => {});

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.drawImage(frame, 0, 0);

  // A shade up from the foot, so the caption reads over any frame.
  const shade = g.createLinearGradient(0, H * 0.58, 0, H);
  shade.addColorStop(0, "rgba(8, 8, 10, 0)");
  shade.addColorStop(1, "rgba(8, 8, 10, 0.8)");
  g.fillStyle = shade;
  g.fillRect(0, H * 0.58, W, H * 0.42);

  // The viewfinder's corners.
  const m = u * 3.2;
  const arm = u * 4.4;
  g.strokeStyle = "rgba(236, 234, 228, 0.85)";
  g.lineWidth = Math.max(1, u * 0.16);
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    g.beginPath();
    g.moveTo(x, y + sy * arm);
    g.lineTo(x, y);
    g.lineTo(x + sx * arm, y);
    g.stroke();
  }

  // The name, as the hero sets it: the first name in paper, the last in volt.
  const x0 = m + u * 2;
  const base = H - m - u * 2.2;
  g.textBaseline = "alphabetic";
  g.font = `700 ${u * 8}px ${DISPLAY}`;
  const first = `${profile.first.toUpperCase()} `;
  g.fillStyle = PAPER;
  g.fillText(first, x0, base - u * 4.2);
  g.fillStyle = VOLT;
  g.fillText(profile.last.toUpperCase(), x0 + g.measureText(first).width, base - u * 4.2);

  // A volt rule, and the readouts under it.
  g.fillStyle = VOLT;
  g.fillRect(x0, base - u * 2.9, u * 6, Math.max(1, u * 0.22));
  g.font = `500 ${u * 1.5}px ${MONO}`;
  if ("letterSpacing" in g) g.letterSpacing = `${(u * 0.18).toFixed(1)}px`;
  g.fillStyle = "rgba(236, 234, 228, 0.82)";
  g.fillText(`NIGHT CITY · ${place.num} // ${place.name.toUpperCase()}`, x0, base);
  g.textAlign = "right";
  g.fillText(`${Math.round(lensMm(fov))} MM · ${date} ${time} · ${window.location.host}`, W - m - u * 2, base);

  const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
  if (!blob) return null;
  const slug = place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { blob, name: `night-city-${place.num}${slug ? `-${slug}` : ""}-${date}-${time.replace(":", "")}.png` };
}

/** Save it as a download, and hand back a URL the toast can show it by. */
export function savePostcard({ blob, name }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}
