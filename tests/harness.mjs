// Small test harness. No framework: the whole point of this project is that the game itself has no
// dependencies, so the tests keep theirs to one headless browser.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

export function serve(root, port = 0) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
      const file = join(root, rel === '/' ? 'index.html' : rel);
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404); res.end('not found'); }
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

export function makeRunner() {
  const results = [];
  let current = null;
  async function test(name, fn) {
    current = { name, failures: [] };
    const t0 = Date.now();
    try { await fn(); } catch (e) { current.failures.push('threw: ' + (e && e.stack ? e.stack.split('\n')[0] : e)); }
    current.ms = Date.now() - t0;
    results.push(current);
    const ok = current.failures.length === 0;
    process.stdout.write(`${ok ? '  \x1b[32mpass\x1b[0m' : '  \x1b[31mFAIL\x1b[0m'}  ${name} \x1b[90m(${current.ms}ms)\x1b[0m\n`);
    for (const f of current.failures) process.stdout.write(`        \x1b[31m${f}\x1b[0m\n`);
    current = null;
  }
  const fail = (msg) => { if (current) current.failures.push(msg); else throw new Error(msg); };
  const check = {
    ok(v, msg) { if (!v) fail(msg || 'expected truthy, got ' + JSON.stringify(v)); },
    equal(a, b, msg) { if (a !== b) fail((msg ? msg + ': ' : '') + `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
    atLeast(a, b, msg) { if (!(a >= b)) fail((msg ? msg + ': ' : '') + `expected >= ${b}, got ${a}`); },
    atMost(a, b, msg) { if (!(a <= b)) fail((msg ? msg + ': ' : '') + `expected <= ${b}, got ${a}`); },
    between(a, lo, hi, msg) { if (!(a >= lo && a <= hi)) fail((msg ? msg + ': ' : '') + `expected ${lo}..${hi}, got ${a}`); },
  };
  function summary() {
    const failed = results.filter((r) => r.failures.length);
    const total = results.length;
    process.stdout.write(`\n${total - failed.length}/${total} passed\n`);
    if (failed.length) {
      process.stdout.write('\n\x1b[31mFailures:\x1b[0m\n');
      for (const r of failed) process.stdout.write(`  ${r.name}\n${r.failures.map((f) => '    ' + f).join('\n')}\n`);
    }
    return failed.length === 0;
  }
  return { test, check, summary };
}
