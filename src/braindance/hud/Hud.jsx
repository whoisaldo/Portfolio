// src/braindance/hud/Hud.jsx: everything drawn over the braindance.
//
// The editor's interface, in the corners, so the middle of the screen is
// the city: the recording's name and chapter top left, the minimap top
// right, the timeline along the bottom, the scan card and the journal when
// asked for. H hides all of it.
import React from "react";
import { bd, set, useBd } from "../store";
import { pointerHandlers } from "../controls";
import Timeline from "./Timeline";
import Markers from "./Markers";
import ScanCard from "./ScanCard";
import Toasts from "./Toasts";
import Journal from "./Journal";
import Minimap from "./Minimap";
import Radio from "./Radio";
import PhotoMode from "./PhotoMode";
import Call from "./Call";
import { EditHint, EndScreen, TitleCard, Tutorial } from "./Overlays";
import { CHAPTERS, CONTROLS, LAYER_NAMES } from "../../data/braindance";

function Header() {
  const state = useBd();
  const ch = CHAPTERS[state.chapter];
  return (
    <div className="bd-header" data-bd-ui="">
      <p className="bd-rec">
        <span className={`bd-rec-dot ${state.playing ? "is-live" : ""}`} aria-hidden="true" />
        {state.playing ? (state.direction < 0 ? "Rewinding" : "Playing") : state.mode === "edit" ? "Editor" : "Paused"}
        <span className="bd-dim"> · ALI_YOUNES.bd</span>
      </p>
      <p className="bd-chapter-title" key={state.chapter}>
        {ch?.title}
      </p>
      {ch?.line && <p className="bd-chapter-line">{ch.line}</p>}
      <p className={`bd-layer-name bd-layer-${state.layer}`}>
        {LAYER_NAMES[state.layer]} layer
      </p>
    </div>
  );
}

function Help() {
  const state = useBd();
  if (!state.help) return null;
  return (
    <div className="bd-panel bd-help" data-bd-ui="" role="dialog" aria-label="Controls">
      <p className="bd-kicker">Controls</p>
      <ul>
        {CONTROLS.map((c) => (
          <li key={c.what}>
            <span className="bd-keys">
              {c.keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
            </span>
            <span>{c.what}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Hud({ engineRef }) {
  const state = useBd();
  const handlers = React.useMemo(() => pointerHandlers(engineRef), [engineRef]);
  const windows = engineRef.current?.scanner.windows ?? [];
  return (
    <>
      <div className={`bd-look ${state.mode === "edit" ? "is-edit" : ""} ${state.hover ? "is-scan" : ""}`} {...handlers} aria-hidden="true" />
      <div className={`bd-hud ${state.hud ? "" : "is-hidden"} ${state.mode === "photo" ? "is-photo" : ""}`}>
        <Markers engineRef={engineRef} />
        <TitleCard />
        <Header />
        <Minimap engineRef={engineRef} />
        <Radio engineRef={engineRef} />
        <Timeline engineRef={engineRef} clues={windows} />
        <Tutorial />
        <Call />
        <EditHint />
        <PhotoMode engineRef={engineRef} />
        <EndScreen engineRef={engineRef} />
        <ScanCard />
        <Journal engineRef={engineRef} windows={windows} />
        <Toasts />
        <Help />
        <button type="button" className="bd-help-btn" data-bd-ui="" onClick={() => set({ help: !bd.help, journal: false })} aria-label="Controls">
          ?
        </button>
      </div>
    </>
  );
}
