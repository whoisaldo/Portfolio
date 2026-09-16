// src/components/demos/ExerlyDemo.jsx: a sample workout, and the formula.
//
// Two things Exerly does, done here with sample data. A workout log: tick
// sets off and the volume tallies, the way the app's day log does, on a
// session that belongs to nobody. And maintenance calories: the Mifflin-St
// Jeor equation the iOS onboarding runs at its last step (WizardService in
// the repo), computed here from whatever the reader types. Nothing leaves
// the browser and nothing here is a real account, and the frame says so.
import React, { useMemo, useState } from "react";
import DemoFrame, { Field, inputClass, selectClass } from "./DemoFrame";

const SAMPLE = [
  { id: "squat", name: "Back squat", sets: [{ reps: 5, lb: 275 }, { reps: 5, lb: 275 }, { reps: 5, lb: 275 }] },
  { id: "bench", name: "Bench press", sets: [{ reps: 8, lb: 185 }, { reps: 8, lb: 185 }, { reps: 6, lb: 195 }] },
  { id: "row", name: "Barbell row", sets: [{ reps: 10, lb: 135 }, { reps: 10, lb: 135 }, { reps: 10, lb: 135 }] },
  { id: "rdl", name: "Romanian deadlift", sets: [{ reps: 8, lb: 225 }, { reps: 8, lb: 225 }] },
];

const ACTIVITY = [
  { k: 1.2, label: "Sedentary" },
  { k: 1.375, label: "Light, 1 to 3 days a week" },
  { k: 1.55, label: "Moderate, 3 to 5 days" },
  { k: 1.725, label: "Active, 6 to 7 days" },
  { k: 1.9, label: "Very active, twice a day" },
];

export default function ExerlyDemo({ toolbar }) {
  const [tab, setTab] = useState("log");
  const [done, setDone] = useState(() => new Set());

  const [sex, setSex] = useState("m");
  const [age, setAge] = useState("22");
  const [lb, setLb] = useState("185");
  const [ft, setFt] = useState("5");
  const [inch, setInch] = useState("11");
  const [act, setAct] = useState(2);

  const toggle = (key) =>
    setDone((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const totalSets = SAMPLE.reduce((n, ex) => n + ex.sets.length, 0);
  const volume = SAMPLE.reduce(
    (v, ex) => v + ex.sets.reduce((s, set, i) => s + (done.has(`${ex.id}-${i}`) ? set.reps * set.lb : 0), 0),
    0,
  );

  const tdee = useMemo(() => {
    const kg = (parseFloat(lb) || 0) * 0.45359237;
    const cm = ((parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0)) * 2.54;
    const a = parseFloat(age) || 0;
    if (!kg || !cm || !a) return null;
    // Mifflin-St Jeor, 1990: the equation the iOS onboarding uses.
    const bmr = 10 * kg + 6.25 * cm - 5 * a + (sex === "m" ? 5 : -161);
    return { bmr: Math.round(bmr), tdee: Math.round(bmr * ACTIVITY[act].k) };
  }, [sex, age, lb, ft, inch, act]);

  return (
    <DemoFrame toolbar={toolbar} title="Exerly Fitness · a sample session" note="sample data, computed here, sent nowhere">
      <div role="tablist" aria-label="Exerly demo" className="flex gap-1 border-b border-ink-line mb-4">
        {[["log", "Workout log"], ["tdee", "Maintenance calories"]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative px-3 py-2 mono-label transition-colors ${tab === id ? "text-primary" : "text-dim hover:text-primary"}`}
          >
            <span aria-hidden="true" className={`absolute left-0 right-0 bottom-0 h-0.5 bg-volt ${tab === id ? "opacity-100" : "opacity-0"}`} />
            {label}
          </button>
        ))}
      </div>

      {tab === "log" ? (
        <div className="demo-split">
          <ul className="space-y-3">
            {SAMPLE.map((ex) => (
              <li key={ex.id}>
                <p className="font-display font-semibold uppercase text-[0.9375rem] text-primary">{ex.name}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {ex.sets.map((set, i) => {
                    const key = `${ex.id}-${i}`;
                    const on = done.has(key);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggle(key)}
                          className={`chamfer chamfer-sm mono-micro px-2.5 py-1.5 tabular-nums transition-colors
                                      ${on ? "bg-volt text-ink font-bold" : "bg-ink text-muted hover:text-primary"}`}
                        >
                          {set.reps} × {set.lb} lb
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <div className="demo-aside" aria-live="polite">
            <dl className="space-y-4">
              <div>
                <dt className="mono-micro text-dim">Sets done</dt>
                <dd className="mt-1 font-display font-bold text-2xl md:text-3xl text-primary tabular-nums leading-none">{done.size} <span className="text-base text-muted">/ {totalSets}</span></dd>
              </div>
              <div>
                <dt className="mono-micro text-dim">Volume</dt>
                <dd className="mt-1 font-display font-bold text-2xl md:text-3xl text-volt tabular-nums leading-none">{volume.toLocaleString("en-US")} <span className="text-base text-muted">lb</span></dd>
                <dd className="mt-1.5 mono-micro text-dim">reps × weight, summed over ticked sets</dd>
              </div>
            </dl>
            <p className="mt-5 mono-micro text-dim leading-relaxed">A session that belongs to nobody. The real log is one of 51 endpoints the web app and the iOS app share.</p>
          </div>
        </div>
      ) : (
        <div className="demo-split">
          <div className="demo-fields">
            <Field label="Sex">
              <select value={sex} onChange={(e) => setSex(e.target.value)} className={selectClass}>
                <option value="m">Male</option>
                <option value="f">Female</option>
              </select>
            </Field>
            <Field label="Age">
              <input type="number" min="13" max="100" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Weight, lb">
              <input type="number" min="60" max="600" inputMode="decimal" value={lb} onChange={(e) => setLb(e.target.value)} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height, ft">
                <input type="number" min="3" max="8" inputMode="numeric" value={ft} onChange={(e) => setFt(e.target.value)} className={inputClass} />
              </Field>
              <Field label="in">
                <input type="number" min="0" max="11" inputMode="numeric" value={inch} onChange={(e) => setInch(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Activity" className="demo-span">
              <select value={act} onChange={(e) => setAct(Number(e.target.value))} className={selectClass}>
                {ACTIVITY.map((a, i) => <option key={a.k} value={i}>{a.label} · ×{a.k}</option>)}
              </select>
            </Field>
          </div>
          <div className="demo-aside" aria-live="polite">
            {tdee ? (
              <dl className="space-y-4">
                <div>
                  <dt className="mono-micro text-dim">Resting, Mifflin-St Jeor</dt>
                  <dd className="mt-1 font-display font-bold text-2xl md:text-3xl text-primary tabular-nums leading-none">{tdee.bmr.toLocaleString("en-US")} <span className="text-base text-muted">kcal</span></dd>
                </div>
                <div>
                  <dt className="mono-micro text-dim">Maintenance</dt>
                  <dd className="mt-1 font-display font-bold text-2xl md:text-3xl text-volt tabular-nums leading-none">{tdee.tdee.toLocaleString("en-US")} <span className="text-base text-muted">kcal / day</span></dd>
                </div>
              </dl>
            ) : (
              <p className="prose-dark text-[0.9375rem]">Fill in the four numbers.</p>
            )}
            <p className="mt-5 mono-micro text-dim leading-relaxed">10 × kg + 6.25 × cm − 5 × age, +5 or −161, times the activity factor. The equation the iOS onboarding runs at its last step.</p>
          </div>
        </div>
      )}
    </DemoFrame>
  );
}
