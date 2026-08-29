// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

// Self-hosted fonts. Same-origin woff2 means one connection, immutable caching
// via Vite's content hashes, and no third-party request at all.
//
// Three faces, three jobs, and the weights are enumerated rather than imported
// wholesale because each line below is a separate file on the wire:
//
//   Chakra Petch  display. The closest free relative of Blender Pro, the face
//                 Cyberpunk 2077 actually brands with. Its corners are cut in
//                 the glyph outlines themselves rather than faked in CSS.
//                 500/600/700; no italics, because italic on a squared techno
//                 face reads as a rendering error.
//   Barlow        prose. The case studies are long and a display face cannot
//                 carry them. 400 for body, 500 for UI, 600 so that any bold
//                 is a real cut instead of a synthesized smear.
//   JetBrains     data. Variable `wght`, normal only; italic mono is unused.
//
// The `latin-` prefix is the point: these are the latin-subset stylesheets, so
// nothing declares a font-face for the vietnamese or latin-ext ranges the site
// will never render.
//
// This replaced Fraunces (`opsz` + `opsz-italic`) and Newsreader (`wght` +
// `wght-italic`): four large variable files for six small static subsets.
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-500.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
