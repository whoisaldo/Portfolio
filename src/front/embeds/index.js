// src/front/embeds/index.js: the live pieces a post can place with
// <div data-embed="name"></div>. BlogPost.jsx mounts them. Each is its own
// lazy chunk, fetched only by a post that carries its placeholder, so the
// other articles, the homepage and the playground never download it. The
// placeholder holds the embed's box while the chunk loads; see front.css.
import { lazy } from "react";

export const embeds = {
  "eddies-compare": lazy(() => import("./EddiesCompare")),
};
