// Deterministic repro hunt: build a small Python fixture with the shapes
// PS has (functions named check/main, __main__ guard, classes), run the
// full orchestrator + constructGraph N times, look for ANY orphan export
// edge (resolved export whose file-grain sourceId is not a node).
const { PipelineOrchestrator } = require('../../dist/src/pipeline/orchestrator.js');
const { constructGraph } = require('../../dist/src/pipeline/graph-builder.js');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PY_A = [
  'def check():',
  '    return 1',
  '',
  'def main():',
  '    check()',
  '',
  'class Thing:',
  '    def run(self):',
  '        return main()',
  '',
  'if __name__ == "__main__":',
  '    main()',
  '',
].join('\n');

const PY_B = [
  'CONST_X = 42',
  '',
  'def helper(a):',
  '    return a + CONST_X',
  '',
  'async def fetch():',
  '    return await helper(1)',
  '',
].join('\n');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyrepro-'));
  fs.mkdirSync(path.join(dir, 'services', 'source-material', 'search'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'services', 'source-material', 'curator'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'services', 'source-material', 'search', 'test_entity_psuid.py'), PY_A);
  fs.writeFileSync(path.join(dir, 'services', 'source-material', 'curator', 'add_org_parent_qid.py'), PY_B);
  // a TS file too, mirroring PS being a TS app with python subtree
  fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app', 'page.tsx'), 'export function Page() { return null; }\n');

  let anyOrphan = 0;
  for (let i = 0; i < 6; i++) {
    const state = await new PipelineOrchestrator().run(dir, {
      languages: ['ts', 'tsx', 'js', 'py'],
      outputDir: path.join(dir, '.coderef'),
      mode: 'full',
    });
    const g = state.graph; // use orchestrator's state.graph (what CLI validates)
    const nodeIds = new Set(g.nodes.map((n) => n.id));
    const exportEdges = g.edges.filter((e) => e.relationship === 'export');
    const orphan = exportEdges.filter((e) => e.resolutionStatus === 'resolved' && (!e.sourceId || !nodeIds.has(e.sourceId)));
    if (orphan.length) {
      anyOrphan++;
      if (anyOrphan === 1) {
        console.log('REPRO run', i, '-> orphan export edges:', orphan.length);
        const o = orphan[0];
        console.log('  orphan sourceId:', JSON.stringify(o.sourceId), '| targetId:', o.targetId);
        const fileNodes = g.nodes.filter((n) => n.type === 'file').map((n) => n.id);
        console.log('  file-grain node ids:', JSON.stringify(fileNodes));
        // The target element's file
        const t = g.nodes.find((n) => n.id === o.targetId);
        console.log('  target node file:', t && JSON.stringify(t.file), '| expected fileId:', o.sourceId);
        // distinct elem.file vs file-grain count
        const distinctFiles = new Set(state.elements.map((e) => e.file));
        console.log('  distinct elem.file:', distinctFiles.size, '| file-grain nodes:', fileNodes.length);
      }
    } else {
      console.log('run', i, '-> clean (', exportEdges.length, 'export edges)');
    }
  }
  console.log('TOTAL runs with orphans:', anyOrphan, '/ 6');
  fs.rmSync(dir, { recursive: true, force: true });
})().catch((e) => console.error('ERR', e.message, e.stack));
