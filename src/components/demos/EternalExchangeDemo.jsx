// src/components/demos/EternalExchangeDemo.jsx: an EMC calculator.
//
// Seven items with the EMC values the mod's own site publishes, read from a
// fresh vanilla world (docs/PROJECT_CONTEXT.md, section 3). Pick an item and
// a quantity and the calculator prices it; pick a second item and it says
// how many of those the same energy buys, with the remainder. The arithmetic
// is BigInt so nothing rounds, which is a small imitation of the mod, where
// the solver prices every item in the loaded recipe graph in exact
// BigFraction arithmetic at world load.
//
// Only these seven values are stated because only these seven are verified.
// The mod prices everything else at world load; that number is
// runtime-computed and is deliberately not quoted here.
import React, { useMemo, useState } from "react";
import DemoFrame, { Field, inputClass, selectClass } from "./DemoFrame";

const ITEMS = [
  { id: "cobblestone", name: "Cobblestone", emc: 1n },
  { id: "coal", name: "Coal", emc: 128n },
  { id: "diamond", name: "Diamond", emc: 8192n },
  { id: "aeternalis", name: "Aeternalis Fuel", emc: 102400n },
  { id: "dark-matter", name: "Dark Matter", emc: 139264n },
  { id: "red-matter", name: "Red Matter", emc: 466944n },
  { id: "dm-pedestal", name: "Dark Matter Pedestal", emc: 4653056n },
];

const fmt = (n) => n.toLocaleString("en-US");

export default function EternalExchangeDemo({ toolbar }) {
  const [from, setFrom] = useState("diamond");
  const [qty, setQty] = useState("4");
  const [to, setTo] = useState("coal");

  const a = ITEMS.find((i) => i.id === from);
  const b = ITEMS.find((i) => i.id === to);
  const n = useMemo(() => {
    const v = parseInt(qty, 10);
    return Number.isFinite(v) && v > 0 ? BigInt(Math.min(v, 1_000_000)) : 0n;
  }, [qty]);

  const total = a.emc * n;
  const makes = b.emc > 0n ? total / b.emc : 0n;
  const remainder = total - makes * b.emc;

  return (
    <DemoFrame toolbar={toolbar} title="EternalExchange · EMC calculator" note="seven seeded values from a fresh world; exact integers">
      <div className="demo-split demo-split-even">
        <div className="demo-fields demo-fields-qty">
          <Field label="You have">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass}>
              {ITEMS.map((i) => <option key={i.id} value={i.id}>{i.name} · {fmt(i.emc)} EMC</option>)}
            </select>
          </Field>
          <Field label="How many">
            <input
              type="number"
              min="1"
              max="1000000"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Transmute into" className="demo-span">
            <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass}>
              {ITEMS.map((i) => <option key={i.id} value={i.id}>{i.name} · {fmt(i.emc)} EMC</option>)}
            </select>
          </Field>
        </div>

        <div className="demo-aside" aria-live="polite">
          <dl className="space-y-4">
            <div>
              <dt className="mono-micro text-dim">Stored energy</dt>
              <dd className="mt-1 font-display font-bold text-2xl md:text-3xl text-volt tabular-nums leading-none">{fmt(total)} <span className="text-base text-muted">EMC</span></dd>
              <dd className="mt-1.5 mono-micro text-dim">{fmt(n)} × {fmt(a.emc)}</dd>
            </div>
            <div>
              <dt className="mono-micro text-dim">Buys</dt>
              <dd className="mt-1 font-display font-bold text-2xl md:text-3xl text-primary tabular-nums leading-none">
                {fmt(makes)} <span className="text-base text-muted">{b.name}</span>
              </dd>
              <dd className="mt-1.5 mono-micro text-dim">
                {remainder > 0n ? `${fmt(remainder)} EMC left over, kept in the table` : "nothing left over"}
              </dd>
            </div>
          </dl>
          <p className="mt-5 mono-micro text-dim leading-relaxed">
            The mod prices every other item at world load by walking the recipe graph from these seeds, in exact BigFraction arithmetic. Only the seeds are quoted here.
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
