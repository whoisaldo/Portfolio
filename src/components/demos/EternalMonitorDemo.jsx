// src/components/demos/EternalMonitorDemo.jsx: the frame's journey.
//
// The connection diagram for Eternal Monitor: a Windows desktop on the left,
// an iPad on the right, and the seven stages a frame passes through between
// them, every one of which is a verified fact about the code (see
// docs/PROJECT_CONTEXT.md, section 4). Click a stage to read what it does.
// The packets running along the wire are a picture of the design, not a
// capture of a stream, and the frame counter counts nothing but itself.
//
// Two interactions carry the two design points worth making. The encoder
// select shows the auto-probe chain: whichever GPU the reader picks, the
// chain reorders and libx264 stays at the end. "Drop a packet" shows why UDP:
// the iPad asks for the missing piece again, and if it is late that frame is
// skipped, rather than every frame behind it waiting for a retransmit.
// Checked against the repository's ARCHITECTURE.md in November 2026.
//
// There is no latency figure anywhere here, on purpose. The project has never
// instrumented glass-to-glass latency, so the diagram says so instead of
// showing a number.
import React, { useEffect, useRef, useState } from "react";
import DemoFrame, { Field, selectClass, buttonClass } from "./DemoFrame";
import { usePrefersReducedMotion } from "../../hooks";

const STAGES = [
  { id: "capture", label: "DXGI capture", side: "host", body: "DXGI hands the host each new frame of the chosen desktop, cursor included. A slow encoder skips stale frames instead of queueing them. NVIDIA's encoders take BGRA and convert it on the graphics card; the others take YUV420, converted on the CPU." },
  { id: "encode", label: "H.264 encode", side: "host", body: "FFmpeg on a hardware encoder if there is one: NVENC, AMF or QSV, probed and reordered by GPU vendor, with libx264 as the software fallback. HEVC is an option. H.264 uses the Baseline profile specifically, because that is what the iPad's hardware decoder is happiest with." },
  { id: "fragment", label: "Fragment", side: "host", body: "Each encoded frame is cut into UDP-sized pieces. Every piece carries an eight-byte prefix and a 32-byte video header with the session, the frame and fragment numbers, a keyframe flag and the capture time. Fragment index and count are u16. They were u8 until frames started exceeding 255 fragments." },
  { id: "udp", label: "UDP", side: "wire", body: "Datagrams, not a stream. With TCP every frame behind a lost packet would wait for the retransmit, which is head-of-line blocking, and the one thing a live display cannot have. Here the iPad asks for a missing fragment straight away and gives the repair a short, bounded window before it moves on. Over USB the same datagrams go through Apple's device tunnel." },
  { id: "reassemble", label: "Reassemble", side: "ipad", body: "The iPad collects fragments by frame until one is complete, holding up to eight frames behind it while a repair can still arrive. If it does not, that frame is dropped and the iPad asks for a keyframe. Rust and Swift share golden test vectors for every packet." },
  { id: "decode", label: "VideoToolbox", side: "ipad", body: "Hardware H.264 or HEVC decode on the iPad through VideoToolbox, straight into a pixel buffer." },
  { id: "present", label: "Metal present", side: "ipad", body: "A Metal-backed MTKView draws the decoded frame. Discovery of the host is mDNS, with manual IP entry or a QR code as the paths that always work." },
];

const ENCODERS = ["NVENC (NVIDIA)", "AMF (AMD)", "QSV (Intel)", "libx264 (software)"];

export default function EternalMonitorDemo({ toolbar }) {
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState("udp");
  const [gpu, setGpu] = useState(0);
  const [frames, setFrames] = useState(0);
  const [dropped, setDropped] = useState(0);
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);

  // The frame counter: a number that counts nothing but itself, at 60 a
  // second, so the diagram is visibly a moving system. Held under reduced
  // motion.
  useEffect(() => {
    if (reduced) return;
    timer.current = setInterval(() => setFrames((f) => f + 1), 1000 / 60);
    return () => clearInterval(timer.current);
  }, [reduced]);

  const chain = [ENCODERS[gpu], ...ENCODERS.filter((_, i) => i !== gpu && i !== 3), ENCODERS[3]];
  const current = STAGES.find((s) => s.id === stage);

  const drop = () => {
    setDropped((d) => d + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  };

  return (
    <DemoFrame toolbar={toolbar} title="Eternal Monitor · the frame's journey" note="a diagram of the design, not a capture of a stream">
      <div className="demo-split">
        <div className="min-w-0">
          {/* The wire. */}
          <ol className="em-wire" aria-label="Stages">
            {/* `em-side-*`, never `em-${side}`: the wire stage's side is
                "wire", and `.em-wire` is the grid itself. */}
            {STAGES.map((s, i) => (
              <li key={s.id} className={`em-stage em-side-${s.side}`}>
                <button
                  type="button"
                  aria-pressed={stage === s.id}
                  onClick={() => setStage(s.id)}
                  className={`em-node ${stage === s.id ? "is-on" : ""} ${flash && s.id === "udp" ? "is-drop" : ""}`}
                >
                  <span className="mono-micro text-dim block">{String(i + 1).padStart(2, "0")}</span>
                  <span className="block font-display font-semibold uppercase text-[0.8125rem] leading-tight">{s.label}</span>
                </button>
              </li>
            ))}
            {!reduced && <span className="em-packet" aria-hidden="true" />}
            {!reduced && <span className="em-packet em-packet-2" aria-hidden="true" />}
          </ol>
          <div className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 mono-micro text-dim">
            <span>Windows host</span>
            <span>8-byte prefix · 32-byte header · u16 fragments</span>
            <span>iPad client</span>
          </div>

          <div className="mt-5 demo-fields">
            <Field label="GPU on the host">
              <select value={gpu} onChange={(e) => setGpu(Number(e.target.value))} className={selectClass}>
                {ENCODERS.slice(0, 3).map((e, i) => <option key={e} value={i}>{e}</option>)}
                <option value={3}>No hardware encoder</option>
              </select>
            </Field>
            <div>
              <span className="mono-micro text-dim block mb-1.5">Encoder chain, probed in this order</span>
              <ol className="flex flex-wrap gap-1.5">
                {chain.map((e, i) => (
                  <li key={e} className={`chamfer chamfer-sm mono-micro px-2 py-1 ${i === 0 ? "bg-volt text-ink font-bold" : "bg-ink text-muted"}`}>{e.split(" ")[0]}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button type="button" onClick={drop} className={buttonClass}>Drop a packet</button>
            <p className="mono-label text-dim tabular-nums">
              frame <span className="text-primary">{frames.toLocaleString("en-US")}</span> · dropped <span className="text-fuchsia">{dropped}</span> · counter only, nothing measured
            </p>
          </div>
          {dropped > 0 && (
            <p className="mt-3 prose-dark text-[0.9375rem]">
              The iPad asks for that piece again, and the frames behind it wait briefly for the repair. If it is late, that frame is gone and the next one shows. With TCP they would have waited for as long as the retransmit took. That is the whole argument for UDP over TCP here.
            </p>
          )}
        </div>

        <div className="demo-aside" aria-live="polite">
          <p className="mono-label text-volt">{current.label}</p>
          <p className="mt-3 prose-dark text-[0.9375rem] leading-[1.6]">{current.body}</p>
          <p className="mt-5 mono-micro text-dim leading-relaxed">
            Latency: not shown. Glass-to-glass latency has never been instrumented, so there is no number to put here.
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
