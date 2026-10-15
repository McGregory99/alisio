import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT_NAME, DISCLAIMER } from '../../src/ui/branding.mjs';

// R7.8: product name, persistent disclaimer, no forbidden terms in the name, no logos.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'src/ui/styles.css'), 'utf8');
const FORBIDDEN_IN_NAME = /\b(sentinel|copernicus|esa|inta)\b/i;

test('product name is exactly "Alisio - Maspalomas Ground Station Watch"', () => {
  assert.equal(PRODUCT_NAME, 'Alisio - Maspalomas Ground Station Watch');
  assert.match(html, /<title>Alisio - Maspalomas Ground Station Watch<\/title>/);
});

test('product name and page title contain none of Sentinel, Copernicus, ESA, INTA', () => {
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  assert.doesNotMatch(PRODUCT_NAME, FORBIDDEN_IN_NAME);
  assert.doesNotMatch(title, FORBIDDEN_IN_NAME);
});

test('disclaimer string is exact and present in the static page', () => {
  assert.equal(DISCLAIMER, 'Unofficial and illustrative. Not affiliated with ESA, the European Commission or INTA.');
  assert.match(html, /<div id="disclaimer"[^>]*>Unofficial and illustrative\. Not affiliated with ESA, the European Commission or INTA\.<\/div>/);
});

test('disclaimer is always visible: fixed, never hidden, above panels', () => {
  const rule = css.match(/#disclaimer\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /position:\s*fixed/);
  assert.doesNotMatch(rule, /display:\s*none|visibility:\s*hidden|opacity:\s*0\b/);
  assert.doesNotMatch(css, /#disclaimer[^{]*\{[^}]*display:\s*none/);
  const z = Number(rule.match(/z-index:\s*(\d+)/)?.[1]);
  assert.ok(z >= 100, 'disclaimer must sit above panels and the sheet');
});

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['.git', 'node_modules', 'vendor'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p); else yield p;
  }
}

test('no logo or image assets in the repository', () => {
  const images = [...walk(ROOT)].filter((p) => /\.(png|jpe?g|gif|svg|ico|webp|avif)$/i.test(p));
  assert.deepEqual(images, []);
});

test('markup and styles reference no external images', () => {
  assert.doesNotMatch(html + css, /<img\b|url\(\s*['"]?(?!data:)/i);
});
