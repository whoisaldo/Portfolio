// src/braindance/hud/PhotoMode.jsx: photo mode.
//
// P freezes the recording and hands over the camera: drag to orbit the
// moment, scroll to move in and out, and the panel for the lens, the roll,
// a filter or a layer, and the stamp. Enter (or the shutter) saves the
// frame as a PNG at the canvas's own resolution.
import React, { useState } from "react";
import { bd, set, useBd } from "../store";
import { LAYERS } from "../layers";
import { LAYER_NAMES } from "../../data/braindance";

const FILTERS = [
  ["off", "None"],
  ["noir", "Noir"],
  ["neon", "Neon"],
  ["film", "Film"],
];

export default function PhotoMode({ engineRef }) {
  const state = useBd();
  const [busy, setBusy] = useState(false);
  if (state.mode !== "photo") return null;
  const photo = state.photo;
  const patch = (p) => set({ photo: { ...bd.photo, ...p } });
  const shoot = async () => {
    if (busy) return;
    setBusy(true);
    await engineRef.current?.capture();
    setBusy(false);
  };
  return (
    <div className="bd-panel bd-photo" data-bd-ui="" role="dialog" aria-label="Photo mode">
      <div className="bd-photo-row">
        <p className="bd-kicker">Photo mode</p>
        <p className="bd-dim bd-photo-hint">Drag to orbit · scroll to move · Enter to shoot · P to leave</p>
      </div>
      <div className="bd-photo-grid">
        <label>
          <span>Lens</span>
          <input type="range" min={-25} max={30} step={1} value={photo.fov} onChange={(e) => patch({ fov: Number(e.target.value) })} />
        </label>
        <label>
          <span>Roll</span>
          <input type="range" min={-25} max={25} step={1} value={photo.roll} onChange={(e) => patch({ roll: Number(e.target.value) })} />
        </label>
        <div className="bd-photo-chips" role="group" aria-label="Filter">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={photo.filter === id ? "is-on" : ""} aria-pressed={photo.filter === id} onClick={() => patch({ filter: id })}>
              {label}
            </button>
          ))}
        </div>
        <div className="bd-photo-chips" role="group" aria-label="Layer">
          {LAYERS.map((l) => (
            <button key={l} type="button" className={state.layer === l ? "is-on" : ""} aria-pressed={state.layer === l} onClick={() => engineRef.current?.setLayer(l)}>
              {LAYER_NAMES[l]}
            </button>
          ))}
        </div>
        <label className="bd-photo-check">
          <input type="checkbox" checked={photo.stamp} onChange={(e) => patch({ stamp: e.target.checked })} />
          <span>Stamp</span>
        </label>
        <button type="button" className="bd-btn bd-btn-primary bd-photo-shoot" onClick={shoot} disabled={busy}>
          {busy ? "Saving" : "Shoot"}
        </button>
      </div>
    </div>
  );
}
