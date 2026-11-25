// Writes the PNG icons each app's manifest lists. Browsers want raster icons
// of at least 192px before they offer to install an app. Each icon is a crisp
// rounded architectural badge with a diagonal routing stripe in the app's own
// colour; no image library is needed.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const APPS = {
  main: [0xd9, 0x4f, 0x2b],
  "main/census": [0xd9, 0x4f, 0x2b],
  notes: [0xb0, 0x6e, 0x00],
  tasks: [0x1c, 0x7c, 0x54],
  reader: [0x2a, 0x5c, 0xc2],
  charts: [0xb8, 0x29, 0x3d],
  wallet: [0x0b, 0x6e, 0x7a],
  moved: [0x6b, 0x4f, 0x2a],
  "main/moving": [0x6b, 0x4f, 0x2a],
};
const INK = [0x17, 0x1a, 0x18], PAPER = [0xf7, 0xf5, 0xf0], WHITE = [0xff, 0xff, 0xff];

const table = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function inRoundRect(x, y, x0, y0, w, h, r) {
  if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false;
  const rx = Math.max(x0 + r - x, 0, x - (x0 + w - r));
  const ry = Math.max(y0 + r - y, 0, y - (y0 + h - r));
  return rx * rx + ry * ry <= r * r;
}
function png(size, fg) {
  const rows = Buffer.alloc((size * 3 + 1) * size);
  const pad = Math.round(size * 0.14);
  const w = size - pad * 2;
  const r = Math.round(size * 0.16);
  const border = Math.max(3, Math.round(size * 0.035));
  const stripe = size * 0.08;
  for (let y = 0; y < size; y++) {
    rows[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let c = PAPER;
      if (inRoundRect(x, y, pad, pad, w, w, r)) {
        if (!inRoundRect(x, y, pad + border, pad + border, w - border * 2, w - border * 2, Math.max(2, r - border))) {
          c = INK;
        } else {
          // Crisp diagonal routing bar across the inner badge
          const diag = Math.abs((x + y) - size);
          c = diag < stripe ? WHITE : fg;
        }
      }
      rows.set(c, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", head), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [app, colour] of Object.entries(APPS)) {
  for (const size of [192, 512]) writeFileSync(new URL(`../sites/${app}/icon-${size}.png`, import.meta.url), png(size, colour));
}
console.log("icons written");
