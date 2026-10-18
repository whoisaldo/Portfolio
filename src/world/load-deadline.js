// A stalled response must release its cache entry so an explicit retry can
// make a fresh request. Parsing also has a deadline, even if it ignores abort.
export function withLoadDeadline(load, ms = 20000) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("The workshop download took too long. Please try again.");
      controller.abort(error);
      reject(error);
    }, ms);
  });
  return Promise.race([Promise.resolve().then(() => load(controller.signal)), deadline]).finally(() => clearTimeout(timer));
}

// Own the network request instead of leaving a timed-out FileLoader request
// in Three's shared pending map, where it would trap the next retry too.
export function loadModelWithDeadline(url, loader, priority = "auto") {
  return withLoadDeadline(async (signal) => {
    const response = await fetch(url, { signal, priority });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const data = await response.arrayBuffer();
    return loader.parseAsync(data, url.slice(0, url.lastIndexOf("/") + 1));
  });
}
