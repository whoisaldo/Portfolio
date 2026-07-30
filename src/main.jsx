// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// Self-hosted fonts. Previously a render-blocking third-party stylesheet from
// Google that requested 7 Fraunces variants and 8 Newsreader axes; same-origin
// woff2 means one connection, immutable caching via Vite's content hashes, and
// no third-party request at all.
//
// Axis choices, since these are the largest assets on the site after the key art:
//   Fraunces   `opsz` (wght + optical size). Optical size is what gives the
//              display cut its contrast at 17rem — it is the signature. The
//              `full` build also carries SOFT/WONK for +122 KB; SOFT 50 was a
//              detail nobody will miss, so index.css no longer requests it.
//   Newsreader `wght` only. Body-size text does not need an optical-size axis,
//              and `opsz` costs +156 KB.
//   JetBrains  `wght` normal only — italic mono is not used anywhere.
// Latin-ext is declared with a unicode-range, so English never downloads it.
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
