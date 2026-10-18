// src/world/fetched.js: one of the city's files, whole, as an ArrayBuffer.
//
// The core's model and its props file are stored gzipped beside the plain
// ones (scripts/optimize-world.mjs): a third of the model and two thirds of
// the props file are JSON, quantised positions and their like, which a host
// sends whole if it does not compress .glb and .bin on its own, on the same
// line as everything else the page is fetching while the core is the file
// it waits on. A host that sends a .gz file with Content-Encoding (as `vite
// preview` does) has the browser unpack it; one that sends it as it is
// leaves a gzip stream, unpacked here. A browser without DecompressionStream
// is sent the plain file beside it. `onBytes(got, total)` follows the
// download, as a loader's progress would.

const PACKED = /\.gz(?=\?|$)/;

export async function fetchUnpacked(url, onBytes = null) {
  const packed = PACKED.test(url) && typeof DecompressionStream !== "undefined";
  const res = await fetch(PACKED.test(url) && !packed ? url.replace(PACKED, "") : url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  let body = res.body;
  const total = Number(res.headers.get("content-length")) || 0;
  if (onBytes && body) {
    let got = 0;
    body = body.pipeThrough(new TransformStream({
      transform(chunk, out) {
        got += chunk.byteLength;
        onBytes(Math.min(got, total || got), total);
        out.enqueue(chunk);
      },
    }));
  }
  const data = await new Response(body).arrayBuffer();
  const head = new Uint8Array(data, 0, Math.min(2, data.byteLength));
  if (!packed || head[0] !== 0x1f || head[1] !== 0x8b) return data;
  return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
