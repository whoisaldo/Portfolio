// src/components/demos/index.js: which projects have a working model.
//
// Each demo is its own chunk, fetched when the reader first switches a screen
// to it. The deck imports this map and nothing else from the folder, so a
// project without an entry here simply has no "Try it".
import { lazy } from "react";

export const DEMOS = {
  "eternal-monitor": lazy(() => import("./EternalMonitorDemo")),
  "eternal-exchange": lazy(() => import("./EternalExchangeDemo")),
  "exerly-fitness": lazy(() => import("./ExerlyDemo")),
  "eternal-rich-presence": lazy(() => import("./RichPresenceDemo")),
  "signature-cuts": lazy(() => import("./SignatureCutsDemo")),
};

export const hasDemo = (slug) => Boolean(DEMOS[slug]);
