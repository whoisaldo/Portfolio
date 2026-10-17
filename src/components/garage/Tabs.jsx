// src/components/garage/Tabs.jsx: the garage's tablists, written once.
//
// Four of them: the six stations, the two cars, a car's photographs, and the
// shop wall's three boards. All of them are a roving tabindex (one Tab stop,
// arrow keys and Home/End walk it) over buttons with role="tab".
//
// `activate` says what an arrow key does. "auto" selects as focus moves,
// which is right for a photograph (cheap, and the S4's view tabs always did
// it). "manual" only moves focus and leaves Enter or Space to select, which
// is right for a station or a car: selecting one flies the camera across the
// room, and walking past four stations with the arrow keys should not fly
// four times.
import React, { useRef } from "react";
import { ANCHOR, CONTROL } from "./focus";
import { nextIndex } from "./state";

export default function Tabs({
  items,
  value,
  onChange,
  label,
  activate = "auto",
  controls,
  idBase,
  className = "",
  tabClassName = "",
  render,
}) {
  const refs = useRef([]);
  const selected = items.findIndex((t) => t.id === value);
  // The one tab in the Tab order: the selected one, or the first when none
  // is (the car tablist at the arrival, where neither car is the subject).
  const stop = selected >= 0 ? selected : 0;

  const onKeyDown = (e) => {
    const from = refs.current.findIndex((el) => el === document.activeElement);
    const next = nextIndex(e.key, from >= 0 ? from : stop, items.length);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    if (activate === "auto") onChange(items[next].id, { source: "keyboard" });
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={className}>
      {items.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={idBase ? `${idBase}-tab-${t.id}` : undefined}
            aria-selected={on}
            aria-controls={controls}
            tabIndex={i === stop ? 0 : -1}
            {...{ [CONTROL]: t.key, [ANCHOR]: t.anchor }}
            onClick={() => onChange(t.id, { source: "pointer" })}
            className={`${tabClassName} ${on ? "is-on" : ""}`}
          >
            {render ? render(t, on, i) : t.label}
          </button>
        );
      })}
    </div>
  );
}
