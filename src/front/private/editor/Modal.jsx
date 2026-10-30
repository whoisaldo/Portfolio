// src/front/private/editor/Modal.jsx: a modal <dialog> for the version
// history, its restore question and the Publish dialog.
//
// Shown with showModal(), so the page behind is inert (the editor too: no
// typing into a draft while it is being published) and focus stays inside.
// In document.body, so nothing of the toolbar it was opened from styles it.
// The browser's Escape would close it behind React's back, so it asks
// `onClose` instead.
import React, { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./dialogs.css";

export default function Modal({ label, className = "", onClose, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.open && el.close();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`owner-dialog ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}
