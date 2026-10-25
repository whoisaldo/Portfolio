// src/front/embeds/index.js: the live pieces a post can place with
// <div data-embed="name"></div>. BlogPost.jsx mounts them; they load with
// its chunk, so the homepage and the playground never carry them.
import EddiesCompare from "./EddiesCompare";

export const embeds = {
  "eddies-compare": EddiesCompare,
};
