// src/components/ui/Panel.jsx — the chamfered frame, written once.
//
// A 45° corner cut is the structural signature of the Cyberpunk 2077
// interface, and a chamfered 1px *frame* cannot be built with a border:
// `clip-path` clips the border away along with everything else the element
// paints. It takes two boxes. The outer one is the frame — it carries the
// clip, the edge colour and exactly 1px of padding. The inner one carries the
// same clip and the fill, and covers all of the outer except that 1px.
//
// That is fiddly enough, and used often enough (roughly forty places), that
// hand-writing the pair anywhere else is a mistake. Use this.
//
// It renders `as` whatever it is handed, so a Panel can be a <div>, a <Link>,
// or a <button> without a wrapper element in between — which matters, because
// an interactive Panel needs the click target and the frame to be the same
// box for the focus rule in index.css to fire.
import React from "react";

export default function Panel({
  as: As = "div",
  // "both" cuts top-left and bottom-right. "br" cuts bottom-right only, for
  // frames whose top-left corner already carries a label.
  corner = "both",
  // "sm" drops the cut to 9px, for anything too short for 14px to fit.
  size,
  // Tailwind class for the 1px frame. Interactive panels usually pass a
  // hover/focus variant here so the whole outline lights at once.
  edge = "bg-ink-line",
  // Tailwind class for the interior.
  fill = "bg-ink-raised",
  className = "",
  innerClassName = "",
  children,
  ...rest
}) {
  const clip = corner === "br" ? "chamfer-br" : "chamfer";

  return (
    <As
      className={[clip, size === "sm" && "chamfer-sm", "p-px", edge, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {/* A <span> rather than a <div> because Panel is regularly rendered as a
          <button>, and a button may only contain phrasing content. `block`
          puts it back to a block box; `h-full` lets a Panel stretched by a
          grid row actually fill it. --chamfer inherits from the outer, so
          size="sm" reaches this element without being passed twice. */}
      <span className={[clip, "block h-full", fill, innerClassName].filter(Boolean).join(" ")}>
        {children}
      </span>
    </As>
  );
}
