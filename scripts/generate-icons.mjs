// PWA 图标生成器（纯 Node，无第三方依赖）
// 设计寓意：深绿圆 = 公园绿地；白色圆环 = 环形步道；四根柱 = Unity Towers（四省团结塔）；中心点 = 喷泉
// 用法: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');
mkdirSync(outDir, { recursive: true });

// ---- 最小 PNG 编码器 (RGBA8, non-interlaced) ----
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: None
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const GREEN = [20, 83, 45, 255];
const WHITE = [255, 255, 255, 255];

function makeIcon(size) {
  const c = size / 2;
  const px = Buffer.alloc(size * size * 4);
  const rBg = size * 0.46;
  const rRingInner = size * 0.31;
  const rRingOuter = size * 0.38;
  const rCore = size * 0.08;
  const rPillarIn = size * 0.235;
  const rPillarOut = size * 0.46;
  const pillarHalf = size * 0.027;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c + 0.5;
      const dy = y - c + 0.5;
      const d = Math.hypot(dx, dy);
      const idx = (y * size + x) * 4;
      let col = null;
      if (d <= rBg) {
        col = GREEN;
        if (d >= rRingInner && d <= rRingOuter) {
          col = WHITE;
        } else if (d <= rCore) {
          col = WHITE;
        } else {
          // 四根柱子：主轴 0 / π / ±π/2
          const abs = Math.abs(Math.atan2(dy, dx));
          const halfW = Math.atan(pillarHalf / d);
          const delta = Math.min(abs, Math.abs(Math.PI - abs), Math.abs(abs - Math.PI / 2));
          if (d >= rPillarIn && d <= rPillarOut && delta < halfW) col = WHITE;
        }
      }
      if (col) {
        px[idx] = col[0]; px[idx + 1] = col[1]; px[idx + 2] = col[2]; px[idx + 3] = col[3];
      } else {
        px[idx + 3] = 0;
      }
    }
  }
  return encodePNG(size, size, px);
}

writeFileSync(resolve(outDir, 'icon-192.png'), makeIcon(192));
writeFileSync(resolve(outDir, 'icon-512.png'), makeIcon(512));
console.log('Generated public/icons/icon-192.png and icon-512.png');
