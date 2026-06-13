import { readFileSync } from 'fs';

const g = JSON.parse(readFileSync('.coderef/graph.json', 'utf-8'));
const nodes = g.nodes || [];
const fileSet = new Set();
for (const n of nodes) {
  if (typeof n.file === 'string' && n.metadata && n.metadata.headerStatus === 'missing') {
    fileSet.add(n.file.replace(/\\/g, '/'));
  }
}
console.log('unique files with headerStatus=missing in graph.json:', fileSet.size);
console.log('first 5:', Array.from(fileSet).slice(0, 5));

// Read rag-index.json
const r = JSON.parse(readFileSync('.coderef/rag-index.json', 'utf-8'));
console.log('\nrag-index chunksIndexed:', r.chunksIndexed, 'chunksSkipped:', r.chunksSkipped);
console.log('rag-index projectDir:', r.projectDir);

// Read coderef-vectors.json sample to see chunk file format
try {
  const v = JSON.parse(readFileSync('.coderef/coderef-vectors.json', 'utf-8'));
  const samples = (v.vectors || v.entries || v.chunks || []).slice(0, 3);
  console.log('\nfirst 3 vector entries (chunk file paths):');
  for (const s of samples) {
    console.log('  ', JSON.stringify({
      id: s.id,
      file: s.file || s.metadata?.file,
      headerStatus: s.headerStatus || s.metadata?.headerStatus,
    }));
  }
} catch (e) { console.log('vector store read err:', e.message); }
