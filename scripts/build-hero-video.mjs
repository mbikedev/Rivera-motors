#!/usr/bin/env node
// Builds the home hero background video (public/hero/hero-damaged-cars.mp4 + hero-poster.webp):
// a tilted wall of damaged-car photos scrolling slowly, looping seamlessly.
//
// Usage: node scripts/build-hero-video.mjs <photo-dir>
//   <photo-dir> holds the source photos (.webp/.jpg/.png), e.g. the demo images downloaded from the
//   Supabase bucket vehicle-media/demo-v2. Requires ffmpeg on the PATH; sharp comes with Next.js.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/build-hero-video.mjs <photo-dir>');
  process.exit(1);
}
const out = path.join(import.meta.dirname, '..', 'public', 'hero');
const photos = readdirSync(src)
  .filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
  .sort()
  .map((f) => path.join(src, f));
if (photos.length < 8) throw new Error(`Need at least 8 photos in ${src}, found ${photos.length}`);

const TILE_W = 260,
  TILE_H = 128,
  GAP = 14,
  COLS = 8,
  ROWS = 8;
const CELL_W = TILE_W + GAP,
  CELL_H = TILE_H + GAP;
const PATTERN_W = COLS * CELL_W,
  PATTERN_H = ROWS * CELL_H;
const BG = { r: 15, g: 42, b: 68 }; // brand primary #0f2a44
const W = 1280,
  H = 720,
  FPS = 30,
  SECONDS = 30,
  ANGLE = -10;

// Spread photos so the same car never sits next to itself: walk the list with a stride coprime to its length.
let stride = 7;
while (gcd(stride, photos.length) !== 1) stride++;
const tiles = await Promise.all(photos.map((p) => sharp(p).resize(TILE_W, TILE_H, { fit: 'cover' }).toBuffer()));
const composites = [];
for (let copy = 0; copy < 2; copy++)
  // two stacked copies: scrolling one pattern height loops seamlessly
  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS,
      row = Math.floor(i / COLS);
    composites.push({
      input: tiles[(i * stride) % tiles.length],
      left: col * CELL_W + GAP / 2 + (row % 2) * Math.round(CELL_W / 2), // brick offset on odd rows
      top: copy * PATTERN_H + row * CELL_H + GAP / 2,
    });
  }

const tmp = mkdtempSync(path.join(tmpdir(), 'hero-'));
try {
  const wall = path.join(tmp, 'wall.png');
  await sharp({ create: { width: PATTERN_W, height: PATTERN_H * 2, channels: 3, background: BG } })
    .composite(composites.filter((c) => c.left + TILE_W <= PATTERN_W))
    .png()
    .toFile(wall);

  // Scroll a window up the wall by exactly one pattern height, then tilt it and crop to 1280×720.
  const winW = 1520,
    winH = 1000;
  const filter = [
    `crop=${winW}:${winH}:${(PATTERN_W - winW) / 2}:'${PATTERN_H}-mod(t*${PATTERN_H / SECONDS}\\,${PATTERN_H})'`,
    `rotate=${ANGLE}*PI/180:ow=${W}:oh=${H}:c=0x0f2a44`,
    `fps=${FPS}`,
    'format=yuv420p',
  ].join(',');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-loop',
      '1',
      '-framerate',
      String(FPS),
      '-i',
      wall,
      '-vf',
      filter,
      '-t',
      String(SECONDS),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '29',
      '-profile:v',
      'high',
      '-movflags',
      '+faststart',
      '-an',
      path.join(out, 'hero-damaged-cars.mp4'),
    ],
    { stdio: 'inherit' },
  );

  const frame = path.join(tmp, 'poster.png');
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    path.join(out, 'hero-damaged-cars.mp4'),
    '-frames:v',
    '1',
    frame,
  ]);
  await sharp(frame).webp({ quality: 78 }).toFile(path.join(out, 'hero-poster.webp'));
  console.log(`Built hero video from ${photos.length} photos into ${out}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}
