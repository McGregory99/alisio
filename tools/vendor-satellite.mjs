// Re-vendors satellite.js: node tools/vendor-satellite.mjs <extracted-package-dir>
// Obtain the package outside the repo first: `npm pack satellite.js@7.1.0` and extract it.
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve(process.argv[2] ?? '');
const { version } = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
const dest = resolve(import.meta.dirname, '..', 'vendor', `satellite.js-${version}`);
mkdirSync(dest, { recursive: true });
cpSync(join(src, 'dist'), join(dest, 'dist'), { recursive: true, filter: (f) => !f.endsWith('.d.ts') });
cpSync(join(src, 'LICENSE.md'), join(dest, 'LICENSE.md'));
console.log(`Vendored satellite.js ${version} -> ${dest}`);
