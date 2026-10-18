// src/components/garage/PartList.jsx: every part on a car, grouped, a button
// each.
//
// The S4's build sheet, made to take either car. Rows are ordinary buttons in
// list order inside their groups (no roving focus: a reader tabbing through a
// list expects each line to be a stop). The selected row says so with
// aria-pressed. In the photographs this is the three-column sheet under the
// bay; in the workshop it is a single column inside the Parts panel. A part
// that has no marker in the current view, or no photograph at all, is still
// here: the list is the one place every part can always be reached.
import React from "react";
import { ANCHOR, CONTROL } from "./focus";
import { modsIn, priceLabel } from "./cars";

const pad = (n) => String(n).padStart(2, "0");

export default function PartList({ car, selected, onPick, columns = true, showPrices, className = "" }) {
  const layout = columns ? car.sheet : [car.sheet.flat()];
  return (
    <div className={`${columns ? "grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" : ""} ${className}`}>
      {layout.map((column, ci) => (
        <div key={ci} className={columns ? "space-y-7" : "space-y-5"}>
          {column.map((gid) => {
            const g = car.groups.find((x) => x.id === gid);
            const list = modsIn(car, gid);
            if (!g || !list.length) return null;
            return (
              <div key={gid} role="group" aria-label={`${car.label}, ${g.label}`}>
                <h4 className="flex items-baseline justify-between gap-4 pb-2 border-b border-ink-line">
                  <span className="mono-label text-primary">{g.label}</span>
                  <span className="mono-micro text-faint tabular-nums">{pad(list.length)}</span>
                </h4>
                <ul className="mt-1">
                  {list.map((m) => {
                    const on = selected?.carId === car.id && selected?.modId === m.id;
                    const price = priceLabel(m, { short: true, show: showPrices });
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={(e) => onPick(m, e.currentTarget)}
                          {...{ [CONTROL]: `row:${car.id}:${m.id}`, [ANCHOR]: `part:${car.id}:${m.id}` }}
                          className={`gw-row w-full flex items-baseline gap-3 py-2 text-left transition-colors
                                      ${on ? "text-volt" : "text-muted hover:text-primary"}`}
                        >
                          <span className="gw-row-index mono-micro text-dim tabular-nums shrink-0 w-6">{pad(m.index + 1)}</span>
                          <span className="text-[0.9375rem] leading-snug grow min-w-0">{m.name}</span>
                          {price && <span className="mono-micro text-dim tabular-nums shrink-0">{price}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
