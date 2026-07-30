const { PipelineOrchestrator } = require('../../dist/src/pipeline/orchestrator.js');
const PS = 'C:/Users/willh/Desktop/CODEREF/PROJECTS/primary-sources';

(async () => {
  const state = await new PipelineOrchestrator().run(PS, {
    languages: ['ts', 'tsx', 'js', 'py'],
    outputDir: PS + '/.coderef',
    mode: 'full',
  });

  const g = state.graph;
  const fileGrainIds = new Set(g.nodes.filter((n) => n.type === 'file').map((n) => n.id));
  const exportEdges = g.edges.filter((e) => e.relationship === 'export');
  const orphan = exportEdges.filter((e) => e.resolutionStatus === 'resolved' && !fileGrainIds.has(e.sourceId));
  console.log('export edges:', exportEdges.length, '| orphan:', orphan.length);
  if (!orphan.length) { console.log('NO ORPHAN this run (nondeterministic)'); return; }

  // For the first orphan: the target element it exports.
  const o = orphan[0];
  console.log('orphan sourceId:', JSON.stringify(o.sourceId), '| targetId:', JSON.stringify(o.targetId));

  // Find the element in state.elements whose codeRefId == targetId.
  const elById = state.elements.find((e) => e.codeRefId === o.targetId);
  console.log('target element in state.elements?', !!elById, elById && JSON.stringify({ name: elById.name, file: elById.file, exported: elById.exported }));

  // Find element whose name/file matches the targetId substring.
  const stem = o.sourceId.replace('@File/', '');
  const elsForFile = state.elements.filter((e) => String(e.file).replace(/\\/g, '/').endsWith(stem));
  console.log('elements whose file ends with target stem:', elsForFile.length);
  if (elsForFile.length) console.log('  raw file forms:', [...new Set(elsForFile.map((e) => e.file))].slice(0, 3));

  // KEY: was a file-grain node for that file emitted, under ANY id form?
  const base = stem.split('/').pop();
  const fileNodesSameBase = g.nodes.filter((n) => n.type === 'file' && String(n.id).includes(base)).map((n) => n.id);
  console.log('file-grain nodes sharing basename', base, ':', fileNodesSameBase);

  // The element nodes for that file (id form used as targetId):
  const elemNodesSameBase = g.nodes.filter((n) => n.type !== 'file' && String(n.id).includes(base)).map((n) => n.id);
  console.log('element nodes sharing basename:', elemNodesSameBase.slice(0, 4));

  // Compare: export loop uses fileGrainNodeId(elem.file). buildNodes uses
  // seenFiles which includes elem.file for every element. So if the file
  // has element nodes but no file-grain node, the divergence is real.
  console.log('--- diagnosis ---');
  console.log('has element nodes:', elemNodesSameBase.length > 0, '| has file-grain node:', fileNodesSameBase.length > 0);
})().catch((e) => console.error('ERR', e.message, e.stack));
