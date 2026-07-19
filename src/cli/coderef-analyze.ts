#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-analyze
 */

import { parseArgs } from 'node:util';
import { ConfigAnalyzer } from '../analyzer/config-analyzer.js';
import { ContractDetector } from '../analyzer/contract-detector.js';
import { DatabaseDetector } from '../analyzer/database-detector.js';
import { DependencyAnalyzer } from '../analyzer/dependency-analyzer.js';
import { DesignPatternDetector } from '../analyzer/design-pattern-detector.js';
import { DocsAnalyzer } from '../analyzer/docs-analyzer.js';
import { analyzeMiddlewareAndDI } from '../analyzer/middleware-detector.js';
import { ComplexityScorer } from '../context/complexity-scorer.js';
import {
  CanonicalGraphError,
  CanonicalGraphQuery,
  loadCanonicalGraph,
} from '../query/canonical-graph.js';
import type { ElementData } from '../types/types.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { computeTestsForChange } from '../query/tests-for-change.js';
import { parseDiffToChangedElements, type ChangedElement } from '../query/changed-elements.js';
import { isTestLikeFile } from '../map/graph-analytics.js';
import { searchAst, computeNotSearchedCounts, type AstSearchFile, type AstSearchElement } from '../search/ast-search.js';
import { listLanguageFilesOnDisk } from '../search/language-files.js';
import { computeTypeHierarchy, type TypeHierarchyDirection } from '../query/type-hierarchy.js';
import { extractExportsManifest, diffApiSurface, type ExportsManifest, type ManifestElement } from '../query/api-diff.js';
import {
  parseRulesSpec, projectLayerEdges, checkDependencyRules,
  type DependencyRulesNode, type DependencyRulesEdge,
} from '../query/dependency-rules.js';
import { computeDocstringSurface, type DocstringElement } from '../query/docstrings.js';

const TYPES = [
  'config', 'contract', 'db', 'dependency', 'pattern', 'docs',
  'middleware', 'graph', 'complexity', 'impact', 'multi-hop', 'breaking-changes',
  'tests-for-change', 'ast-search', 'type-hierarchy', 'dependency-rules', 'docstrings',
] as const;
type AnalyzeType = typeof TYPES[number];

function printHelp(): void {
  console.log(`
coderef-analyze — run a single analysis pass on a project

Usage:
  coderef-analyze --project=<path> --type=<type> [options]

Required:
  --project=<path>   Path to the project root
  --type=<type>      Analysis type (see below)

Options:
  --output=<fmt>     Output format: json | text  (default: text)
  --element=<id>     Target element ID (required for: impact, multi-hop)
  --depth=<N>        Max traversal depth (default: 5; used by: impact, multi-hop)
  --from=<label>     Baseline manifest snapshot label or .json path (breaking-changes; default "baseline")
  --to=<label>       Snapshot the CURRENT exports under this label instead of diffing (breaking-changes)
  --ref=<ref>        Git ref to diff against (used by: tests-for-change; default HEAD)
  --lang=<ext>       Source language extension for ast-search (ts, tsx, js, jsx, py, go, rs, java, cpp, cc, cxx, c++, c, h)
  --query=<s-expr>   tree-sitter S-expression query (required for: ast-search)
  --limit=<N>        Max results (used by: ast-search; default 100)
  --gate             Exit 2 on any dependency-rule violation (dependency-rules; CI gate)
  --help             Print this help

Analysis types:
  config             Detect project configuration (tsconfig, package.json, Docker, env)
  contract           Detect API contracts (OpenAPI, GraphQL, Protobuf, JSON Schema)
  db                 Detect database patterns (ORM, raw queries, migrations)
  dependency         Analyze npm dependency health (outdated, missing, unused)
  pattern            Detect design patterns (Singleton, Observer, Factory, etc.)
  docs               Analyze documentation coverage and quality
  middleware         Detect middleware chains and DI containers
  graph              Print canonical dependency-graph statistics
  complexity         Score element complexity
  impact             Blast radius for a changed element (requires --element)
  multi-hop          Traverse multi-hop relationships (requires --element)
  breaking-changes   Exported-API-surface diff over a snapshot baseline. Snapshot
                     the current exports (--to=<label>), change the API, then diff
                     (--from=<label>, default "baseline") into added / removed /
                     signature-changed exports. Surfaces, NOT verdicts: a removed
                     export is a CHANGE fact, never auto-"break"; no composite score.
                     No baseline = no-data, never a false "0 breaking changes".
  tests-for-change   Diff-to-test-selection: map a git diff (default HEAD) to
                     changed elements, then return the TEST-FILE elements that
                     reach them through resolved call/import edges, ranked by
                     directness. Absence is no-data, not "untested". (--ref)
  ast-search         Structural AST pattern search: run a tree-sitter
                     S-expression --query against every --lang source file and
                     return file+line+snippet, attributed to the enclosing
                     element's codeRefId so hits join the graph tools. A match
                     is a syntactic fact, never a verdict; absence is no-data.
                     A malformed query degrades to reason:"invalid_query".
                     (--lang, --query, --limit)
  dependency-rules   Dependency-rules gate: check DECLARED architecture
                     constraints (optional .coderef/rules.json, forbid/allow
                     layer-pairs) against the OBSERVED declared-layer edges in
                     graph.json. Per rule: satisfied | violated | not_applicable,
                     with the offending edges named. Surfaces, NOT verdicts: no
                     composite health score. No rules.json = no-data, never a
                     false "all rules pass". With --gate, exit 2 on any violation
                     (CI gate); default exit 0 (report-only).

Note: graph, complexity, impact, multi-hop, and middleware read the canonical
.coderef/graph.json produced by the populate pipeline (DR-PHASE-5-C). Run
populate first if the artifact is missing or stale.
`.trim());
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true, recursive: true as any });
  for (const entry of entries) {
    if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/**
 * Load the canonical graph for --project, exiting with the run-populate hint
 * when .coderef/graph.json is absent (the graph-backed types no longer build
 * an in-memory graph — DR-PHASE-5-C retirement, Phase 2).
 */
function loadEngineOrExit(project: string): CanonicalGraphQuery {
  try {
    return loadCanonicalGraph(project);
  } catch (err) {
    if (err instanceof CanonicalGraphError) {
      console.error(`coderef-analyze error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Project the canonical graph's element nodes into ElementData[] (the shape
 * ComplexityScorer and analyzeMiddlewareAndDI consume), with calls[] rebuilt
 * from resolved call edges.
 */
function canonicalElements(engine: CanonicalGraphQuery): ElementData[] {
  const callsBySource = new Map<string, string[]>();
  const nodeName = new Map<string, string | undefined>();
  for (const node of engine.graph.nodes) nodeName.set(node.id, node.name);
  for (const edge of engine.graph.edges) {
    if (edge.resolutionStatus !== 'resolved' || edge.relationship !== 'call') continue;
    if (!edge.sourceId || !edge.targetId) continue;
    const targetName = nodeName.get(edge.targetId);
    if (!targetName) continue;
    const list = callsBySource.get(edge.sourceId);
    if (list) {
      if (!list.includes(targetName)) list.push(targetName);
    } else {
      callsBySource.set(edge.sourceId, [targetName]);
    }
  }

  const elements: ElementData[] = [];
  for (const node of engine.graph.nodes) {
    if (node.id.startsWith('@File/') || !node.file) continue;
    const element: ElementData = {
      type: (node.type as ElementData['type']) || 'function',
      name: node.name ?? node.id,
      file: node.file,
      line: node.line ?? 1,
      headerStatus: (node.metadata?.headerStatus as ElementData['headerStatus']) ?? DEFAULT_HEADER_STATUS,
    };
    const calls = callsBySource.get(node.id);
    if (calls && calls.length > 0) element.calls = calls;
    elements.push(element);
  }
  return elements;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      project: { type: 'string' },
      type:    { type: 'string' },
      output:  { type: 'string' },
      element:   { type: 'string' },
      depth:     { type: 'string' },
      direction: { type: 'string' },
      from:      { type: 'string' },
      to:        { type: 'string' },
      ref:       { type: 'string' },
      lang:      { type: 'string' },
      query:     { type: 'string' },
      limit:     { type: 'string' },
      offset:    { type: 'string' },
      documented:   { type: 'boolean', default: false },
      undocumented: { type: 'boolean', default: false },
      gate:    { type: 'boolean', default: false },
      help:    { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const project = values.project as string | undefined;
  const type = values.type as AnalyzeType | undefined;

  if (!project) { console.error('Error: --project is required'); printHelp(); process.exit(1); }
  if (!type || !(TYPES as readonly string[]).includes(type)) {
    console.error(`Error: --type must be one of: ${TYPES.join(', ')}`);
    process.exit(1);
  }

  const fmt   = (values.output as string | undefined) ?? 'text';
  const depth = parseInt((values.depth as string | undefined) ?? '5', 10) || 5;

  function emit(result: unknown): void {
    if (fmt === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  }

  switch (type) {
    case 'config': {
      const analyzer = new ConfigAnalyzer(project);
      emit(analyzer.analyze());
      break;
    }
    case 'contract': {
      const detector = new ContractDetector(project);
      emit(detector.detect());
      break;
    }
    case 'db': {
      const detector = new DatabaseDetector(project);
      emit(detector.detect());
      break;
    }
    case 'dependency': {
      const analyzer = new DependencyAnalyzer(project);
      emit(await analyzer.analyze());
      break;
    }
    case 'pattern': {
      const detector = new DesignPatternDetector(project);
      emit(detector.analyze());
      break;
    }
    case 'docs': {
      const analyzer = new DocsAnalyzer(project);
      emit(await analyzer.analyze());
      break;
    }
    case 'middleware': {
      const engine   = loadEngineOrExit(project);
      const elements = canonicalElements(engine);
      const tsFiles  = await collectTsFiles(join(project, 'src'));
      const fileMap  = new Map<string, string>();
      for (const f of tsFiles) {
        try { fileMap.set(f, await readFile(f, 'utf-8')); } catch { /* skip unreadable */ }
      }
      emit(analyzeMiddlewareAndDI(elements, fileMap));
      break;
    }
    case 'graph': {
      const engine = loadEngineOrExit(project);
      emit({
        source: '.coderef/graph.json',
        version: engine.graph.version,
        statistics: engine.statistics(),
      });
      break;
    }
    case 'complexity': {
      const engine   = loadEngineOrExit(project);
      const elements = canonicalElements(engine);
      const scorer   = new ComplexityScorer();
      emit(scorer.scoreElements(elements));
      break;
    }
    case 'impact': {
      if (!values.element) { console.error('Error: --element is required for --type=impact'); process.exit(1); }
      const engine     = loadEngineOrExit(project);
      const resolution = engine.resolve(values.element as string);
      if (resolution.nodes.length === 0) {
        console.error(`Error: no graph node matches --element "${values.element}"`);
        process.exit(1);
      }
      const blastRadius = engine.dependentsOf(resolution, depth);
      emit({
        element: values.element,
        resolved: resolution.nodes.slice(0, 10).map(n => n.id),
        depth,
        count: blastRadius.length,
        blastRadius,
      });
      break;
    }
    case 'multi-hop': {
      if (!values.element) { console.error('Error: --element is required for --type=multi-hop'); process.exit(1); }
      const engine     = loadEngineOrExit(project);
      const resolution = engine.resolve(values.element as string);
      if (resolution.nodes.length === 0) {
        console.error(`Error: no graph node matches --element "${values.element}"`);
        process.exit(1);
      }
      emit({
        element: values.element,
        depth,
        usedBy:    engine.dependentsOf(resolution, depth),
        calls:     engine.calleesOf(resolution),
        dependsOn: engine.dependenciesOf(resolution, depth),
      });
      break;
    }
    case 'tests-for-change': {
      const engine = loadEngineOrExit(project);
      const gitRef = (values.ref as string | undefined) ?? 'HEAD';

      // Run the read-only diff (same shape the MCP diff_impact tool runs).
      const gitArgs = ['diff', '-U0', '--no-color'];
      if (gitRef !== 'WORKTREE') gitArgs.push(gitRef);
      const res = spawnSync('git', [...gitArgs, '--'], {
        cwd: project,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      if (res.error || res.status !== 0) {
        console.error(
          `coderef-analyze error: git diff failed (ref="${gitRef}"): ` +
          String(res.error?.message ?? res.stderr ?? `exit ${res.status}`).slice(0, 300),
        );
        process.exit(1);
      }

      // Load index.json (sibling of graph.json) for line-range attribution.
      let indexElements: ChangedElement[] = [];
      try {
        const idxPath = join(project, '.coderef', 'index.json');
        const idx = JSON.parse(await readFile(idxPath, 'utf8')) as { elements?: ChangedElement[] };
        indexElements = idx.elements ?? [];
      } catch {
        console.error(
          'coderef-analyze error: .coderef/index.json not found or unreadable. ' +
          'Run populate-coderef first.',
        );
        process.exit(1);
      }

      // Build the graph primitives (nodeById + reverse adjacency) from the
      // canonical graph, mirroring the MCP server's cache.
      const nodeById = new Map(engine.graph.nodes.map(n => [n.id, n]));
      const inbound = new Map<string, typeof engine.graph.edges>();
      for (const edge of engine.graph.edges) {
        if (!edge.targetId) continue;
        const list = inbound.get(edge.targetId);
        if (list) list.push(edge);
        else inbound.set(edge.targetId, [edge]);
      }

      const { changedElements, changedFileCount } = parseDiffToChangedElements(res.stdout, indexElements);
      const selection = computeTestsForChange({
        changedElementIds: changedElements.keys(),
        nodeById,
        inbound,
        isTestFile: isTestLikeFile,
        maxDepth: depth,
      });

      emit({
        ref: gitRef,
        changed_files: changedFileCount,
        changed_elements: changedElements.size,
        max_depth: depth,
        test_file_count: selection.test_file_count,
        selected_tests: selection.total,
        test_files: selection.files,
        tests: selection.tests,
        note:
          'Ranked test-file elements reaching the diff through resolved call/import edges ' +
          '(depth 1 = direct). Absence is no-data, not "untested".',
      });
      break;
    }
    case 'ast-search': {
      const lang = values.lang as string | undefined;
      const query = values.query as string | undefined;
      if (!lang) { console.error('Error: --lang is required for --type=ast-search'); process.exit(1); }
      if (!query) { console.error('Error: --query is required for --type=ast-search'); process.exit(1); }
      const limit = parseInt((values.limit as string | undefined) ?? '100', 10) || 100;

      // Load index.json (element attribution + the source file list), same seam
      // tests-for-change uses.
      interface IdxEl { file: string; line: number; codeRefId?: string; name?: string }
      let idxElements: IdxEl[] = [];
      try {
        const idxPath = join(project, '.coderef', 'index.json');
        const idx = JSON.parse(await readFile(idxPath, 'utf8')) as { elements?: IdxEl[] };
        idxElements = idx.elements ?? [];
      } catch {
        console.error(
          'coderef-analyze error: .coderef/index.json not found or unreadable. ' +
          'Run populate-coderef first.',
        );
        process.exit(1);
      }

      const elements: AstSearchElement[] = idxElements.map(e => ({
        file: e.file, line: e.line, codeRefId: e.codeRefId, name: e.name,
      }));

      // Distinct source files for the requested language, read from disk.
      const wantExt = lang.toLowerCase();
      const indexedFiles = new Set<string>();  // distinct lang files present in the index
      const searchedFiles: string[] = [];      // index lang files actually read
      const files: AstSearchFile[] = [];
      for (const el of idxElements) {
        const ext = extname(el.file).slice(1).toLowerCase();
        if (ext !== wantExt || indexedFiles.has(el.file)) continue;
        indexedFiles.add(el.file);
        try {
          const abs = el.file.startsWith('/') || /^[A-Za-z]:/.test(el.file)
            ? el.file : join(project, el.file);
          files.push({ file: el.file, content: await readFile(abs, 'utf8') });
          searchedFiles.push(el.file);
        } catch {
          // Unreadable/deleted file contributes no matches (counted below).
        }
      }

      // REC-002: not-searched visibility — on-disk language files with no index
      // element are silently unsearched otherwise. Surface the skip counts so
      // "zero matches" is distinguishable from "this file was never searched".
      const onDiskFiles = listLanguageFilesOnDisk(project, wantExt);
      const skip = computeNotSearchedCounts(onDiskFiles, [...indexedFiles], searchedFiles);

      const result = await searchAst({ lang: wantExt, query, files, elements, limit });
      emit({
        language: result.language,
        query: result.query,
        files_searched: files.length,
        files_skipped_no_index: skip.filesSkippedNoIndex,
        files_skipped_unreadable: skip.filesSkippedUnreadable,
        total_matches: result.totalMatches,
        truncated: result.truncated,
        ...(result.reason ? { reason: result.reason } : {}),
        matches: result.matches,
        note: result.note,
      });
      break;
    }
    case 'type-hierarchy': {
      if (!values.element) { console.error('Error: --element is required for --type=type-hierarchy'); process.exit(1); }
      const engine = loadEngineOrExit(project);
      const resolution = engine.resolve(values.element as string);
      if (resolution.nodes.length === 0) {
        console.error(`Error: no graph node matches --element "${values.element}"`);
        process.exit(1);
      }
      const graph = engine.graph;

      // Build heritage adjacency + node map from the loaded graph (parity with the
      // MCP handler): only extends/implements edges participate.
      const nodeById = new Map(graph.nodes.map(n => [n.id, n] as const));
      const supertypeEdges = new Map<string, typeof graph.edges>();
      const subtypeEdges = new Map<string, typeof graph.edges>();
      for (const edge of graph.edges) {
        if (edge.type !== 'extends' && edge.type !== 'implements') continue;
        const src = edge.sourceId ?? edge.source;
        const tgt = edge.targetId ?? edge.target;
        if (src) { const l = supertypeEdges.get(src); if (l) l.push(edge); else supertypeEdges.set(src, [edge]); }
        if (tgt) { const l = subtypeEdges.get(tgt); if (l) l.push(edge); else subtypeEdges.set(tgt, [edge]); }
      }

      const dirRaw = values.direction as string | undefined;
      const direction: TypeHierarchyDirection =
        dirRaw === 'up' || dirRaw === 'down' || dirRaw === 'both' ? dirRaw : 'both';
      const maxDepth = values.depth ? depth : undefined;

      const result = computeTypeHierarchy({
        element: resolution.nodes[0].id,
        direction,
        nodeById,
        supertypeEdges,
        subtypeEdges,
        maxDepth,
      });
      emit({
        element: result.element,
        element_resolved: result.element_resolved,
        direction: result.direction,
        supertype_count: result.supertypes.length,
        subtype_count: result.subtypes.length,
        supertypes: result.supertypes,
        subtypes: result.subtypes,
        truncated: result.truncated,
        note: result.note,
      });
      break;
    }
    case 'breaking-changes': {
      // Exported-API-surface diff over a snapshot baseline (P6). Mirrors the MCP
      // api_diff tool + map_metrics_delta's snapshot model: the OLD git-ref
      // call-site path (breaking-change-detector/) stays gated; here we diff a
      // manifest snapshot the caller took earlier vs the current exports. The
      // pure differ is in src/query/api-diff.ts; git stays out of it.
      // Project the current exports manifest from the canonical index.json
      // elements — the SAME source the MCP api_diff handler uses (loadIndex().
      // elements). graph.json nodes carry NO metadata.exported / metadata.
      // parameters, so building the manifest from them fabricated `exported`
      // and left paramArity permanently null (dead signature-change detection).
      // index.json elements carry the real exported flag + parameter list.
      let currentElements: ManifestElement[] = [];
      try {
        const idxPath = join(project, '.coderef', 'index.json');
        const idx = JSON.parse(await readFile(idxPath, 'utf8')) as { elements?: ManifestElement[] };
        currentElements = idx.elements ?? [];
      } catch {
        console.error(
          'coderef-analyze error: .coderef/index.json not found or unreadable. ' +
          'Run populate-coderef first.',
        );
        process.exit(1);
      }
      const afterManifest = extractExportsManifest(currentElements);

      // BEFORE: --from as a snapshot label or a manifest .json path (default
      // "baseline" sidecar). --to snapshots the current manifest to a sidecar.
      const crefDir = join(project, '.coderef');
      const snapPath = (label: string) =>
        join(crefDir, `api-manifest-${label.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);
      const fs = await import('node:fs');

      // --to=<label> in this model = "snapshot the current surface under <label>".
      if (values.to) {
        const label = String(values.to);
        const out = snapPath(label);
        fs.writeFileSync(out, JSON.stringify(afterManifest, null, 2), 'utf8');
        emit({
          action: 'snapshot',
          ok: true,
          snapshot_label: label,
          snapshot_path: out.replace(/\\/g, '/'),
          exported_count: Object.keys(afterManifest.exports).length,
          hint: `Snapshot saved. Change the API, then diff: --type=breaking-changes --from=${label}`,
        });
        break;
      }

      const from = values.from ? String(values.from) : 'baseline';
      const fromIsPath = from.includes('/') || from.includes('\\') || from.endsWith('.json');
      const beforePath = fromIsPath ? from : snapPath(from);
      let beforeManifest: ExportsManifest | undefined;
      try {
        if (fs.existsSync(beforePath)) {
          const parsed = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
          if (parsed && typeof parsed === 'object' && 'exports' in parsed) beforeManifest = parsed as ExportsManifest;
        }
      } catch { /* absent/unreadable -> no-data below */ }

      const diff = diffApiSurface({ before: beforeManifest, after: afterManifest });
      emit({
        action: 'delta',
        ok: !diff.noData,
        no_data: diff.noData,
        before_path: beforePath.replace(/\\/g, '/'),
        schema_version: diff.schemaVersion,
        added_count: diff.added.length,
        removed_count: diff.removed.length,
        changed_count: diff.changed.length,
        unchanged_count: diff.unchangedCount,
        added: diff.added,
        removed: diff.removed,
        changed: diff.changed,
        warnings: diff.warnings,
        note: diff.noData
          ? `${diff.note} No baseline at ${beforePath.replace(/\\/g, '/')} — snapshot first: --type=breaking-changes --to=baseline`
          : diff.note,
      });
      break;
    }
    case 'dependency-rules': {
      // Dependency-rules gate (P7): check declared architecture constraints
      // (.coderef/rules.json) against the observed declared-layer edges in
      // graph.json. Rides the same layer model as src/map/layer-drift.ts. The
      // pure checker is in src/query/dependency-rules.ts; git stays out of it.
      const fs = await import('node:fs');
      const crefDir = join(project, '.coderef');

      // Load graph.json (nodes carry metadata.layer; edges are node-id pairs).
      let graphNodes: DependencyRulesNode[] = [];
      let graphEdges: DependencyRulesEdge[] = [];
      try {
        const graphRaw = JSON.parse(await readFile(join(crefDir, 'graph.json'), 'utf8')) as {
          nodes?: DependencyRulesNode[]; edges?: DependencyRulesEdge[];
        };
        graphNodes = graphRaw.nodes ?? [];
        graphEdges = graphRaw.edges ?? [];
      } catch {
        console.error(
          'coderef-analyze error: .coderef/graph.json not found or unreadable. ' +
          'Run populate-coderef first.',
        );
        process.exit(1);
      }

      const layerEdges = projectLayerEdges(graphNodes, graphEdges);

      // ABSENCE = NO-DATA: no rules.json -> honest no_data, never a false pass.
      const rulesPath = join(crefDir, 'rules.json');
      if (!fs.existsSync(rulesPath)) {
        emit({
          action: 'gate',
          ok: true,
          no_data: true,
          schema_version: '1.0.0',
          rule_count: 0,
          violated_count: 0,
          satisfied_count: 0,
          not_applicable_count: 0,
          observed_layer_edge_count: layerEdges.length,
          rules: [],
          warnings: [],
          note:
            `no .coderef/rules.json — declare forbid/allow layer-pair constraints to enable ` +
            `the gate. Observed ${layerEdges.length} declared-layer dependency edge(s).`,
        });
        break;
      }

      let rulesRaw: unknown;
      try {
        rulesRaw = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      } catch (err) {
        console.error(
          `coderef-analyze error: .coderef/rules.json is not valid JSON: ` +
          String(err instanceof Error ? err.message : err).slice(0, 200),
        );
        process.exit(1);
      }

      const spec = parseRulesSpec(rulesRaw);
      const report = checkDependencyRules({ rules: spec, layerEdges });
      emit({
        action: 'gate',
        ok: report.violatedCount === 0,
        no_data: false,
        schema_version: report.schemaVersion,
        rule_count: report.ruleCount,
        violated_count: report.violatedCount,
        satisfied_count: report.satisfiedCount,
        not_applicable_count: report.notApplicableCount,
        observed_layer_edge_count: layerEdges.length,
        rules: report.rules,
        warnings: report.warnings,
        note: report.note,
      });

      // --gate: opt-in CI exit code. A violation exits 2 ONLY when the operator
      // asked for the gate; the default (report-only) always exits 0 — the
      // surfaces-not-verdicts default. process.exit here is intentional.
      if (values.gate && report.violatedCount > 0) process.exit(2);
      break;
    }
    case 'docstrings': {
      // Per-element docstring surface (P8): reads the ElementData.docstring slot
      // the live extractor now fills, from the canonical index.json elements
      // (the same source the api_diff/breaking-changes path uses). The pure
      // projection is in src/query/docstrings.ts. Surfaces-not-verdicts:
      // coverageRatio is provenance, not a quality grade.
      let elements: DocstringElement[] = [];
      try {
        const idxPath = join(project, '.coderef', 'index.json');
        const idx = JSON.parse(await readFile(idxPath, 'utf8')) as { elements?: DocstringElement[] };
        elements = idx.elements ?? [];
      } catch {
        console.error(
          'coderef-analyze error: .coderef/index.json not found or unreadable. ' +
          'Run populate-coderef first.',
        );
        process.exit(1);
      }

      const documented =
        values.documented === true ? true : values.undocumented === true ? false : undefined;
      const docLimit = values.limit
        ? (parseInt(values.limit as string, 10) || undefined)
        : undefined;
      const docOffset = values.offset
        ? (parseInt(values.offset as string, 10) || undefined)
        : undefined;

      const surface = computeDocstringSurface({
        elements,
        filter: values.element as string | undefined,
        documented,
        limit: docLimit,
        offset: docOffset,
      });
      emit(surface);
      break;
    }
    default: {
      const _exhaustive: never = type;
      console.error(`Unhandled type: ${_exhaustive}`);
      process.exit(1);
    }
  }
}

main().catch((err: unknown) => {
  console.error('coderef-analyze error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
