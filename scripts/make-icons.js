// Generates simple PNG app icons (red square, white disc, red "!") with no dependencies.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const RED = [179, 38, 30], WHITE = [255, 255, 255];
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c;
      let col = RED;
      if (Math.hypot(dx, dy) < size * 0.34) {
        col = WHITE;
        const bar = Math.abs(dx) < size * 0.04 && y > size * 0.28 && y < size * 0.58;
        const dot = Math.hypot(dx, y - size * 0.68) < size * 0.05;
        if (bar || dot) col = RED;
      }
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, "..", "site");
for (const s of [192, 512]) {
  fs.writeFileSync(path.join(out, `icon-${s}.png`), png(s));
  console.log(`wrote site/icon-${s}.png`);
}
