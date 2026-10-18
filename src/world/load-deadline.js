// A stalled response must release its cache entry so an explicit retry can
// make a fresh request. Received bytes restart the inactivity timer; parsing
// gets the same allowance from the last chunk, even if it ignores abort.
export function withLoadDeadline(load, ms = 20000) {
  const controller = new AbortController();
  let timer, rejectDeadline, settled = false;
  const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
  const touch = () => {
    if (settled) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const error = Object.assign(new Error("The workshop download stopped responding. Please try again."), { code: "load-stalled" });
      controller.abort(error);
      rejectDeadline(error);
    }, ms);
  };
  touch();
  return Promise.race([Promise.resolve().then(() => load(controller.signal, touch)), deadline]).finally(() => {
    settled = true;
    clearTimeout(timer);
  });
}

// Own the network request instead of leaving a timed-out FileLoader request
// in Three's shared pending map, where it would trap the next retry too.
export function loadModelWithDeadline(url, loader, priority = "auto") {
  return withLoadDeadline(async (signal, touch) => {
    const response = await fetch(url, { signal, priority });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value.byteLength) continue;
        touch();
        chunks.push(value);
        length += value.byteLength;
      }
    } finally {
      reader.releaseLock();
    }
    const data = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
    return loader.parseAsync(data.buffer, url.slice(0, url.lastIndexOf("/") + 1));
  });
}

// A transient district stall gets one fresh request after its failed cache
// entry is cleared. Permanent failures and a second stall still terminate.
export async function retryStalledLoad(load, canRetry = () => true) {
  try { return await load(); }
  catch (error) {
    if (error.code !== "load-stalled" || !canRetry()) throw error;
    return load();
  }
}
