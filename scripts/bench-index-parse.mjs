import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

function readMaybeGz(p) {
  const buf = fs.readFileSync(p);
  const json = p.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return json;
}

function bench(label, fn, iters = 30) {
  // warmup
  for (let i = 0; i < 5; i++) fn();
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iters; i++) fn();
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  return { label, iters, total_ms: ms, avg_ms: ms / iters };
}

const coderefDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('.coderef');
const files = [
  path.join(coderefDir, 'index.json'),
  path.join(coderefDir, 'index.json.gz'),
  path.join(coderefDir, 'index.compact.json'),
  path.join(coderefDir, 'index.compact.json.gz'),
].filter(p => fs.existsSync(p));

if (files.length === 0) {
  console.error(`No index files found in ${coderefDir}`);
  process.exit(1);
}

const stats = files.map(p => ({
  file: path.basename(p),
  bytes: fs.statSync(p).size,
}));

const benches = files.map(p => {
  const label = path.basename(p);
  return bench(label, () => {
    const raw = readMaybeGz(p);
    JSON.parse(raw);
  });
});

console.log(JSON.stringify({ coderefDir, stats, benches }, null, 2));

