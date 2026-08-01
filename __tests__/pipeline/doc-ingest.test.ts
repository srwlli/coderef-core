/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-doc-ingest-test
 */

/**
 * WO-DOCS-TO-GRAPH-P1-DOCS-PHASE-OF-THE-001.
 *
 * Governing docs as first-class graph nodes. The invariants under test are the
 * ones that keep the doc surface honest:
 *
 *   - a sheet whose `documents:` target left the scan universe is recorded
 *     UNRESOLVED, never dropped, and never mints a phantom @File node
 *     (discovery G3 — the GI-3 fail-close class);
 *   - foundation docs (no frontmatter, discovery G1) become nodes WITHOUT
 *     claims — no documents edges;
 *   - legacy sheets without `status:` default to draft (G4), and a
 *     frontmatter-less sheet is a counted skip, not an error;
 *   - the retrieval ranking contract holds: approved > draft, placeholder-
 *     bearing last — and placeholder-bearing docs are still RETURNED;
 *   - BOTH adjacency indexes (CanonicalGraphQuery + the MCP cache) see
 *     `documents` edges.
 *
 * The map-projection coverage queue is exercised against the live self-scan in
 * the WO's T8 after-metrics step, not here (it needs a full .coderef fixture).
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  collectDocFacts,
  parseDocFrontmatter,
  docNodeId,
  isDocNodeId,
  type DocFact,
} from '../../src/pipeline/doc-ingest.js';
import { constructGraph } from '../../src/pipeline/graph-builder.js';
import { CanonicalGraphQuery } from '../../src/query/canonical-graph.js';
import { condenseSummary } from '../../src/query/orient.js';
import { emptyCache, loadGraph } from '../../src/cli/mcp/shared.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

const ROOT = '/tmp/docs';

function emptyGraph(): ExportedGraph {
  return {
    version: '1.0.0',
    exportedAt: 0,
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
}

function makeState(docs: DocFact[] = []): PipelineState {
  return {
    projectPath: ROOT,
    files: new Map([['ts', [`${ROOT}/src/client.ts`]]]),
    elements: [
      {
        type: 'function',
        name: 'loadUsers',
        file: `${ROOT}/src/client.ts`,
        line: 3,
        codeRefId: '@Fn/src/client.ts#loadUsers:3',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    docs,
    graph: emptyGraph(),
    sources: new Map([[`${ROOT}/src/client.ts`, 'export function loadUsers() {}']]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 1, relationshipsExtracted: 0 },
  } as unknown as PipelineState;
}

function sheetFact(overrides: Partial<DocFact> = {}): DocFact {
  const sheetPath = overrides.sheetPath ?? 'coderef/resource-sheets/client-RESOURCE-SHEET.md';
  return {
    id: docNodeId(sheetPath),
    slug: path.basename(sheetPath, '.md'),
    docType: 'resource-sheet',
    sheetPath,
    subject: 'client',
    docStatus: 'draft',
    documentsPath: 'src/client.ts',
    relatedFiles: [],
    placeholderSections: 0,
    ...overrides,
  };
}

describe('parseDocFrontmatter', () => {
  it('reads flat scalars and dash-lists; returns null without a frontmatter block', () => {
    const fm = parseDocFrontmatter(
      '---\nsubject: parser\nstatus: approved\ndocuments: src/parser/parser.ts\nrelated_files:\n  - src/parser/parser.ts\n  - src/types.ts\n---\n# body\n',
    );
    expect(fm).not.toBeNull();
    expect(fm!.scalars.subject).toBe('parser');
    expect(fm!.scalars.status).toBe('approved');
    expect(fm!.scalars.documents).toBe('src/parser/parser.ts');
    expect(fm!.lists.related_files).toEqual(['src/parser/parser.ts', 'src/types.ts']);
    expect(parseDocFrontmatter('# no frontmatter here\n')).toBeNull();
  });
});

describe('collectDocFacts (filesystem fixture)', () => {
  let fixtureRoot: string;

  beforeAll(() => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-ingest-'));
    const sheets = path.join(fixtureRoot, 'coderef', 'resource-sheets');
    const foundation = path.join(fixtureRoot, 'coderef', 'foundation-docs');
    const genres = path.join(fixtureRoot, 'coderef', 'genre-registry');
    fs.mkdirSync(sheets, { recursive: true });
    fs.mkdirSync(foundation, { recursive: true });
    fs.mkdirSync(genres, { recursive: true });
    fs.writeFileSync(
      path.join(sheets, 'alpha-RESOURCE-SHEET.md'),
      '---\nsubject: alpha\nstatus: approved\ndocuments: src/alpha.ts\ntask: STUB-TEST01\n---\n# alpha\n',
    );
    // Legacy sheet: no status (defaults draft), one placeholder section.
    fs.writeFileSync(
      path.join(sheets, 'beta-RESOURCE-SHEET.md'),
      '---\nsubject: beta\ndocuments: src/beta.ts\n---\n# beta\nThis section is a placeholder pending regeneration.\n',
    );
    // Frontmatter-less inventory sheet (the SCRIPTS class): counted skip.
    fs.writeFileSync(path.join(sheets, 'INVENTORY-SHEET.md'), '# scripts inventory\n| a | b |\n');
    // Foundation doc: no frontmatter at all (discovery G1).
    fs.writeFileSync(path.join(foundation, 'API.md'), '# API Reference\n\nGenerated.\n');
    // Genre/report lane: explicit opt-in only. The sibling report proves that
    // recursive discovery never implies ingestion by itself.
    fs.writeFileSync(
      path.join(genres, 'code-intelligence-GENRE.md'),
      '---\ntitle: Code Intelligence\nstatus: living\ningestion_candidate: true\n---\n# Code Intelligence\n',
    );
    fs.writeFileSync(
      path.join(genres, 'ignored-GENRE.md'),
      '---\ntitle: Ignored\nstatus: living\n---\n# Not opted in\n',
    );
  });

  afterAll(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('collects sheets + foundation docs with G1/G4 tolerances and counted skips', () => {
    const { docs, skipped } = collectDocFacts(fixtureRoot);
    expect(docs.map(d => d.slug)).toEqual([
      'alpha-RESOURCE-SHEET',
      'beta-RESOURCE-SHEET',
      'API',
      'code-intelligence-GENRE',
    ]);

    const alpha = docs[0];
    expect(alpha.docType).toBe('resource-sheet');
    expect(alpha.docStatus).toBe('approved');
    expect(alpha.documentsPath).toBe('src/alpha.ts');
    expect(alpha.task).toBe('STUB-TEST01');
    expect(alpha.id).toBe('@Doc/coderef/resource-sheets/alpha-RESOURCE-SHEET.md');
    expect(isDocNodeId(alpha.id)).toBe(true);

    const beta = docs[1];
    expect(beta.docStatus).toBe('draft'); // G4: missing status is not approval
    expect(beta.placeholderSections).toBe(1);

    const api = docs[2];
    expect(api.docType).toBe('foundation');
    expect(api.docStatus).toBe('generated');
    expect(api.documentsPath).toBeUndefined(); // DR-DOCS-D: no claims

    const genre = docs[3];
    expect(genre.docType).toBe('report');
    expect(genre.docStatus).toBe('living');
    expect(genre.subject).toBe('Code Intelligence');
    expect(genre.id).toBe('@Doc/coderef/genre-registry/code-intelligence-GENRE.md');
    expect(docs.some(d => d.slug === 'ignored-GENRE')).toBe(false);

    expect(skipped).toEqual([
      { path: 'coderef/resource-sheets/INVENTORY-SHEET.md', reason: 'frontmatter_missing' },
    ]);
  });

  it('is deterministic: two collections yield identical fact arrays', () => {
    expect(collectDocFacts(fixtureRoot)).toEqual(collectDocFacts(fixtureRoot));
  });

  it('degrades to empty on a repo without doc surfaces (no-data, not an error)', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-ingest-bare-'));
    try {
      expect(collectDocFacts(bare)).toEqual({ docs: [], skipped: [] });
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('doc nodes + documents edges (constructGraph)', () => {
  it('mints a file-less @Doc node and a resolved documents edge to the in-universe file', () => {
    const graph = constructGraph(makeState([sheetFact()]));
    const docNode = graph.nodes.find(n => n.type === 'doc');
    expect(docNode).toBeDefined();
    expect(docNode!.id).toBe('@Doc/coderef/resource-sheets/client-RESOURCE-SHEET.md');
    expect(docNode!.file).toBeUndefined(); // endpoint precedent: not a code location
    expect((docNode!.metadata as any).docStatus).toBe('draft');

    const docEdges = graph.edges.filter(e => e.relationship === 'documents');
    expect(docEdges).toHaveLength(1);
    expect(docEdges[0].resolutionStatus).toBe('resolved');
    expect(docEdges[0].targetId).toBe('@File/src/client.ts');
    expect((docEdges[0].evidence as any).kind).toBe('documents');
    expect((docEdges[0].evidence as any).docStatus).toBe('draft');
  });

  it('an out-of-universe documents: target is UNRESOLVED with reason, and mints no phantom @File node (G3)', () => {
    const graph = constructGraph(makeState([
      sheetFact({ documentsPath: 'scripts/gone.ts' }),
    ]));
    const docEdges = graph.edges.filter(e => e.relationship === 'documents');
    expect(docEdges).toHaveLength(1);
    expect(docEdges[0].resolutionStatus).toBe('unresolved');
    expect(docEdges[0].targetId).toBeUndefined();
    expect(docEdges[0].reason).toBe('documents_target_not_in_scan');
    expect(graph.nodes.find(n => n.id === '@File/scripts/gone.ts')).toBeUndefined();
  });

  it('a foundation doc mints a node and ZERO edges (DR-DOCS-D)', () => {
    const graph = constructGraph(makeState([
      sheetFact({
        sheetPath: 'coderef/foundation-docs/API.md',
        id: docNodeId('coderef/foundation-docs/API.md'),
        docType: 'foundation',
        docStatus: 'generated',
        documentsPath: undefined,
      }),
    ]));
    expect(graph.nodes.filter(n => n.type === 'doc')).toHaveLength(1);
    expect(graph.edges.filter(e => e.relationship === 'documents')).toHaveLength(0);
  });

  it('an opted-in report may carry a documents edge when its frontmatter names an in-universe file', () => {
    const graph = constructGraph(makeState([
      sheetFact({
        sheetPath: 'coderef/genre-registry/code-intelligence-GENRE.md',
        id: docNodeId('coderef/genre-registry/code-intelligence-GENRE.md'),
        docType: 'report',
        docStatus: 'living',
      }),
    ]));
    expect(graph.nodes.find(n => n.id.endsWith('code-intelligence-GENRE.md'))?.type).toBe('doc');
    expect(graph.edges.filter(e => e.relationship === 'documents')).toHaveLength(1);
  });

  it('doc ingestion does not perturb the pre-existing element/file graph', () => {
    const before = constructGraph(makeState([]));
    const after = constructGraph(makeState([sheetFact()]));
    const nonDocNodes = (g: ExportedGraph) => g.nodes.filter(n => n.type !== 'doc').map(n => n.id).sort();
    const nonDocEdges = (g: ExportedGraph) => g.edges.filter(e => e.relationship !== 'documents').map(e => e.id).sort();
    expect(nonDocNodes(after)).toEqual(nonDocNodes(before));
    expect(nonDocEdges(after)).toEqual(nonDocEdges(before));
  });
});

describe('retrieval ranking (adjacency index 1: CanonicalGraphQuery.governingDocs)', () => {
  const graph = constructGraph(makeState([
    sheetFact({
      sheetPath: 'coderef/resource-sheets/draft-SHEET.md',
      id: docNodeId('coderef/resource-sheets/draft-SHEET.md'),
      docStatus: 'draft',
    }),
    sheetFact({
      sheetPath: 'coderef/resource-sheets/approved-placeholder-SHEET.md',
      id: docNodeId('coderef/resource-sheets/approved-placeholder-SHEET.md'),
      docStatus: 'approved',
      placeholderSections: 2,
    }),
    sheetFact({
      sheetPath: 'coderef/resource-sheets/approved-clean-SHEET.md',
      id: docNodeId('coderef/resource-sheets/approved-clean-SHEET.md'),
      docStatus: 'approved',
    }),
  ]));
  const q = new CanonicalGraphQuery(graph);

  it('ranks approved > draft, placeholder-bearing last within a status — and still RETURNS placeholder docs', () => {
    const docs = q.governingDocs('@File/src/client.ts');
    expect(docs.map(d => (d.doc.metadata as any).sheetPath)).toEqual([
      'coderef/resource-sheets/approved-clean-SHEET.md',
      'coderef/resource-sheets/approved-placeholder-SHEET.md',
      'coderef/resource-sheets/draft-SHEET.md',
    ]);
    expect((docs[1].doc.metadata as any).placeholderSections).toBe(2);
  });

  it('resolves through an ELEMENT of the documented file too', () => {
    expect(q.governingDocs('loadUsers')).toHaveLength(3);
  });

  it('returns empty for an undocumented file (no fabricated coverage)', () => {
    expect(q.governingDocs('@File/src/other.ts')).toEqual([]);
  });
});

describe('adjacency index 2: MCP cache indexes documents edges', () => {
  it('cache.inbound resolves the @File target of a documents edge', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-mcp-'));
    try {
      const graph = constructGraph(makeState([sheetFact()]));
      const coderefDir = path.join(fixtureRoot, '.coderef');
      fs.mkdirSync(coderefDir, { recursive: true });
      fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph));
      // index.json must coexist or ensureArtifacts treats the dir as absent
      // and spawns a real populate auto-build.
      fs.writeFileSync(
        path.join(coderefDir, 'index.json'),
        JSON.stringify({ totalElements: 0, elements: [] }),
      );
      const cache = emptyCache();
      loadGraph(fixtureRoot, cache);
      const inboundDocEdges = (cache.inbound.get('@File/src/client.ts') ?? []).filter(
        e => e.relationship === 'documents',
      );
      expect(inboundDocEdges).toHaveLength(1);
      expect(inboundDocEdges[0].sourceId).toBe(
        '@Doc/coderef/resource-sheets/client-RESOURCE-SHEET.md',
      );
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

describe('orient doc-coverage block', () => {
  it('emits docs counts when @Doc nodes exist, and omits the block when none do', () => {
    const withDocs = constructGraph(makeState([sheetFact({ docStatus: 'approved' })]));
    const summary = condenseSummary(null, withDocs as any);
    expect(summary).not.toBeNull();
    expect((summary as any).docs).toEqual({
      doc_nodes: 1,
      by_status: { approved: 1 },
      documents_edges: 1,
      unresolved_documents_edges: 0,
      documented_files: 1,
    });

    const withoutDocs = constructGraph(makeState([]));
    expect((condenseSummary(null, withoutDocs as any) as any).docs).toBeUndefined();
  });
});
