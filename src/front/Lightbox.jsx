// src/front/Lightbox.jsx: a photo, full size, over the page.
//
// A native <dialog> opened with showModal(), so the browser does the parts
// that are easy to get wrong by hand: focus moves into it and stays there,
// the page behind is inert, and Esc closes it. Left and right step through
// the rest; a click anywhere outside the photo closes it. The arrows sit
// either side of the photo, and under it on a phone, where either side is
// on top of it.
import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const control =
  "flex size-11 items-center justify-center rounded-full bg-ink/80 text-bone transition-colors duration-150 hover:bg-volt hover:text-ink";

export default function Lightbox({ photos, index, onChange, onClose }) {
  const dialog = useRef(null);
  const photo = index === null ? null : photos[index];

  // The dialog's open state lives in the DOM, so it is synced to React here.
  useEffect(() => {
    const d = dialog.current;
    if (photo && !d.open) d.showModal();
    if (!photo && d.open) d.close();
  }, [photo]);

  const step = (by) => onChange((index + by + photos.length) % photos.length);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      aria-label="Photo"
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/90"
    >
      {photo && (
        <div
          className="relative flex size-full items-center justify-center px-4 pb-24 pt-20 sm:p-16"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <img
            key={photo.large ?? photo.src}
            src={photo.large ?? photo.src}
            alt={photo.alt}
            className="chamfer max-h-full max-w-full object-contain"
          />
          <button type="button" onClick={onClose} aria-label="Close" className={`${control} absolute right-4 top-4`}>
            <X className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={`${control} absolute bottom-6 left-[calc(50%-3.5rem)] sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-y-1/2`}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next photo" className={`${control} absolute bottom-6 right-[calc(50%-3.5rem)] sm:bottom-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2`}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </dialog>
  );
}
