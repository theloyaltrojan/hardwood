// The game is one HTML file with one inline script, so a syntax error takes the whole thing down with no
// stack worth reading. This pulls the script out and hands it to Node purely to be parsed.
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

if (!blocks.length) { console.error('no inline script found in index.html'); process.exit(1); }

const dir = await mkdtemp(join(tmpdir(), 'hardwood-parse-'));
let failed = 0;
for (let i = 0; i < blocks.length; i++) {
  const file = join(dir, `block${i}.js`);
  await writeFile(file, blocks[i]);
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (e) { failed++; console.error(`\nscript block ${i} does not parse:\n${e.stderr?.toString() || e.message}`); }
}
const lines = html.split('\n').length;
console.log(failed
  ? `\n${failed}/${blocks.length} script blocks failed to parse`
  : `index.html parses — ${blocks.length} inline script block(s), ${lines} lines`);
process.exit(failed ? 1 : 0);
