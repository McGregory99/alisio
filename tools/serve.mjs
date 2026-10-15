// Zero-dependency static dev server. Bound to 127.0.0.1, path-traversal guarded.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Resolve a request URL to a file inside ROOT, or null when it is malformed or tries to
 * climb out. The raw path is inspected (no URL normalisation) so any ".." segment is refused.
 */
export function resolvePath(url, root = ROOT) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (!pathname.startsWith('/') || pathname.includes('\0') || pathname.includes('\\')) return null;
  if (pathname.split('/').includes('..')) return null;
  const file = resolve(join(root, pathname));
  return file === root || file.startsWith(root + sep) ? file : null;
}

export function createServer(root = ROOT) {
  return http.createServer(async (req, res) => {
    const target = resolvePath(req.url, root);
    if (!target) return res.writeHead(403).end('Forbidden');
    try {
      let file = target;
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      await stat(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080);
  createServer().listen(port, '127.0.0.1', () => console.log(`Alisio on http://127.0.0.1:${port}/`));
}
