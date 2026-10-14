#!/usr/bin/env node
// Generates the fictional demo illustrations in public/demo from the demo data.
// They are clearly labelled "DEMO" and stand in for real vehicle photos.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { vehicles } = JSON.parse(readFileSync(join(root, 'src/lib/data/demo/demo-vehicles.json'), 'utf8'));
mkdirSync(join(root, 'public/demo'), { recursive: true });

const COLORS = {
  silber: '#b8bec6',
  schwarz: '#22262b',
  weiß: '#f4f5f6',
  rot: '#b3261e',
  grau: '#6b7280',
  blau: '#1f4e8c',
  gelb: '#e0b000',
};
function paint(color = '') {
  const key = Object.keys(COLORS).find((k) => color.toLowerCase().includes(k));
  return key ? COLORS[key] : '#8a94a3';
}

// Side-view silhouettes (viewBox 800x450, ground at y=330).
const BODIES = {
  hatchback:
    'M150 320 L150 270 Q155 245 190 238 L265 228 L330 168 Q345 155 370 155 L520 155 Q548 155 565 175 L612 238 L655 248 Q672 255 672 280 L672 320 Z',
  sedan:
    'M120 320 L120 272 Q125 250 160 244 L250 232 L320 176 Q335 165 360 165 L500 165 Q525 165 545 182 L600 230 L680 240 Q700 245 700 275 L700 320 Z',
  estate:
    'M120 320 L120 272 Q125 250 160 244 L250 232 L320 172 Q335 160 360 160 L630 160 Q652 160 662 180 L690 240 Q700 252 700 280 L700 320 Z',
  van: 'M110 320 L110 200 Q112 150 160 140 L260 128 L640 128 Q690 128 696 180 L702 260 Q704 290 700 320 Z',
  suv: 'M130 320 L130 262 Q133 238 168 232 L250 222 L310 160 Q324 148 350 148 L600 148 Q628 148 642 170 L680 232 Q696 244 696 275 L696 320 Z',
};
const bodyFor = (type) => BODIES[type] ?? BODIES.sedan;

function svg({ fill, body, label, damage, caption }) {
  const highlight = damage
    ? `<g><circle cx="${damage.x}" cy="${damage.y}" r="62" fill="#c2410c" fill-opacity="0.18" stroke="#c2410c" stroke-width="5" stroke-dasharray="12 8"/><path d="M${damage.x - 22} ${damage.y - 18} l14 10 -8 12 18 6 -6 14" fill="none" stroke="#7c2d12" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${label}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef4"/><stop offset="1" stop-color="#cfd8e3"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect y="400" width="800" height="200" fill="#9aa5b1"/>
  <g transform="translate(0 70)">
    <ellipse cx="410" cy="335" rx="300" ry="18" fill="#000" fill-opacity="0.18"/>
    <path d="${body}" fill="${fill}" stroke="#1f2937" stroke-width="6" stroke-linejoin="round"/>
    <path d="M340 180 L515 180 L560 232 L300 232 Z" fill="#9fb4c8" fill-opacity="0.85" stroke="#1f2937" stroke-width="4"/>
    <circle cx="245" cy="320" r="48" fill="#1f2937"/><circle cx="245" cy="320" r="22" fill="#cbd5e1"/>
    <circle cx="590" cy="320" r="48" fill="#1f2937"/><circle cx="590" cy="320" r="22" fill="#cbd5e1"/>
    ${highlight}
  </g>
  <rect x="626" y="24" width="150" height="44" rx="8" fill="#c2410c"/>
  <text x="701" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">DEMO</text>
  <text x="400" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#0f172a">${caption}</text>
</svg>
`;
}

const DAMAGE_POSITIONS = {
  front: { x: 650, y: 270 },
  front_left: { x: 640, y: 270 },
  front_right: { x: 640, y: 270 },
  bumper_front: { x: 680, y: 290 },
  hood: { x: 600, y: 225 },
  rear: { x: 160, y: 270 },
  bumper_rear: { x: 135, y: 290 },
  trunk: { x: 175, y: 225 },
  rear_left: { x: 170, y: 270 },
  rear_right: { x: 170, y: 270 },
  right: { x: 420, y: 260 },
  left: { x: 420, y: 260 },
  roof: { x: 430, y: 160 },
  interior: { x: 430, y: 215 },
  engine_bay: { x: 620, y: 240 },
  underbody: { x: 420, y: 330 },
};

let count = 0;
for (const v of vehicles) {
  v.media.forEach((m, i) => {
    const damage = m.is_damage_view ? (v.damages[Math.max(0, i - 1)] ?? v.damages[0]) : null;
    const pos = damage ? (DAMAGE_POSITIONS[damage.area] ?? { x: 420, y: 260 }) : null;
    const caption = `${v.make} ${v.model} – ${m.caption ?? ''} (fiktive Illustration)`.replace(/&/g, '&amp;');
    const file = join(root, 'public', m.storage_path);
    writeFileSync(
      file,
      svg({
        fill: paint(v.color),
        body: bodyFor(v.body_type),
        label: m.alt_text.replace(/&/g, '&amp;'),
        damage: pos,
        caption,
      }),
    );
    count++;
  });
}
console.log(`${count} demo illustrations written to public/demo`);
