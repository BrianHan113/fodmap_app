// Generates simple PNG app icons (no dependencies): green background, white leaf.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function icon(size, maskable) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const r = maskable ? 0 : size * 0.22; // corner radius
  const s = maskable ? 0.62 : 0.78; // leaf scale
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      // rounded square mask
      const dx = Math.max(r - x, 0, x - (size - 1 - r));
      const dy = Math.max(r - y, 0, y - (size - 1 - r));
      const inside = dx * dx + dy * dy <= r * r;
      if (!inside) { raw[i + 3] = 0; continue; }
      // normalized coords, rotated 45deg
      const u = (x / size - 0.5) / s, v = (y / size - 0.5) / s;
      const a = (u + v) / Math.SQRT2, b = (v - u) / Math.SQRT2;
      // leaf = intersection of two circles
      const R = 0.42, off = 0.26;
      const leaf = (a * a + (b - off) ** 2 < R * R) && (a * a + (b + off) ** 2 < R * R);
      const vein = Math.abs(b) < 0.018 && Math.abs(a) < 0.28;
      let col = [47, 133, 90];
      if (leaf) col = vein ? [47, 133, 90] : [255, 255, 255];
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2]; raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icons/icon-192.png', icon(192, false));
writeFileSync('public/icons/icon-512.png', icon(512, false));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, true));
