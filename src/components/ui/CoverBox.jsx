// src/components/ui/CoverBox.jsx: object-fit: cover, with children that stay
// pinned to the picture.
//
// `object-fit: cover` on an <img> is the right way to fill a frame, and the
// wrong way to put anything ON the image: a hotspot at `left: 63%` is 63% of
// the frame, and the frame has cropped some unknown amount off one axis, so
// the marker lands on the wrong part of the car the moment the aspect ratios
// differ. The garage pins parts on three photographs of three different
// shapes, and the hero mounts signage on a skyline that is cropped
// differently on every viewport.
//
// So this does the cover arithmetic itself: it measures the frame, sizes an
// inner box to the image's aspect at whatever scale covers the frame, and
// places it so `focus` (a point in the image, in percent) lands at the same
// percentage of the frame, which is exactly what `object-position` does.
// Everything rendered inside the inner box, the picture included, uses
// percentages of the PICTURE, and stays put under any crop.
//
// useLayoutEffect rather than useEffect so the first paint already has the
// measured size; a ResizeObserver keeps it right after that.
import React, { useLayoutEffect, useRef, useState } from "react";

export default function CoverBox({
  width,
  height,
  focus = { x: 50, y: 50 },
  className = "",
  innerClassName = "",
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !width || !height) return;
    const measure = () => {
      const fw = el.clientWidth;
      const fh = el.clientHeight;
      if (!fw || !fh) return;
      const scale = Math.max(fw / width, fh / height);
      const w = width * scale;
      const h = height * scale;
      setBox({
        width: w,
        height: h,
        left: (fw - w) * (focus.x / 100),
        top: (fh - h) * (focus.y / 100),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, focus.x, focus.y]);

  // The frame is the positioning context for the inner box. A caller that
  // positions the frame itself (the hero passes `absolute inset-0`) keeps its
  // own position; anything else gets `relative`.
  const positioned = /\b(absolute|fixed|sticky)\b/.test(className);

  return (
    // `overflow: clip`, not `hidden`: a hidden overflow is still a scroll
    // container, so focusing (or scrollIntoView on) a child near the crop's
    // edge would scroll the frame and quietly shift the picture off its
    // focus. Clip cannot scroll.
    <div ref={ref} className={`${positioned ? "" : "relative"} overflow-clip ${className}`} style={style} {...rest}>
      <div
        className={`absolute ${innerClassName}`}
        style={
          box
            ? {
                width: box.width,
                height: box.height,
                left: box.left,
                top: box.top,
                // For children that size themselves to the picture (the
                // skyline's signage), not to the viewport.
                "--cover-w": `${box.width}px`,
              }
            : // Before the first measurement: the CSS approximation of the
              // same placement, so nothing flashes at the wrong size.
              { inset: 0 }
        }
      >
        {children}
      </div>
    </div>
  );
}
