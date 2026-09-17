// src/components/RoadTraffic.jsx: traffic on the hero's road.
//
// The two curves across the floor of the hero started as the tyre marks of
// the intro's car. Read as a road, they wanted cars on it, so here are four:
// small, top-down, lit, driving the curve in both directions. Two lanes,
// one each way, each car on its own loop so the pattern never repeats.
//
// They move with SMIL (animateMotion along a path), which is the one
// animation system that can follow a curve and turn the car to face along
// it in the same breath, in the same coordinate space as the road, with no
// per-frame JavaScript. The road is drawn in perspective (far at the top
// right, near at the bottom left), so each car scales up as it comes down
// the road and down as it goes back up it.
//
// The sprite is src/assets/Intro/MiniCar.svg, built by GPT-6-Astra through
// the codex-3d skill. Its body is painted with currentColor, so a lane's
// colour is a CSS `color`. Under prefers-reduced-motion nothing here renders
// at all: the road stays, the traffic does not.
import React, { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../hooks";
import { useEnv } from "../lib/env";
import sprite from "../assets/Intro/MiniCar.svg?raw";

// The sprite's markup without its <svg> wrapper, hoisted into a <g> that the
// four cars <use>. Its origin is the car's centre, which is the point
// animateMotion places on the path and turns around.
const SPRITE = sprite.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// Two lanes, each a curve between the tyre marks in Hero.jsx: the centre
// line of the pair, shifted thirteen units either way.
const LANES = {
  far: "M 1060 43 C 830 68, 710 214.5, 480 204.5 S 220 138.5, -60 283.5",
  near: "M 1060 69 C 830 94, 710 240.5, 480 230.5 S 220 164.5, -60 309.5",
};

// Scale at the top-right (far) end and the bottom-left (near) end of the
// road. The sprite is 160 units across; the road's lanes are 26 apart.
const FAR = 0.2;
const NEAR = 0.4;

const CARS = [
  { id: "a", lane: "far", dur: 9, begin: -2, color: "#fcee0a" },
  { id: "b", lane: "far", dur: 12.5, begin: -8.5, color: "#b9b9b4" },
  { id: "c", lane: "near", dur: 10.5, begin: -4.2, color: "#ff2e88", back: true },
  { id: "d", lane: "near", dur: 14, begin: -11, color: "#fcee0a", back: true },
];

export default function RoadTraffic({ active = true }) {
  const reduced = usePrefersReducedMotion();
  const { traffic } = useEnv();
  const ref = useRef(null);

  // SMIL keeps running for an <svg> that has scrolled away. Pause the whole
  // document's animations while the hero is off screen, resume when it is
  // back; four filtered sprites are cheap, but not free.
  useEffect(() => {
    const svg = ref.current?.ownerSVGElement;
    if (!svg || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    });
    io.observe(svg);
    return () => {
      io.disconnect();
      svg.unpauseAnimations?.();
    };
  }, [active, reduced, traffic]);

  // `traffic` is the console's switch (src/lib/env.js).
  if (reduced || !active || !traffic) return null;

  return (
    <g ref={ref} aria-hidden="true">
      <defs>
        <path id="road-lane-far" d={LANES.far} />
        <path id="road-lane-near" d={LANES.near} />
        <g id="road-car" dangerouslySetInnerHTML={{ __html: SPRITE }} />
      </defs>
      {CARS.map((c) => (
        <g key={c.id} style={{ color: c.color }}>
          <animateMotion
            dur={`${c.dur}s`}
            begin={`${c.begin}s`}
            repeatCount="indefinite"
            rotate={c.back ? "auto-reverse" : "auto"}
            calcMode="linear"
            keyPoints={c.back ? "1;0" : "0;1"}
            keyTimes="0;1"
          >
            <mpath href={`#road-lane-${c.lane}`} />
          </animateMotion>
          <g>
            <animateTransform
              attributeName="transform"
              type="scale"
              values={c.back ? `${NEAR};${FAR}` : `${FAR};${NEAR}`}
              dur={`${c.dur}s`}
              begin={`${c.begin}s`}
              repeatCount="indefinite"
            />
            <use href="#road-car" />
          </g>
        </g>
      ))}
    </g>
  );
}
