// src/front/embeds/EddiesCompare.jsx: the eddies mark two ways, for a post
// whose Markdown has a data-embed="eddies-compare" placeholder.
//
// On the left, the vector shard an agent wrote by hand (PR #15). On the
// right, the mark Codex's image generator drew for the homepage's sticker. A
// seam wipes between them: drag it, tap anywhere on the stage, or focus it
// and use the arrow keys. Zoom scales both around the seam, so the edges
// being compared are always the ones next to it. The post's <figure> holds
// this and its caption, so the caption is on the page before this loads.
//
// The shard is a copy of src/assets/About/EddieShard.svg rather than an
// import of it. The playground's About section imports that file, and a
// module shared between this chunk and the playground's would be split out
// of both and change the playground's bundle.
import React, { useRef, useState } from "react";
import codexEddie from "../../../design/stickers/eddies.png";
import "./eddies-compare.css";

const VIEWS = [
  { label: "SVG", at: 100 },
  { label: "Both", at: 50 },
  { label: "Codex", at: 0 },
];
const ZOOMS = [1, 2, 4];

const clamp = (n) => Math.min(100, Math.max(0, n));

function Shard() {
  return (
    <svg
      className="ec-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 34"
      fill="currentColor"
      role="img"
      aria-label="The SVG an agent wrote: a fanned stack of credit shards with a euro sign cut out of the front one"
    >
      <g transform="translate(2.306743 3.930543) rotate(-12)" fillOpacity="0.25">
        <path d="M2.071 0H16.5L20 3.5V26.8Q20 28.4 18.4 28.4H14.608L14.99 26.6H18.2V4.246L15.754 1.8H10.539Z" />
      </g>
      <g transform="translate(2.292335 3.724720) rotate(-6)" fillOpacity="0.5">
        <path d="M2.15 0H16.5L20 3.5V26.8Q20 28.4 18.4 28.4H17.334L17.523 26.6H18.2V20.161L19.755 5.37L16.64 1.523Z" />
      </g>
      <g transform="translate(0.5 33.5)">
        <path
          fillRule="evenodd"
          d="M1.8-30H18.5L22-26.5V-1.8Q22 0 20.2 0H1.8Q0 0 0-1.8V-28.2Q0-30 1.8-30ZM8.6 -28.5H11.4A1.6 1.6 0 0 1 11.4 -25.3H8.6A1.6 1.6 0 0 1 8.6 -28.5ZM12.178179834 -23.7H15.378179834V-21.43527163A7.5 8 0 0 1 18.321820166 -18.788611491L15.378179834 -16.953166894V-11.446833106L18.321820166 -9.611388509A7.5 8 0 0 1 15.378179834 -6.96472837V-4.7H12.178179834V-6.2A7.5 8 0 0 1 4.829710606 -12.6H3.678179834V-15.8H4.829710606A7.5 8 0 0 1 12.178179834 -22.2ZM12.178179834 -19V-15.8H8.124100955A4.3 4.8 0 0 1 12.178179834 -19ZM12.178179834 -12.6V-9.4A4.3 4.8 0 0 1 8.124100955 -12.6Z"
        />
      </g>
    </svg>
  );
}

export default function EddiesCompare() {
  // How much of the stage, in percent from the left, shows the SVG.
  const [at, setAt] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const stage = useRef(null);

  const follow = (event) => {
    const box = stage.current.getBoundingClientRect();
    setAt(clamp(((event.clientX - box.left) / box.width) * 100));
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    follow(event);
  };
  const onPointerMove = (event) => {
    if (dragging) follow(event);
  };
  const stop = () => setDragging(false);

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 2;
    const moves = {
      ArrowLeft: at - step,
      ArrowDown: at - step,
      ArrowRight: at + step,
      ArrowUp: at + step,
      PageDown: at - 10,
      PageUp: at + 10,
      Home: 0,
      End: 100,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setAt(clamp(moves[event.key]));
  };

  const shown = Math.round(at);

  return (
    <div className="ec">
      <div
        ref={stage}
        className={`ec-stage${dragging ? " is-dragging" : ""}`}
        style={{ "--at": `${at}%`, "--zoom": zoom }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <div className="ec-layer ec-layer-svg">
          <div className="ec-zoom">
            <Shard />
          </div>
          <span className="ec-tag ec-tag-svg" aria-hidden="true">SVG by an agent</span>
        </div>
        <div className="ec-layer ec-layer-codex">
          <div className="ec-zoom">
            <img
              className="ec-img"
              src={codexEddie}
              width="480"
              height="478"
              alt="The image Codex made: a yellow euro sign and dollar sign locked together, outlined in black"
              draggable="false"
              decoding="async"
            />
          </div>
          <span className="ec-tag ec-tag-codex" aria-hidden="true">Codex image gen</span>
        </div>

        <div
          className="ec-seam"
          role="slider"
          tabIndex={0}
          aria-label="Seam between the SVG and the Codex image"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-valuetext={`${shown}% SVG, ${100 - shown}% Codex`}
          onKeyDown={onKeyDown}
        >
          <span className="ec-grip" aria-hidden="true">
            <svg viewBox="0 0 20 12" width="20" height="12">
              <path d="M7 1 2 6l5 5M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
        </div>
      </div>

      <div className="ec-controls">
        <div className="ec-group" role="group" aria-label="Show">
          {VIEWS.map((view) => (
            <button
              key={view.label}
              type="button"
              className="ec-button"
              aria-pressed={shown === view.at}
              onClick={() => setAt(view.at)}
            >
              {view.label}
            </button>
          ))}
        </div>
        <div className="ec-group" role="group" aria-label="Zoom">
          {ZOOMS.map((z) => (
            <button
              key={z}
              type="button"
              className="ec-button"
              aria-pressed={zoom === z}
              onClick={() => setZoom(z)}
            >
              {z}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
