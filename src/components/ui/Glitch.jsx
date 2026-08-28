// src/components/ui/Glitch.jsx — text that resolves out of noise on entry.
//
// The effect is punctuation, not atmosphere. It fires once, when the heading
// arrives, and then the page is still. Nothing here loops — an earlier version
// of this site had seven things pulsing at once and the fix was to cut it to
// one, which is a discipline worth keeping through a theme change.
//
// The real string is always in the DOM. The animated copy is aria-hidden and
// the untouched one is sr-only, so a screen reader is never read a line of
// `#%&/<>[]` and a crawler never indexes one. That split is the whole reason
// this is a component rather than a bare useDecode() call at each site.
import React, { useRef } from "react";
import { useInView } from "framer-motion";
import { useDecode } from "../../hooks";

export default function Glitch({
  children,
  as: As = "span",
  className = "",
  duration = 650,
  ...rest
}) {
  const ref = useRef(null);
  // `once` because a heading that re-decodes every time it re-enters the
  // viewport turns a scroll back up the page into a light show.
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  const text = String(children);
  const shown = useDecode(text, { active: inView, duration });

  return (
    <As ref={ref} className={className} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </As>
  );
}
