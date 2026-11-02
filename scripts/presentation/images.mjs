// Draws the presentation template's placeholder images into presentation-source/images/.
//
// Usage: node scripts/presentation/images.mjs <anima-design-to-code checkout>
//
// The images are abstract artwork, meant to be replaced. They are drawn with @napi-rs/canvas from the
// anima-design-to-code checkout (a dependency of the presentation compiler), so this repository needs
// no dependencies of its own.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const animaRepo = process.argv[2];
if (!animaRepo) {
  console.error('Usage: node scripts/presentation/images.mjs <anima-design-to-code checkout>');
  process.exit(2);
}
const require = createRequire(join(resolve(animaRepo), 'packages/presentation-compiler/package.json'));
const { createCanvas } = require('@napi-rs/canvas');

const outDir = resolve(import.meta.dirname, '../../presentation-source/images');
mkdirSync(outDir, { recursive: true });

/** A deterministic pseudo-random sequence, so the same script always draws the same bytes. */
function random(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function save(canvas, name) {
  const bytes = canvas.toBuffer('image/webp', 82);
  writeFileSync(join(outDir, name), bytes);
  console.log(`${name}: ${bytes.byteLength} bytes`);
}

/** Title slide: indigo to violet, with soft overlapping circles. */
function hero() {
  const canvas = createCanvas(1600, 900);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1600, 900);
  gradient.addColorStop(0, '#312e81');
  gradient.addColorStop(0.55, '#4f46e5');
  gradient.addColorStop(1, '#a855f7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1600, 900);
  const next = random(7);
  for (let index = 0; index < 14; index += 1) {
    const x = next() * 1600;
    const y = next() * 900;
    const r = 80 + next() * 260;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.08 + next() * 0.12})`);
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  save(canvas, 'hero.webp');
}

/** Image-and-text slide: a warm gradient under a grid of rounded tiles. */
function tiles() {
  const canvas = createCanvas(1200, 900);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 900, 1200, 0);
  gradient.addColorStop(0, '#f97316');
  gradient.addColorStop(1, '#facc15');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 900);
  const next = random(11);
  const size = 120;
  const gap = 30;
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + next() * 0.22})`;
      ctx.beginPath();
      ctx.roundRect(15 + column * (size + gap), 15 + row * (size + gap), size, size, 24);
      ctx.fill();
    }
  }
  save(canvas, 'tiles.webp');
}

/** Full-bleed slide: deep teal with flowing lines. */
function waves() {
  const canvas = createCanvas(1600, 900);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 900);
  gradient.addColorStop(0, '#042f2e');
  gradient.addColorStop(1, '#0f766e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.lineWidth = 2;
  for (let line = 0; line < 28; line += 1) {
    ctx.strokeStyle = `rgba(153, 246, 228, ${0.08 + (line / 28) * 0.35})`;
    ctx.beginPath();
    for (let x = 0; x <= 1600; x += 8) {
      const y = 260 + line * 18 + Math.sin(x / 210 + line * 0.35) * 70 + Math.sin(x / 90 + line) * 12;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  save(canvas, 'waves.webp');
}

hero();
tiles();
waves();
