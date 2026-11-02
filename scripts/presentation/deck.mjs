// Writes the presentation template's source, presentation-source/deck.presentation-ir.json, and its
// media/ folder: an agent-written Presentation IR that the presentation compiler turns into the
// presentation format committed under presentation/.
//
// Usage: node scripts/presentation/deck.mjs
//
// The deck is a set of reusable slide patterns (title, agenda, section, image and text, key numbers,
// full-bleed image, closing) on one theme. Edit this file, then rebuild with scripts/build-presentation.sh.
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../presentation-source');
const W = 960;
const H = 540;
const MARGIN = 64;

// Theme.

const hex = (value) => {
  const n = Number.parseInt(value.slice(1), 16);
  const unit = (shift) => Math.round((((n >> shift) & 255) / 255) * 100000) / 100000;
  return { kind: 'rgb', space: 'srgb', r: unit(16), g: unit(8), b: unit(0), a: 1 };
};

const THEME_COLORS = {
  dk1: '#1c1c1a',
  lt1: '#ffffff',
  dk2: '#1e1b4b',
  lt2: '#f4f4f0',
  accent1: '#4f46e5',
  accent2: '#a855f7',
  accent3: '#f97316',
  accent4: '#0f766e',
  accent5: '#facc15',
  accent6: '#64748b',
  hlink: '#4f46e5',
  folHlink: '#7c3aed',
};

const theme = (slot) => ({ kind: 'theme', slot, mods: [] });
const TEXT = theme('tx1');
const MUTED = hex('#6b6b66');
const WHITE = theme('bg1');
const ACCENT = theme('accent1');

// Media: each image is named by the SHA-256 of its bytes, as the compiler's media folder expects.

const IMAGE_SIZES = { 'hero.webp': [1600, 900], 'tiles.webp': [1200, 900], 'waves.webp': [1600, 900] };
rmSync(join(root, 'media'), { recursive: true, force: true });
mkdirSync(join(root, 'media'), { recursive: true });
const media = {};
const image = {};
for (const [name, [width, height]] of Object.entries(IMAGE_SIZES)) {
  const path = join(root, 'images', name);
  const bytes = readFileSync(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  copyFileSync(path, join(root, 'media', `${sha256}.webp`));
  media[sha256] = { sha256, type: 'image/webp', bytes: bytes.byteLength, width, height, origin: { kind: 'agent' } };
  image[name] = { sha256, aspect: width / height };
}

// Elements.

/** IR node ids carry a two-letter namespace; `ag` marks this template's own nodes. */
const id = (name) => `ag-${name}`;
const origin = { kind: 'agent' };
const frame = (x, y, w, h) => ({ x, y, w, h, rotation: 0, flipH: false, flipV: false });
const rect = { kind: 'preset', name: 'rect', adjust: {} };

/** One paragraph of text: `runs` is a string or a list of [text, run props] pairs. */
function paragraph(runs, props = {}, level = 0) {
  const list = typeof runs === 'string' ? [[runs, {}]] : runs;
  return {
    level,
    props,
    inlines: list.map(([text, run]) => ({ kind: 'run', text, props: run })),
  };
}

/** A text box: a shape with no fill or outline. */
const textBody = (anchor = 'top', inset = 0) => ({
  anchor,
  autofit: { kind: 'none' },
  wrap: 'square',
  insets: { l: inset, r: inset, t: inset, b: inset },
});

function textBox(name, [x, y, w, h], paragraphs, { anchor = 'top', inset = 0 } = {}) {
  return {
    kind: 'shape',
    id: id(name),
    origin,
    frame: frame(x, y, w, h),
    geometry: rect,
    fill: { kind: 'none' },
    text: { body: textBody(anchor, inset), paragraphs },
  };
}

function box(name, [x, y, w, h], color) {
  return { kind: 'shape', id: id(name), origin, frame: frame(x, y, w, h), geometry: rect, fill: { kind: 'solid', color } };
}

/** A picture filling its frame, cropped (never stretched) to the frame's aspect ratio. */
function picture(name, [x, y, w, h], file, alt) {
  const { sha256, aspect } = image[file];
  const target = w / h;
  const grid = (value) => Math.round(value * 100000) / 100000;
  const side = grid(target < aspect ? (1 - target / aspect) / 2 : (1 - aspect / target) / 2);
  const crop = target < aspect ? { l: side, r: side, t: 0, b: 0 } : { l: 0, r: 0, t: side, b: side };
  return { kind: 'picture', id: id(name), origin, frame: frame(x, y, w, h), media: sha256, alt, crop };
}

const pt = (value) => ({ kind: 'pt', value });
const run = (size, color, extra = {}) => ({ size, color, ...extra });
const BOLD = { weight: 700 };

const title = (text, color = TEXT, size = 36) => paragraph([[text, run(size, color, BOLD)]]);
const body = (text, color = MUTED, size = 18) => paragraph([[text, run(size, color)]], { spaceAfter: pt(10) });
const bullet = (text, size = 20) =>
  paragraph([[text, run(size, TEXT)]], {
    bullet: { kind: 'char', char: '•', color: ACCENT },
    marginLeft: 24,
    indent: -24,
    spaceAfter: pt(12),
  });

// Layouts: the decoration a slide pattern shares. Slides hold all of their own content.

const layout = (key, name, extra = {}) => ({
  id: id(key),
  name,
  origin,
  master: id('master'),
  showMaster: true,
  elements: [],
  ...extra,
});
const dark = { background: { kind: 'solid', color: theme('tx2') } };
const layouts = Object.fromEntries(
  [
    layout('l.title', 'Title'),
    layout('l.content', 'Title and content', { elements: [box('l.content.rule', [MARGIN, 56, 48, 6], ACCENT)] }),
    layout('l.section', 'Section header', dark),
    layout('l.image-text', 'Image and text'),
    layout('l.full-image', 'Full image'),
    layout('l.closing', 'Closing', dark),
  ].map((entry) => [entry.id, entry])
);

// Slides.

const slide = (key, layoutKey, elements, notes) => ({
  id: id(key),
  origin,
  layout: id(`l.${layoutKey}`),
  hidden: false,
  showLayout: true,
  timeline: [],
  elements,
  ...(notes ? { notes: { body: textBody(), paragraphs: [paragraph(notes)] } } : {}),
});

const stat = (id, x, value, label) => [
  textBox(`${id}.value`, [x, 200, 256, 80], [paragraph([[value, run(56, ACCENT, BOLD)]])]),
  textBox(`${id}.label`, [x, 290, 256, 80], [body(label)]),
];

const slides = [
  slide(
    'title',
    'title',
    [
      picture('title.image', [0, 0, W, H], 'hero.webp', 'Abstract indigo and violet gradient'),
      textBox('title.heading', [MARGIN, 190, 640, 140], [title('Presentation title', WHITE, 54)], {
        anchor: 'bottom',
      }),
      textBox('title.subtitle', [MARGIN, 342, 640, 60], [body('A subtitle that frames the story', WHITE, 22)]),
    ],
    'Open with the one sentence you want the audience to remember.'
  ),
  slide('agenda', 'content', [
    textBox('agenda.heading', [MARGIN, 80, W - 2 * MARGIN, 60], [title('Agenda')]),
    textBox('agenda.list', [MARGIN, 160, W - 2 * MARGIN, 320], [
      bullet('Where we are today'),
      bullet('What we learned'),
      bullet('What we will do next'),
      bullet('What we need from you'),
    ]),
  ]),
  slide('section', 'section', [
    textBox('section.heading', [MARGIN, 200, W - 2 * MARGIN, 80], [title('Section title', WHITE, 48)], {
      anchor: 'bottom',
    }),
    textBox('section.subtitle', [MARGIN, 292, W - 2 * MARGIN, 40], [body('One line on what this part covers', WHITE, 20)]),
  ]),
  slide('image-text', 'image-text', [
    picture('image-text.image', [0, 0, 420, H], 'tiles.webp', 'Abstract orange tiles'),
    textBox('image-text.heading', [480, 80, 416, 100], [title('An idea with a picture', TEXT, 32)], {
      anchor: 'bottom',
    }),
    textBox('image-text.body', [480, 196, 416, 120], [
      body('Pair one image with a short explanation. Keep the text to what the image cannot say on its own.'),
    ]),
    textBox('image-text.points', [480, 268, 416, 160], [bullet('First supporting point', 18), bullet('Second supporting point', 18)]),
  ]),
  slide('numbers', 'content', [
    textBox('numbers.heading', [MARGIN, 80, W - 2 * MARGIN, 60], [title('Key numbers')]),
    ...stat('numbers.first', MARGIN, '42%', 'Growth in active users this quarter'),
    ...stat('numbers.second', MARGIN + 288, '3.5x', 'Faster from idea to first draft'),
    ...stat('numbers.third', MARGIN + 576, '120', 'Teams already on board'),
  ]),
  slide('statement', 'full-image', [
    picture('statement.image', [0, 0, W, H], 'waves.webp', 'Abstract teal waves'),
    textBox(
      'statement.quote',
      [MARGIN, 150, W - 2 * MARGIN, 240],
      [paragraph([['“A single bold statement, set large over an image.”', run(40, WHITE, BOLD)]], { align: 'center' })],
      { anchor: 'middle' }
    ),
  ]),
  slide('closing', 'closing', [
    textBox('closing.heading', [MARGIN, 200, W - 2 * MARGIN, 80], [title('Thank you', WHITE, 54)], { anchor: 'bottom' }),
    textBox('closing.contact', [MARGIN, 292, W - 2 * MARGIN, 40], [body('name@example.com', WHITE, 20)]),
  ]),
];

const deck = {
  $schema: 'https://schemas.animaapp.com/presentation-ir.schema.json',
  phase: 'source',
  // Paragraph and run defaults per level, as PowerPoint states them; the compiler cascades text over them.
  defaults: JSON.parse(readFileSync(join(import.meta.dirname, 'defaults.json'), 'utf8')),
  fonts: {},
  size: { w: W, h: H },
  themes: {
    [id('theme')]: {
      id: id('theme'),
      name: 'Agent Grid',
      origin,
      colors: Object.fromEntries(Object.entries(THEME_COLORS).map(([slot, value]) => [slot, hex(value)])),
      fonts: { major: { latin: 'Arial' }, minor: { latin: 'Arial' } },
    },
  },
  masters: {
    [id('master')]: {
      id: id('master'),
      origin,
      theme: id('theme'),
      colorMap: {
        bg1: 'lt1',
        tx1: 'dk1',
        bg2: 'lt2',
        tx2: 'dk2',
        accent1: 'accent1',
        accent2: 'accent2',
        accent3: 'accent3',
        accent4: 'accent4',
        accent5: 'accent5',
        accent6: 'accent6',
        hlink: 'hlink',
        folHlink: 'folHlink',
        dk1: 'dk1',
        lt1: 'lt1',
        dk2: 'dk2',
        lt2: 'lt2',
      },
      background: { kind: 'solid', color: theme('bg1') },
      elements: [],
    },
  },
  layouts,
  slides,
  media,
};

writeFileSync(join(root, 'deck.presentation-ir.json'), `${JSON.stringify(deck, null, 2)}\n`);
console.log(`deck.presentation-ir.json: ${slides.length} slides, ${Object.keys(media).length} images`);
