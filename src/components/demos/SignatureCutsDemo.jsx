// src/components/demos/SignatureCutsDemo.jsx: the booking that has no backend.
//
// The barbershop site takes a booking by compiling the form into a WhatsApp
// deeplink, so there is no server to keep alive. This does the same
// compilation and shows the link it would open, with the shop's number
// withheld, because this is a model of the flow and not a way to book.
import React, { useMemo, useState } from "react";
import DemoFrame, { Field, inputClass, selectClass } from "./DemoFrame";

const SERVICES = ["Haircut", "Haircut and beard", "Beard trim", "Line-up"];
const DAYS = ["Today", "Tomorrow", "Saturday"];

export default function SignatureCutsDemo({ toolbar }) {
  const [name, setName] = useState("Ali");
  const [service, setService] = useState(SERVICES[0]);
  const [day, setDay] = useState(DAYS[1]);
  const [time, setTime] = useState("11:30");

  const text = useMemo(
    () => `Hi Signature Cuts, ${name || "a customer"} would like to book a ${service.toLowerCase()} ${day.toLowerCase()} at ${time}.`,
    [name, service, day, time],
  );
  const url = `https://wa.me/1XXXXXXXXXX?text=${encodeURIComponent(text)}`;

  return (
    <DemoFrame toolbar={toolbar} title="Signature Cuts 413 · booking without a backend" note="the link is built, never opened; number withheld">
      <div className="demo-split demo-split-even">
        <div className="demo-fields">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} className={inputClass} /></Field>
          <Field label="Service">
            <select value={service} onChange={(e) => setService(e.target.value)} className={selectClass}>
              {SERVICES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Day">
            <select value={day} onChange={(e) => setDay(e.target.value)} className={selectClass}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} /></Field>
        </div>
        <div className="demo-aside" aria-live="polite">
          <p className="mono-micro text-dim">The message</p>
          <p className="mt-1.5 prose-dark text-[0.9375rem] leading-[1.6]">{text}</p>
          <p className="mt-4 mono-micro text-dim">Compiles to</p>
          <p className="mt-1.5 font-mono text-[0.75rem] text-muted break-all leading-relaxed">{url}</p>
          <p className="mt-4 mono-micro text-dim leading-relaxed">The live site opens this in WhatsApp or SMS with the shop's real number. Static export, GitHub Pages, nothing to host.</p>
        </div>
      </div>
    </DemoFrame>
  );
}
