import { readFileSync } from 'fs';

const r = JSON.parse(readFileSync('.coderef/rag-index.json', 'utf-8'));
const skipped = r.chunksSkippedDetails || [];
const skippedFiles = new Set();
for (const s of skipped) {
  const m = String(s.coderefId).match(/^file:(.+)/);
  if (m) skippedFiles.add(m[1].replace(/\\/g, '/'));
}
console.log('unique skipped files:', skippedFiles.size);

const g = JSON.parse(readFileSync('.coderef/graph.json', 'utf-8'));
const missingFiles = new Set();
for (const n of g.nodes) {
  if (n.metadata && n.metadata.headerStatus === 'missing') {
    missingFiles.add(String(n.file).replace(/\\/g, '/'));
  }
}
console.log('graph.json files with missing-header element:', missingFiles.size);

const skippedRel = new Set();
for (const sf of skippedFiles) {
  const idx = sf.indexOf('coderef-core/');
  if (idx >= 0) skippedRel.add(sf.slice(idx + 'coderef-core/'.length));
  else skippedRel.add(sf);
}
console.log('skipped (relative form):', skippedRel.size);

const inGraphNotSkipped = Array.from(missingFiles).filter(f => !skippedRel.has(f));
console.log('in graph.json missing but NOT skipped:', inGraphNotSkipped.length);
console.log('first 10:', inGraphNotSkipped.slice(0, 10));
