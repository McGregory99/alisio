import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../../tools/serve.mjs';

let server, port;
before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
after(() => new Promise((r) => server.close(r)));

// Raw request so the client does not normalise the path.
const raw = (path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    res.resume();
    res.on('end', () => resolve(res));
  }).on('error', reject);
});

test('binds to 127.0.0.1 only', () => {
  assert.equal(server.address().address, '127.0.0.1');
});

test('serves static files with the right MIME type', async () => {
  const res = await raw('/package.json');
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  const mjs = await raw('/tools/serve.mjs');
  assert.match(mjs.headers['content-type'], /text\/javascript/);
});

for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2f%2e%2e/etc/passwd', '/a/..%5c..%5cpackage.json', '/%00']) {
  test(`rejects traversal request ${p}`, async () => {
    const res = await raw(p);
    assert.ok([400, 403, 404].includes(res.statusCode), `got ${res.statusCode}`);
  });
}

test('unknown file is 404', async () => {
  assert.equal((await raw('/nope.txt')).statusCode, 404);
});
