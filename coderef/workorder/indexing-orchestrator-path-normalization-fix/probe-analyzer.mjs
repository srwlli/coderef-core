process.env.CODEREF_LLM_PROVIDER = 'ollama';
process.env.CODEREF_RAG_LOCAL_ONLY = '1';

const { AnalyzerService } = await import('../../../dist/src/analyzer/analyzer-service.js');
const svc = new AnalyzerService('.');
const r = await svc.analyze(
  ['./**/*.ts', './**/*.tsx', './**/*.js', './**/*.jsx', './**/*.py'],
  false,
);
const fileNodes = new Map();
for (const [id, node] of r.graph.nodes) {
  const f = String(node.file).replace(/\\/g, '/');
  if (!fileNodes.has(f)) fileNodes.set(f, []);
  fileNodes.get(f).push(id);
}
console.log('analyzer total unique files:', fileNodes.size);

// Check the 55 missing-but-not-skipped sample
const samples = [
  'src/analyzer/js-call-detector/types.ts',
  'src/context/types.ts',
  'src/integration/rag/code-chunk.ts',
  'src/pipeline/header-fact.ts',
];
for (const s of samples) {
  const candidates = [...fileNodes.keys()].filter((f) => f.endsWith(s));
  if (candidates.length === 0) {
    console.log('ANALYZER ABSENT:', s);
  } else {
    for (const c of candidates) {
      console.log('ANALYZER:', c, '=>', fileNodes.get(c).length, 'nodes');
    }
  }
}
