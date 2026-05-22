// src/components/hud/BracketFrame.jsx — four corner brackets around any block
import React from "react";

export default function BracketFrame({
  children,
  size = "md",
  color = "hud",
  className = "",
  as: As = "div",
  ...rest
}) {
  const sizeClass = size === "sm" ? "sm" : size === "lg" ? "lg" : "";
  const colorClass = color === "signal" ? "signal" : color === "ember" ? "ember" : "";

  return (
    <As className={`bracket-frame ${className}`} {...rest}>
      <span aria-hidden className={`bracket-corner tl ${sizeClass} ${colorClass}`.trim()} />
      <span aria-hidden className={`bracket-corner tr ${sizeClass} ${colorClass}`.trim()} />
      <span aria-hidden className={`bracket-corner bl ${sizeClass} ${colorClass}`.trim()} />
      <span aria-hidden className={`bracket-corner br ${sizeClass} ${colorClass}`.trim()} />
      {children}
    </As>
  );
}
