// Checks that every template folder is what the Agent Grid template catalog expects, with no
// dependencies, so it runs in CI as is. The presentation's full format lint runs in
// scripts/build-presentation.sh, which needs the (unpublished) presentation compiler.
//
// Usage: node scripts/validate.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const problems = [];
const fail = (message) => problems.push(message);

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/** Agent Grid skips hidden files and shell/executable files on import, so a template must not rely on them. */
function checkImportable(folder) {
  for (const path of filesUnder(join(root, folder))) {
    const rel = relative(join(root, folder), path);
    if (rel.split('/').some((part) => part.startsWith('.'))) fail(`${folder}/${rel}: hidden files are not imported`);
    if (/\.(sh|bash|exe|bat|cmd|ps1)$/i.test(rel)) fail(`${folder}/${rel}: executable files are not imported`);
  }
}

function checkReact() {
  const dir = join(root, 'react');
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (!pkg.dependencies?.react || !pkg.dependencies?.['react-dom']) fail('react: package.json must depend on react and react-dom');
  if (!existsSync(join(dir, 'src/main.tsx'))) fail('react: src/main.tsx is the entry Agent Grid previews');
  if (existsSync(join(dir, 'tailwind.config.js')) || existsSync(join(dir, 'tailwind.config.ts')))
    fail('react: the template uses plain CSS, not Tailwind');
  checkImportable('react');
}

function checkHtml() {
  const dir = join(root, 'html');
  if (!existsSync(join(dir, 'index.html'))) fail('html: index.html is required');
  if (existsSync(join(dir, 'package.json'))) fail('html: a package.json would make Agent Grid treat it as a JavaScript app');
  checkImportable('html');
}

function checkPresentation() {
  const dir = join(root, 'presentation');
  const manifestPath = join(dir, 'presentation.json');
  if (!existsSync(manifestPath)) return fail('presentation: presentation.json is required');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.slides?.length) fail('presentation: the manifest lists no slides');
  for (const entry of [...(manifest.slides ?? []), ...(manifest.layouts ?? [])]) {
    if (!existsSync(join(dir, entry.file))) fail(`presentation: ${entry.file} is listed but missing`);
  }
  const mediaDir = join(dir, 'media');
  const media = existsSync(mediaDir) ? readdirSync(mediaDir) : [];
  if (media.length === 0) fail('presentation: the template should show images (media/ is empty)');
  for (const name of media) {
    const match = /^([0-9a-f]{64})\.[a-z0-9]+$/.exec(name);
    if (!match) {
      fail(`presentation: media/${name} must be named <sha256>.<ext>`);
      continue;
    }
    const sha = createHash('sha256').update(readFileSync(join(mediaDir, name))).digest('hex');
    if (sha !== match[1]) fail(`presentation: media/${name} does not hash to its name`);
  }
  for (const path of filesUnder(dir).filter((file) => file.endsWith('.html'))) {
    for (const [, ref] of readFileSync(path, 'utf8').matchAll(/\.\.\/media\/([0-9a-f]{64}\.[a-z0-9]+)/g)) {
      if (!media.includes(ref)) fail(`presentation: ${relative(dir, path)} references missing media/${ref}`);
    }
  }
  checkImportable('presentation');
}

checkReact();
checkHtml();
checkPresentation();

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log('✓ react, html and presentation templates are valid');
