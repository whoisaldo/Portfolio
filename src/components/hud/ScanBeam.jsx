// src/components/hud/ScanBeam.jsx — hover-triggered hud scan line wrapper
import React from "react";

export default function ScanBeam({ children, className = "", ...rest }) {
  return (
    <div className={`scan-beam-host ${className}`} {...rest}>
      {children}
    </div>
  );
}
