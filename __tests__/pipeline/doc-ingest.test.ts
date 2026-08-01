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
 *   - foundation docs WITH generator-emitted frontmatter (WO-FOUNDATION-DOCS-
 *     GENERATOR-EMITTED-FRONTMATTER-001) bear documents edges from their
 *     documents: lists, but docStatus is ALWAYS lane-decided 'generated' —
 *     a frontmatter status: value must never promote generated prose;
 *   - foundation docs WITHOUT frontmatter (older generator output, G1) still
 *     become nodes with no claims — no documents edges;
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
  docTargets,
  isDocNodeId,
  headingSlug,
  extractDocSections,
  normalizeMention,
  lexFencedIdentifiers,
  type DocFact,
} from '../../src/pipeline/doc-ingest.js';
import { constructGraph } from '../../src/pipeline/graph-builder.js';
import { CanonicalGraphQuery } from '../../src/query/canonical-graph.js';
import { condenseSummary } from '../../src/query/orient.js';
import { emptyCache, loadGraph, resolveNodes } from '../../src/cli/mcp/shared.js';
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
    sections: [],
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

  it('reads list-form documents: into lists (the generator-emitted shape)', () => {
    const fm = parseDocFrontmatter(
      '---\nsubject: hotspots\nstatus: generated\ndocuments:\n  - src/a.ts\n  - src/b.ts\n---\n# body\n',
    );
    expect(fm!.scalars.documents).toBeUndefined();
    expect(fm!.lists.documents).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

describe('docTargets', () => {
  it('unions scalar + list forms, order-preserving, deduped', () => {
    expect(docTargets({ documentsPath: 'src/a.ts', documentsPaths: ['src/b.ts', 'src/a.ts'] }))
      .toEqual(['src/a.ts', 'src/b.ts']);
    expect(docTargets({ documentsPath: undefined, documentsPaths: undefined })).toEqual([]);
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
    // Foundation doc: no frontmatter at all (older generator output, G1).
    fs.writeFileSync(path.join(foundation, 'API.md'), '# API Reference\n\nGenerated.\n');
    // Foundation doc WITH generator-emitted frontmatter. The status: approved
    // line is a deliberate poison pill: the lane must pin 'generated'.
    fs.writeFileSync(
      path.join(foundation, 'HOTSPOTS.md'),
      '---\nsubject: Hotspots\nstatus: approved\ngenerator: scripts/doc-gen/generate-hotspots-md.js\ndocuments:\n  - src/alpha.ts\n  - src/beta.ts\ndocuments_truncated: 2 of 9 analyzed files listed\n---\n# Hotspots\n',
    );
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
      'HOTSPOTS',
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
    expect(api.documentsPath).toBeUndefined(); // no frontmatter -> no claims
    expect(api.documentsPaths).toBeUndefined();

    const hotspots = docs[3];
    expect(hotspots.docType).toBe('foundation');
    // Lane-decided: the fixture's frontmatter says status: approved, but
    // generated prose must never outrank reviewed sheets (DR-DOCS-E).
    expect(hotspots.docStatus).toBe('generated');
    expect(hotspots.documentsPaths).toEqual(['src/alpha.ts', 'src/beta.ts']);
    expect(docTargets(hotspots)).toEqual(['src/alpha.ts', 'src/beta.ts']);

    const genre = docs[4];
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

  it('a frontmatter-less foundation doc mints a node and ZERO edges (G1 tolerance)', () => {
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

  it('a foundation doc with generator frontmatter bears one edge per documents: entry — in-universe resolved, out-of-scan unresolved (G3)', () => {
    const graph = constructGraph(makeState([
      sheetFact({
        sheetPath: 'coderef/foundation-docs/HOTSPOTS.md',
        id: docNodeId('coderef/foundation-docs/HOTSPOTS.md'),
        docType: 'foundation',
        docStatus: 'generated',
        documentsPath: undefined,
        documentsPaths: ['src/client.ts', 'scripts/gone.ts'],
      }),
    ]));
    const docEdges = graph.edges.filter(e => e.relationship === 'documents');
    expect(docEdges).toHaveLength(2);

    const resolved = docEdges.find(e => e.resolutionStatus === 'resolved');
    expect(resolved?.targetId).toBe('@File/src/client.ts');
    expect((resolved?.evidence as any).docStatus).toBe('generated');
    expect((resolved?.evidence as any).documentsPath).toBe('src/client.ts');

    const unresolved = docEdges.find(e => e.resolutionStatus === 'unresolved');
    expect(unresolved?.targetId).toBeUndefined();
    expect(unresolved?.reason).toBe('documents_target_not_in_scan');
    expect(graph.nodes.find(n => n.id === '@File/scripts/gone.ts')).toBeUndefined();
    // node metadata carries the full claim list
    const node = graph.nodes.find(n => n.type === 'doc');
    expect((node!.metadata as any).documentsPaths).toEqual(['src/client.ts', 'scripts/gone.ts']);
  });

  it('a sheet with LIST-form documents: bears one edge per entry (previously a silent claim-drop)', () => {
    const graph = constructGraph(makeState([
      sheetFact({
        documentsPath: undefined,
        documentsPaths: ['src/client.ts'],
      }),
    ]));
    const docEdges = graph.edges.filter(e => e.relationship === 'documents');
    expect(docEdges).toHaveLength(1);
    expect(docEdges[0].resolutionStatus).toBe('resolved');
    expect(docEdges[0].targetId).toBe('@File/src/client.ts');
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

/**
 * WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P1.
 *
 * Section-level AST nodes. The invariants that keep the section grain honest:
 *   - slugs are stable under cosmetic heading edits and disambiguate on
 *     collision, so two `## Usage` headings stay separately addressable;
 *   - a `# comment` inside a fenced code block is a COMMENT — treating it as a
 *     heading would mint phantom sections in every doc with a shell transcript;
 *   - frontmatter is not prose and never yields sections;
 *   - the whole-file @Doc node is RETAINED and its id is unchanged (additive);
 *   - extraction is deterministic given identical bytes (AC-08 / DL-7).
 */
describe('doc sections (extractDocSections / DL-1 slug rules)', () => {
  const DOC = '@Doc/coderef/foundation-docs/GUIDE.md';

  it('slugs GitHub-style: lowercase, punctuation dropped, spaces hyphenated', () => {
    expect(headingSlug('Getting Started')).toBe('getting-started');
    expect(headingSlug('  API: the `run()` Contract!  ')).toBe('api-the-run-contract');
    // Dropped punctuation must not leave a doubled separator.
    expect(headingSlug('Phase 3 — Proof')).toBe('phase-3-proof');
    // Cosmetic-only edits must NOT re-key the section.
    expect(headingSlug('Getting started')).toBe(headingSlug('GETTING  STARTED'));
  });

  it('parses heading levels in document order with 1-based line spans', () => {
    const sections = extractDocSections(DOC, '# Title\nintro\n\n## Setup\nbody\n### Deep\nmore\n');
    expect(sections.map(s => [s.slug, s.depth, s.line])).toEqual([
      ['title', 1, 1],
      ['setup', 2, 4],
      ['deep', 3, 6],
    ]);
    expect(sections[0].id).toBe(`${DOC}#title`);
    expect(sections[0].docId).toBe(DOC);
    expect(sections.map(s => s.order)).toEqual([0, 1, 2]);
    // Each section ends where the next begins; the last runs to EOF.
    expect(sections[0].endLine).toBe(3);
    expect(sections[2].endLine).toBeGreaterThanOrEqual(7);
  });

  it('disambiguates duplicate headings in document order (-2, -3)', () => {
    const sections = extractDocSections(DOC, '## Usage\na\n## Usage\nb\n## Usage\nc\n');
    expect(sections.map(s => s.slug)).toEqual(['usage', 'usage-2', 'usage-3']);
    expect(new Set(sections.map(s => s.id)).size).toBe(3);
  });

  it('does NOT treat a # comment inside a fenced block as a heading', () => {
    const text = [
      '# Real Heading',
      '```bash',
      '# not a heading — a shell comment',
      'npm run build',
      '```',
      '~~~python',
      '# also not a heading',
      '~~~',
      '## Second Real',
    ].join('\n');
    expect(extractDocSections(DOC, text).map(s => s.slug)).toEqual(['real-heading', 'second-real']);
  });

  it('closes a fence only on its own marker char (``` inside ~~~ is content)', () => {
    const text = ['~~~text', '```', '# still inside the tilde fence', '~~~', '# After'].join('\n');
    expect(extractDocSections(DOC, text).map(s => s.slug)).toEqual(['after']);
  });

  it('skips the frontmatter block and handles CRLF', () => {
    const text = '---\r\nsubject: guide\r\nstatus: approved\r\n---\r\n# Body Heading\r\ntext\r\n';
    expect(extractDocSections(DOC, text).map(s => s.slug)).toEqual(['body-heading']);
  });

  it('falls back to section-N when a heading slugs to empty, and is deterministic', () => {
    const text = '## ---\nbody\n## +++\nbody\n';
    const first = extractDocSections(DOC, text);
    expect(first.map(s => s.slug)).toEqual(['section-1', 'section-2']);
    expect(extractDocSections(DOC, text)).toEqual(first); // AC-08 determinism
  });

  it('a heading-less doc yields zero sections (NO-DATA, not an error)', () => {
    expect(extractDocSections(DOC, 'just prose\nno headings at all\n')).toEqual([]);
  });
});

describe('section nodes + contains edges (constructGraph, DL-2)', () => {
  const sheetPath = 'coderef/resource-sheets/client-RESOURCE-SHEET.md';
  const docId = docNodeId(sheetPath);
  const sections = extractDocSections(docId, '# Overview\na\n## Usage\nb\n');
  const graph = constructGraph(makeState([sheetFact({ sections })]));

  it('retains the whole-file @Doc node unchanged and adds one node per section', () => {
    const container = graph.nodes.find(n => n.id === docId);
    expect(container).toBeDefined();
    expect((container!.metadata as Record<string, unknown>).docSection).toBeUndefined();
    const sectionNodes = graph.nodes.filter(
      n => (n.metadata as Record<string, unknown> | undefined)?.docSection === true,
    );
    expect(sectionNodes.map(n => n.id)).toEqual([`${docId}#overview`, `${docId}#usage`]);
    // File-less shape, same as the container — consumers that skip file-less
    // doc nodes keep skipping these.
    expect(sectionNodes[0].file).toBeUndefined();
    expect(sectionNodes[0].name).toBe('Overview');
    expect((sectionNodes[1].metadata as Record<string, unknown>).docId).toBe(docId);
  });

  it('mints a resolved contains edge per section carrying outline provenance', () => {
    const contains = graph.edges.filter(e => e.relationship === 'contains');
    expect(contains).toHaveLength(2);
    expect(contains.every(e => e.resolutionStatus === 'resolved')).toBe(true);
    expect(contains.map(e => e.sourceId)).toEqual([docId, docId]);
    expect(contains.map(e => e.target ?? (e as { targetId?: string }).targetId)).toEqual([
      `${docId}#overview`,
      `${docId}#usage`,
    ]);
    const ev = contains[1].evidence as { kind: string; slug: string; depth: number; order: number };
    expect(ev.kind).toBe('contains');
    expect(ev.slug).toBe('usage');
    expect(ev.depth).toBe(2);
    expect(ev.order).toBe(1);
  });

  it('leaves the pre-existing documents edge and the code graph untouched', () => {
    const documents = graph.edges.filter(e => e.relationship === 'documents');
    expect(documents).toHaveLength(1);
    const baseline = constructGraph(makeState([sheetFact()]));
    const codeNodes = (g: typeof graph) =>
      g.nodes.filter(n => !String(n.id).startsWith('@Doc/')).map(n => n.id).sort();
    expect(codeNodes(graph)).toEqual(codeNodes(baseline));
  });

  it('is seen by BOTH adjacency indexes (CanonicalGraphQuery + MCP cache)', () => {
    // Index 1: the canonical query engine walks contains as a dependency kind,
    // so a walk that reaches a document enumerates its sections.
    const q = new CanonicalGraphQuery(graph as unknown as ExportedGraph);
    const section = q.resolve(`${docId}#usage`);
    expect(q.dependentsOf(section).map(n => n.id)).toContain(docId);

    // Index 2: the MCP cache — a kind taught to only one index is invisible on
    // the other surface, which is the failure this assertion exists to catch.
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-sections-mcp-'));
    try {
      const coderefDir = path.join(fixtureRoot, '.coderef');
      fs.mkdirSync(coderefDir, { recursive: true });
      fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph));
      fs.writeFileSync(
        path.join(coderefDir, 'index.json'),
        JSON.stringify({ totalElements: 0, elements: [] }),
      );
      const cache = emptyCache();
      loadGraph(fixtureRoot, cache);
      const inbound = (cache.inbound.get(`${docId}#usage`) ?? []).filter(
        e => e.relationship === 'contains',
      );
      expect(inbound).toHaveLength(1);
      expect(inbound[0].sourceId).toBe(docId);
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

/**
 * WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P2.
 *
 * Symbol-gated backtick references (DL-3). The gate is the whole feature: a
 * graph edge has to be a claim the symbol table can back, and prose wraps far
 * more paths and flags in backticks than it does symbols.
 */
describe('doc references (DL-3 membership gate)', () => {
  const sheetPath = 'coderef/resource-sheets/client-RESOURCE-SHEET.md';
  const docId = docNodeId(sheetPath);

  function graphFor(body: string) {
    return constructGraph(makeState([sheetFact({ sections: extractDocSections(docId, body) })]));
  }
  const refs = (g: ReturnType<typeof constructGraph>) =>
    g.edges.filter(e => e.relationship === 'references');

  it('normalizeMention keeps identifier shapes and rejects prose/paths/flags', () => {
    expect(normalizeMention('loadUsers')).toBe('loadUsers');
    expect(normalizeMention('loadUsers()')).toBe('loadUsers'); // call suffix dropped
    expect(normalizeMention('  _private$1  ')).toBe('_private$1');
    for (const junk of ['--source-headers', 'src/client.ts', 'npm run build', 'a.b', '3things', '']) {
      expect(normalizeMention(junk)).toBeNull();
    }
  });

  it('collects identifier-shaped mentions per section, deduped, excluding fenced interiors', () => {
    const sections = extractDocSections(
      docId,
      [
        '## Alpha',
        'Call `loadUsers` then `loadUsers` again; run `npm run build` and pass `--json`.',
        '```ts',
        'const fencedOnly = 1;',
        '```',
        '## Beta',
        'See `saveUser`.',
      ].join('\n'),
    );
    expect(sections[0].mentions).toEqual(['loadUsers']); // deduped; prose junk filtered
    expect(sections[1].mentions).toEqual(['saveUser']);
    // The fenced identifier is NOT a prose mention — that is P3's separate lane.
    expect(sections.flatMap(s => s.mentions)).not.toContain('fencedOnly');
  });

  it('mints a resolved references edge ONLY for a symbol the table backs', () => {
    const g = graphFor('## Usage\nCall `loadUsers` — not `nonExistentSymbol`, not `--flag`.\n');
    const edges = refs(g);
    expect(edges).toHaveLength(1);
    expect(edges[0].resolutionStatus).toBe('resolved');
    expect(edges[0].sourceId).toBe(`${docId}#usage`);
    expect(edges[0].target ?? (edges[0] as { targetId?: string }).targetId)
      .toBe('@Fn/src/client.ts#loadUsers:3');
    const ev = edges[0].evidence as { kind: string; token: string; origin: string };
    expect(ev).toMatchObject({ kind: 'doc-reference', token: 'loadUsers', origin: 'prose' });
  });

  it('a non-matching backtick mints NOTHING — not an unresolved edge (asymmetric by design)', () => {
    const g = graphFor('## Usage\n`--stale-only` `coderef/foundation-docs` `totallyUnknownThing`\n');
    expect(refs(g)).toHaveLength(0);
    expect(g.edges.filter(e => e.reason === 'doc_reference_ambiguous')).toHaveLength(0);
  });

  it('an AMBIGUOUS name mints one ambiguous edge with candidates and no target', () => {
    const twins = makeState([sheetFact({ sections: extractDocSections(docId, '## U\nsee `dup`\n') })]);
    (twins as unknown as { elements: unknown[] }).elements = [
      ...(twins.elements as unknown[]),
      { type: 'function', name: 'dup', file: `${ROOT}/src/a.ts`, line: 1, codeRefId: '@Fn/src/a.ts#dup:1' },
      { type: 'function', name: 'dup', file: `${ROOT}/src/b.ts`, line: 1, codeRefId: '@Fn/src/b.ts#dup:1' },
    ];
    const edges = refs(constructGraph(twins));
    expect(edges).toHaveLength(1);
    expect(edges[0].resolutionStatus).toBe('ambiguous');
    expect((edges[0] as { targetId?: string }).targetId).toBeUndefined();
    expect(edges[0].reason).toBe('doc_reference_ambiguous');
    expect(edges[0].candidates).toEqual(['@Fn/src/a.ts#dup:1', '@Fn/src/b.ts#dup:1']);
  });

  it('docReferences() answers "which prose names this symbol" without widening blast radius', () => {
    const g = graphFor('## Usage\nCall `loadUsers`.\n');
    const q = new CanonicalGraphQuery(g as unknown as ExportedGraph);
    const hits = q.docReferences('loadUsers');
    expect(hits.map(h => h.section.id)).toEqual([`${docId}#usage`]);
    // Blast radius is UNCHANGED: the doc section must not appear as a dependent.
    expect(q.dependentsOf(q.resolve('loadUsers')).map(n => n.id))
      .not.toContain(`${docId}#usage`);
  });

  it('extraction stays deterministic with mentions in play (AC-08)', () => {
    const body = '## A\n`loadUsers` and `saveUser`\n## A\n`loadUsers`\n';
    expect(extractDocSections(docId, body)).toEqual(extractDocSections(docId, body));
  });
});

/**
 * WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P3.
 *
 * Fenced-block identifiers, QUARANTINED (DL-4). The quarantine is the
 * load-bearing invariant: a doc example calling run() must not mint a call
 * edge into real code, must not move the resolution-rate denominator, and must
 * not come within reach of rename_apply. Fence identifiers are candidates for
 * the same membership gate as prose — nothing more.
 */
describe('fenced-block identifiers (DL-4 quarantine)', () => {
  const sheetPath = 'coderef/resource-sheets/client-RESOURCE-SHEET.md';
  const docId = docNodeId(sheetPath);

  it('lexes imported names, call callees and new targets; skips members, strings, comments', () => {
    const found = lexFencedIdentifiers([
      "import { loadUsers, saveUser as persist } from './client.js';",
      "import Orchestrator from './orch.js';",
      'const c = new LRUCache();',
      'loadUsers();',
      'ctx.shouldBeSkipped();',        // member callee — receiver is untyped
      "const s = 'notAnIdentifier()';", // inside a string literal
      '// commentedCall();',
      'if (x) { while (y) {} }',       // keywords in call position
    ].join('\n'));
    expect(found).toContain('loadUsers');
    expect(found).toContain('saveUser');   // the pre-rename binding, not the alias
    expect(found).toContain('Orchestrator');
    expect(found).toContain('LRUCache');
    for (const excluded of ['shouldBeSkipped', 'notAnIdentifier', 'commentedCall', 'if', 'while']) {
      expect(found).not.toContain(excluded);
    }
  });

  it('attaches identifiers to the enclosing section for ts/js fences only', () => {
    const sections = extractDocSections(docId, [
      '## Example',
      '```ts',
      'loadUsers();',
      '```',
      '## Shell',
      '```bash',
      'loadUsers --now',
      '```',
    ].join('\n'));
    expect(sections[0].codeIdentifiers).toEqual(['loadUsers']);
    expect(sections[1].codeIdentifiers).toBeUndefined(); // bash is not a lexed lang
    expect(sections[0].mentions).toEqual([]);            // fence content is not prose
  });

  it('mints a references edge with origin=code-block when the symbol table backs it', () => {
    const sections = extractDocSections(docId, '## Example\n```ts\nloadUsers();\n```\n');
    const graph = constructGraph(makeState([sheetFact({ sections })]));
    const refs = graph.edges.filter(e => e.relationship === 'references');
    expect(refs).toHaveLength(1);
    expect(refs[0].resolutionStatus).toBe('resolved');
    expect((refs[0].evidence as { origin: string }).origin).toBe('code-block');
  });

  it('QUARANTINE PROOF: a snippet-only symbol mints nothing anywhere', () => {
    const sections = extractDocSections(
      docId,
      '## Example\n```ts\nimport { ghostApi } from "nowhere";\nghostApi();\nnew PhantomThing();\n```\n',
    );
    // The lexer sees them...
    expect(sections[0].codeIdentifiers).toEqual(expect.arrayContaining(['ghostApi', 'PhantomThing']));
    const graph = constructGraph(makeState([sheetFact({ sections })]));
    // ...but nothing about them reaches the graph: no node, no edge of any
    // kind, and in particular no call/import edge into real code.
    const ids = graph.nodes.map(n => n.id).join('|');
    expect(ids).not.toContain('ghostApi');
    expect(ids).not.toContain('PhantomThing');
    expect(graph.edges.filter(e => e.relationship === 'references')).toHaveLength(0);
    for (const e of graph.edges) {
      const ev = (e.evidence ?? {}) as { calleeName?: string; originSpecifier?: string };
      expect(ev.calleeName).not.toBe('ghostApi');
      expect(ev.originSpecifier).not.toBe('nowhere');
    }
    // The code universe is exactly what it was with no doc at all.
    const bare = constructGraph(makeState([]));
    const codeIds = (g: typeof graph) =>
      g.nodes.filter(n => !String(n.id).startsWith('@Doc/')).map(n => n.id).sort();
    expect(codeIds(graph)).toEqual(codeIds(bare));
    expect(graph.edges.filter(e => e.relationship === 'call')).toHaveLength(0);
  });

  it('a token named in BOTH lanes is ONE claim, attributed to prose', () => {
    const sections = extractDocSections(
      docId,
      '## Both\nUse `loadUsers` like so:\n```ts\nloadUsers();\n```\n',
    );
    expect(sections[0].mentions).toContain('loadUsers');
    expect(sections[0].codeIdentifiers).toContain('loadUsers');
    const refs = constructGraph(makeState([sheetFact({ sections })]))
      .edges.filter(e => e.relationship === 'references');
    expect(refs).toHaveLength(1);
    expect((refs[0].evidence as { origin: string }).origin).toBe('prose');
  });
});

/**
 * REGRESSION (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001).
 *
 * Resource sheets routinely head a section with the exact name of the symbol
 * they document, so a section node's `name` can collide with a real element's.
 * Caught live: `resolve('normalizeSlashes')` returned the prose section
 * ALONGSIDE the function, which silently changed every name-keyed answer
 * (what_calls / impact_of / find_element) about real code. Sections must be
 * addressable by id and unreachable by name.
 */
describe('doc sections never shadow a code symbol by name', () => {
  const sheetPath = 'coderef/resource-sheets/client-RESOURCE-SHEET.md';
  const docId = docNodeId(sheetPath);
  // A heading named EXACTLY like the element in makeState().
  const sections = extractDocSections(docId, '## loadUsers\nProse about it.\n');
  const graph = constructGraph(makeState([sheetFact({ sections })]));
  const sectionId = `${docId}#loadusers`;

  it('mints the colliding section node (the hazard is real, not hypothetical)', () => {
    expect(graph.nodes.find(n => n.id === sectionId)?.name).toBe('loadUsers');
  });

  it('resolve() by name returns ONLY the code element, in both resolvers', () => {
    const q = new CanonicalGraphQuery(graph as unknown as ExportedGraph);
    expect(q.resolve('loadUsers').nodes.map(n => n.id)).toEqual(['@Fn/src/client.ts#loadUsers:3']);
    expect(resolveNodes('loadUsers', graph as unknown as ExportedGraph).nodes.map(n => n.id))
      .toEqual(['@Fn/src/client.ts#loadUsers:3']);
  });

  it('the section is still addressable by its exact id', () => {
    const q = new CanonicalGraphQuery(graph as unknown as ExportedGraph);
    expect(q.resolve(sectionId).nodes.map(n => n.id)).toEqual([sectionId]);
    expect(resolveNodes(sectionId, graph as unknown as ExportedGraph).nodes.map(n => n.id))
      .toEqual([sectionId]);
  });

  it('blast radius for the symbol contains no doc node at all', () => {
    const q = new CanonicalGraphQuery(graph as unknown as ExportedGraph);
    const deps = q.dependentsOf(q.resolve('loadUsers')).map(n => n.id);
    expect(deps.filter(id => id.startsWith('@Doc/'))).toEqual([]);
  });
});
