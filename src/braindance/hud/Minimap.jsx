// src/braindance/hud/Minimap.jsx: where the recording is, from above.
//
// Top right, as a game has it: the city's map (baked from the kit when the
// braindance started, src/braindance/minimap.js) turned so the camera's
// view points up, the road the car drives in the recording, the car, the
// camera's cone, and a mark for every clue in this stretch of the
// recording on any layer, in its layer's colour. Drawn on a canvas in an
// animation frame of its own.
import React, { useEffect, useRef } from "react";
import { bd, set, useBd } from "../store";
import { LAYER_COLORS } from "../layers";
import { CLUES } from "../../data/braindance";

const SIZE = 196;
const SCALE = 0.62; // canvas pixels a map pixel (the map is 2 pixels a metre)
const found = (id) => bd.found.includes(id);
const total = CLUES.filter((c) => !c.secret).length;

export default function Minimap({ engineRef }) {
  const ref = useRef(null);
  const state = useBd();

  useEffect(() => {
    const canvas = ref.current;
    const e = engineRef.current;
    if (!canvas || !e) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d");
    const map = e.map;
    const road = e.parts.city.road;
    const path = new Path2D();
    for (let u = 0; u <= road.length; u += 3) {
      const p = road.pointAt(u);
      const x = (p.x - map.bounds.x0) * map.ppm;
      const y = (p.z - map.bounds.z0) * map.ppm;
      if (u === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    const css = (c) => `#${c.getHexString()}`;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!bd.hud) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "rgba(6,6,10,0.78)";
      ctx.fillRect(0, 0, SIZE, SIZE);
      // The world, turned so the camera looks up the canvas. The camera's
      // yaw is atan2(dx, dz); "up" on the map is -z.
      const cx = (bd.camera.x - map.bounds.x0) * map.ppm;
      const cz = (bd.camera.z - map.bounds.z0) * map.ppm;
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(bd.camera.yaw - Math.PI);
      ctx.scale(SCALE, SCALE);
      ctx.translate(-cx, -cz);
      ctx.drawImage(map.canvas, 0, 0);
      ctx.strokeStyle = "rgba(252,238,10,0.55)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.stroke(path);
      ctx.setLineDash([]);
      // Clues in this stretch.
      for (const c of e.scanner.activeNow()) {
        const x = (c.at.x - map.bounds.x0) * map.ppm;
        const y = (c.at.z - map.bounds.z0) * map.ppm;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = found(c.id) ? "rgba(236,234,228,0.35)" : css(LAYER_COLORS[c.layer]);
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      }
      // The car.
      const kx = (bd.car.x - map.bounds.x0) * map.ppm;
      const kz = (bd.car.z - map.bounds.z0) * map.ppm;
      ctx.save();
      ctx.translate(kx, kz);
      ctx.rotate(Math.PI - bd.car.heading);
      ctx.fillStyle = "#eceae4";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 10);
      ctx.lineTo(0, 5);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.restore();
      // The camera: the middle, looking up.
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
      g.addColorStop(0, "rgba(46,230,200,0.35)");
      g.addColorStop(1, "rgba(46,230,200,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 70, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2ee6c8";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // North.
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(bd.camera.yaw - Math.PI);
      ctx.fillStyle = "#fcee0a";
      ctx.font = "600 11px 'JetBrains Mono Variable', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(0, -(SIZE / 2 - 12));
      ctx.rotate(-(bd.camera.yaw - Math.PI));
      ctx.fillText("N", 0, 0);
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engineRef]);

  const n = state.found.filter((id) => CLUES.find((c) => c.id === id && !c.secret)).length;
  return (
    <div className="bd-minimap" data-bd-ui="">
      <canvas ref={ref} style={{ width: SIZE, height: SIZE }} aria-hidden="true" />
      <button type="button" className="bd-gigs" onClick={() => set({ journal: !bd.journal, help: false })}>
        <span className="bd-gigs-n">{n}</span>
        <span className="bd-dim">/ {total} clues</span>
        <span className="bd-gigs-key">J</span>
      </button>
    </div>
  );
}
