// test/dom.mjs: a browser's globals for the editor's tests, from happy-dom.
//
// Imported first by each test file. The editor's modules use `document` the
// way a page does; here it is happy-dom's, with nothing loaded over the
// network.
import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost/", settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true, disableIframePageLoading: true } });

for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis || key.startsWith("_")) continue;
  try {
    globalThis[key] = window[key];
  } catch {
    // A getter that throws outside its window: not one the editor needs.
  }
}
for (const key of ["window", "document", "navigator", "Node", "Element", "HTMLElement", "Text", "Range", "DocumentFragment", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
  Object.defineProperty(globalThis, key, { value: key === "window" ? window : window[key], configurable: true, writable: true });
}

export { window };
