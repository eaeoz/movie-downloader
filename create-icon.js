const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');
const zlib = require('zlib');

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createPNG(size) {
  const w = size, h = size;
  const stride = w * 4;
  const raw = Buffer.alloc(h * stride, 0);
  const cx = w / 2, cy = h / 2, r1 = w * 0.38, r2 = w * 0.15;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const teeth = 8;
      const mod = Math.cos(angle * teeth);
      const rr = r1 + r2 * 0.6 * mod;
      let on = false;
      if (dist < rr && dist > r2 * 0.6) on = true;
      const cx2 = cx + 0.12 * w * Math.cos(angle + teeth);
      const cy2 = cy + 0.12 * w * Math.sin(angle + teeth);
      const d2 = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2);
      if (d2 < w * 0.13) on = false;

      const idx = y * stride + x * 4;
      // Red background fill
      raw[idx] = 200;
      raw[idx + 1] = 35;
      raw[idx + 2] = 35;
      raw[idx + 3] = 255;
      // Draw white gear/sun shape on top
      if (on) {
        raw[idx] = 255;
        raw[idx + 1] = 255;
        raw[idx + 2] = 255;
      }
    }
  }

  const rgba = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = y * stride + x * 4;
      const di = (h - 1 - y) * stride + x * 4;
      rgba[di] = raw[si];
      rgba[di + 1] = raw[si + 1];
      rgba[di + 2] = raw[si + 2];
      rgba[di + 3] = raw[si + 3];
    }
  }

  const deflated = zlib.deflateSync(rgba, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([t, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, t, data, crcBuf]);
}

const sizes = [256, 64, 48, 32, 16];
const dir = join(__dirname, 'data');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const png256 = createPNG(256);
writeFileSync(join(dir, 'icon.png'), png256);

const pngs = sizes.map(s => createPNG(s));
let icoData = Buffer.alloc(6 + 16 * sizes.length);
icoData.writeUInt16LE(0, 0);
icoData.writeUInt16LE(1, 2);
icoData.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
for (let i = 0; i < sizes.length; i++) {
  const s = sizes[i];
  const png = pngs[i];
  const entryOff = 6 + i * 16;
  icoData[entryOff] = s >= 256 ? 0 : s;
  icoData[entryOff + 1] = s >= 256 ? 0 : s;
  icoData[entryOff + 2] = 0;
  icoData[entryOff + 3] = 0;
  icoData.writeUInt16LE(1, entryOff + 4);
  icoData.writeUInt16LE(1, entryOff + 6);
  icoData.writeUInt32LE(png.length, entryOff + 8);
  icoData.writeUInt32LE(offset, entryOff + 12);
  offset += png.length;
}
icoData = Buffer.concat([icoData, ...pngs]);

writeFileSync(join(dir, 'icon.ico'), icoData);
console.log('Icons generated in data/');
