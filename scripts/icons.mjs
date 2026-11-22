// Writes the PNG icons each app's manifest lists. Browsers want raster icons
// of at least 192px before they offer to install an app. The icons are a
// filled circle on a square, in each app's colour; no image library is needed.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const APPS = { notes: [0xf5, 0xb7, 0x00], tasks: [0x0e, 0x9f, 0x8e], main: [0x0f, 0x1c, 0x3f], reader: [0x3b, 0x6f, 0xe0], charts: [0xe0, 0x36, 0x4c] };
const INK = [0x0f, 0x1c, 0x3f], PAPER = [0xed, 0xf0, 0xf4];

const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(size, fg, bg) {
  const rows = Buffer.alloc((size * 3 + 1) * size);
  const r = size / 2, inner = size * 0.3;
  for (let y = 0; y < size; y++) {
    rows[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      const c = d < inner ? fg : d < inner * 1.35 ? INK : bg;
      rows.set(c, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [app, colour] of Object.entries(APPS)) {
  for (const size of [192, 512]) writeFileSync(new URL(`../sites/${app}/icon-${size}.png`, import.meta.url), png(size, colour, PAPER));
}
console.log("icons written");
