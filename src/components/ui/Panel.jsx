// src/components/ui/Panel.jsx: the chamfered frame, written once.
//
// A 45° corner cut is the structural signature of the Cyberpunk 2077
// interface, and a chamfered 1px *frame* cannot be built with a border:
// `clip-path` clips the border away along with everything else the element
// paints. It takes two boxes. The outer one is the frame: it carries the
// clip, the edge colour and exactly 1px of padding. The inner one carries the
// same clip and the fill, and covers all of the outer except that 1px.
//
// That is fiddly enough, and used often enough (roughly forty places), that
// hand-writing the pair anywhere else is a mistake. Use this.
//
// `glass` makes it a pane of smoked glass over the city. The interior is
// see-through, so the frame can no longer be the outer box's own fill: a
// clip-path clips everything inside the box too, and a ring-shaped clip on
// the outer box would take the content with it. So the frame is a third,
// empty box, laid over the outer one and clipped to a ring (its 1px frame
// and nothing inside it), and the outer box paints nothing at all. The fill
// is a thin smoke, and the world frosts the city behind the pane in its own
// post pass (src/world/glass.js, reading `data-glass`), so text reads on it
// while the city shows through. "tint" is the same smoke without a frost of
// its own, for a chip or a row inside a pane that is already frosted. A
// glass panel's frame lights on hover through the outer box's named group
// (`group-hover/panel:` in the edge class), since the ring itself is too
// thin to hover. With the city off (reduced motion, no GPU, `fx world off`)
// it is the opaque panel it always was: the fill class it was given applies.
//
// It renders `as` whatever it is handed, so a Panel can be a <div>, a <Link>,
// or a <button> without a wrapper element in between, which matters, because
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
  // true (or "pane"): smoked glass, frosted behind. "tint": the smoke only.
  glass = false,
  // Tailwind class for the 1px frame. Interactive panels usually pass a
  // hover/focus variant here so the whole outline lights at once. A glass
  // panel's default is a hairline of light (`glass-edge`).
  edge,
  // Tailwind class for the interior.
  fill = "bg-ink-raised",
  className = "",
  innerClassName = "",
  children,
  ...rest
}) {
  const clip = corner === "br" ? "chamfer-br" : "chamfer";
  const pane = glass === true || glass === "pane";

  if (glass) {
    return (
      <As
        className={["relative group/panel p-px", size === "sm" && "chamfer-sm", className].filter(Boolean).join(" ")}
        data-glass={pane ? (corner === "br" ? "br" : "both") : undefined}
        data-glass-sm={pane && size === "sm" ? "" : undefined}
        {...rest}
      >
        <span aria-hidden="true" className={[`${clip}-ring absolute inset-0 pointer-events-none`, edge ?? "glass-edge"].join(" ")} />
        <span className={[clip, "relative block h-full", fill, "glass-fill", innerClassName].filter(Boolean).join(" ")}>
          {children}
        </span>
      </As>
    );
  }

  return (
    <As
      className={[clip, size === "sm" && "chamfer-sm", "p-px", edge ?? "bg-ink-line", className]
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
