/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-verify-tools
 * @exports buildVerifyTools
 */

/**
 * Verify tool family — the diff/pre-flight and analysis-projection surface:
 * diff_impact, tests_for_change, ast_search, api_diff, dependency_rules,
 * change_dossier, docstrings, clones, scip_resolution_delta. change_dossier
 * composes its four sibling legs via the local tools object (was this.* in
 * the monolith — same call targets, explicit binding).
 * Extracted VERBATIM from the coderef-mcp-server monolith
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1) — handler bodies, response
 * envelopes, and pagination semantics unchanged; tool registration stays in
 * coderef-mcp-server.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  composeChangeDossier, condenseApiDiff, condenseImpact, condenseRules, condenseTests,
} from '../../query/change-dossier.js';
import { computeRunCommand, computeTestsForChange, type RunnerManifest } from '../../query/tests-for-change.js';
import { searchAst, computeNotSearchedCounts, type AstSearchFile, type AstSearchElement } from '../../search/ast-search.js';
import { listLanguageFilesOnDisk } from '../../search/language-files.js';
import { diffApiSurface, extractExportsManifest, type ExportsManifest, type ManifestElement } from '../../query/api-diff.js';
import {
  checkDependencyRules, parseRulesSpec, projectLayerEdges,
  type DependencyRulesEdge, type DependencyRulesNode,
} from '../../query/dependency-rules.js';
import { computeDocstringSurface, type DocstringElement } from '../../query/docstrings.js';
import { computeCloneSurface, type CloneElement } from '../../query/clones.js';
import { decodeScipIndex, ScipDecodeError } from '../../integration/scip/scip-schema.js';
import { computeScipResolutionDelta, type ScipDeltaEdge, type ScipDeltaElement } from '../../query/scip-resolution-delta.js';
import { isTestLikeFile } from '../../map/graph-analytics.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';
import { paginate, shapeResponse } from '../mcp-response-format.js';
import {
  MAX_LIMIT,
  type ExportedNode,
  type HandlerContext,
  type ToolHandlers,
  clampLimit,
  computeChangedElements,
  loadGraph,
  loadIndex,
} from './shared.js';

export type VerifyTools = Pick<
  ToolHandlers,
  | 'diff_impact' | 'tests_for_change' | 'ast_search' | 'api_diff' | 'dependency_rules'
  | 'change_dossier' | 'docstrings' | 'clones' | 'scip_resolution_delta'
>;

export function buildVerifyTools(ctx: HandlerContext): VerifyTools {
  const { projectDir, cache } = ctx;

  const tools: VerifyTools = {

    diff_impact({ ref, max_depth, limit, offset, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const gitRef = ref ?? 'HEAD';

      // Shared front half (diff -> changed elements) — see computeChangedElements.
      const changed = computeChangedElements(projectDir, cache, gitRef);
      if ('error' in changed) return changed.error;
      const { changedElements, changedFileCount } = changed;

      // Union reverse BFS over resolved call+import edges.
      const seeds = [...changedElements.keys()].filter(id => cache.nodeById.has(id));
      const visited = new Set<string>(seeds);
      let frontier = seeds;
      const dependents: ExportedNode[] = [];
      for (let depth = 1; depth <= depthCap && frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const edge of cache.inbound.get(id) ?? []) {
            if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
            const src = edge.sourceId!;
            if (visited.has(src)) continue;
            visited.add(src);
            next.push(src);
            const node = cache.nodeById.get(src);
            if (node) dependents.push(node);
          }
        }
        frontier = next;
      }
      void graph;

      const fileCounts = new Map<string, number>();
      for (const dep of dependents) {
        const f = dep.file ?? '(unknown)';
        fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
      }
      const files = [...fileCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, elements: count }));

      // Phase 6: `files` (affected-files ranking) is the paged list.
      const paged = paginate(files, offset, limit);
      const envelope: Record<string, unknown> = {
        ref: gitRef,
        changed_files: changedFileCount,
        changed_elements: changedElements.size,
        changed_element_sample: [...changedElements.values()].slice(0, Math.min(20, paged.limit)).map(e => ({
          id: e.codeRefId, name: e.name, type: e.type, file: e.file, line: e.line,
        })),
        max_depth: depthCap,
        transitive_dependents: dependents.length,
        affected_files: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        files: paged.page,
        files_truncated: paged.has_more,
        has_more: paged.has_more,
      };
      return shapeResponse(envelope, response_format, ['files', 'changed_element_sample']);
    },

    tests_for_change({ ref, max_depth, limit, offset, response_format }) {
      loadGraph(projectDir, cache);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const gitRef = ref ?? 'HEAD';

      // Shared front half (diff -> changed elements) — same seam diff_impact uses.
      const changed = computeChangedElements(projectDir, cache, gitRef);
      if ('error' in changed) return changed.error;
      const { changedElements, changedFileCount } = changed;

      // PURE join: reverse-BFS the changed elements to the test-file elements
      // that reach them. Delegates ranking to src/query/tests-for-change.ts.
      const selection = computeTestsForChange({
        changedElementIds: changedElements.keys(),
        nodeById: cache.nodeById,
        inbound: cache.inbound,
        isTestFile: isTestLikeFile,
        maxDepth: depthCap,
      });

      // P5 (REC-004): ready-to-run command line for the selected test files,
      // via the shared pure joiner. Manifest read at this impure edge only;
      // an absent/unparseable package.json degrades to run_command no-data.
      let manifest: RunnerManifest | null = null;
      try {
        manifest = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')) as RunnerManifest;
      } catch {
        // no manifest -> computeRunCommand reports no-data, never a guess
      }
      const runBlock = computeRunCommand(manifest, selection.files.map(f => f.file));

      // `tests` (the ranked test-element list) is the paged surface.
      const paged = paginate(selection.tests, offset, limit);
      const envelope: Record<string, unknown> = {
        ref: gitRef,
        changed_files: changedFileCount,
        changed_elements: changedElements.size,
        changed_element_sample: [...changedElements.values()].slice(0, Math.min(20, paged.limit)).map(e => ({
          id: e.codeRefId, name: e.name, type: e.type, file: e.file, line: e.line,
        })),
        max_depth: depthCap,
        // absence = no-data: 0 selected tests means "no test-file element with a
        // recorded edge-path to the change", NEVER "untested" or "safe to skip".
        test_file_count: selection.test_file_count,
        selected_tests: selection.total,
        test_files: selection.files,
        ...runBlock,
        offset: paged.offset,
        limit: paged.limit,
        tests: paged.page,
        tests_truncated: paged.has_more,
        has_more: paged.has_more,
        note:
          'Ranked test-file elements reaching the diff through resolved call/import edges (depth 1 = direct). Absence is no-data, not "untested".',
      };
      return shapeResponse(envelope, response_format, ['tests', 'test_files', 'changed_element_sample']);
    },

    async ast_search({ query, lang, limit, offset, response_format }) {
      // Element set = index.json (start-line attribution, same seam tests_for_change uses).
      const index = loadIndex(projectDir, cache);
      const elements: AstSearchElement[] = index.elements.map(e => ({
        file: e.file,
        line: e.line,
        codeRefId: e.codeRefId,
        name: e.name,
      }));

      // File set = the distinct source files for the requested language, read
      // from disk at this impure CLI edge (searchAst itself stays pure over the
      // supplied content). Files that no longer exist are skipped (best-effort).
      const wantExt = String(lang).toLowerCase();
      const indexedFiles = new Set<string>();  // distinct lang files present in the index
      const searchedFiles: string[] = [];      // index lang files actually read
      const files: AstSearchFile[] = [];
      for (const el of index.elements) {
        const ext = path.extname(el.file).slice(1).toLowerCase();
        if (ext !== wantExt || indexedFiles.has(el.file)) continue;
        indexedFiles.add(el.file);
        try {
          const abs = path.isAbsolute(el.file) ? el.file : path.join(projectDir, el.file);
          files.push({ file: el.file, content: fs.readFileSync(abs, 'utf8') });
          searchedFiles.push(el.file);
        } catch {
          // Unreadable/deleted file contributes no matches (counted below).
        }
      }

      // REC-002: not-searched visibility. Walk the project for on-disk files of
      // this language and compare against the indexed/searched sets so the caller
      // can tell "zero matches" apart from "this file was never searched".
      const onDiskFiles = listLanguageFilesOnDisk(projectDir, wantExt);
      const skip = computeNotSearchedCounts(onDiskFiles, [...indexedFiles], searchedFiles);

      const cap = clampLimit(limit);
      const result = await searchAst({ lang: wantExt, query, files, elements, limit: MAX_LIMIT });

      // Page the (already deterministically sorted) match list.
      const paged = paginate(result.matches, offset, cap);
      const envelope: Record<string, unknown> = {
        language: result.language,
        query: result.query,
        files_searched: files.length,
        // absence=no-data made explicit: files that exist on disk for this
        // language but carry no index element (never searched), and indexed
        // files that could not be read at search time.
        files_skipped_no_index: skip.filesSkippedNoIndex,
        files_skipped_unreadable: skip.filesSkippedUnreadable,
        total_matches: result.totalMatches,
        // absence = no-data: 0 matches means "this syntactic shape was not found"
        // (or the query/language was unusable, see `reason`), never a verdict.
        ...(result.reason ? { reason: result.reason } : {}),
        offset: paged.offset,
        limit: paged.limit,
        matches: paged.page,
        matches_truncated: paged.has_more || result.truncated,
        has_more: paged.has_more,
        note: result.note,
      };
      return shapeResponse(envelope, response_format, ['matches']);
    },

    // api_diff (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P6): diff the
    // EXPORTED API surface against a snapshot baseline, mirroring map_metrics_delta's
    // snapshot-sidecar model (NOT a git-ref re-parse — the OLD breaking-change-detector
    // call-site path stays gated). snapshot:true copies the current exports manifest to
    // a .coderef-confined sidecar; a bare call diffs the "baseline" sidecar vs the
    // current index. Surfaces-not-verdicts + absence=no-data: a missing baseline is
    // declared no-data, never a fabricated all-added/all-removed report.
    api_diff({ before, after, snapshot, snapshot_label, limit, offset, response_format }) {
      const crefDir = path.join(projectDir, '.coderef');
      const snapPath = (label: string) =>
        path.join(crefDir, `api-manifest-${label.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);

      // The current exports manifest, projected from index.json (the same element
      // set find_element / tests_for_change read). NEVER recomputes elements.
      const currentManifest = (): ExportsManifest => {
        const index = loadIndex(projectDir, cache);
        return extractExportsManifest(index.elements as unknown as ManifestElement[]);
      };

      // Load a manifest sidecar written by an earlier snapshot (an ExportsManifest).
      const loadManifestFrom = (p: string): ExportsManifest | undefined => {
        if (!fs.existsSync(p)) return undefined;
        try {
          const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (parsed && typeof parsed === 'object' && 'exports' in parsed) return parsed as ExportsManifest;
          return undefined;
        } catch {
          return undefined;
        }
      };

      // SNAPSHOT mode: copy the current manifest to a named sidecar (pure read/copy).
      if (snapshot) {
        const label = snapshot_label && snapshot_label.length ? snapshot_label : 'baseline';
        const manifest = currentManifest();
        const out = snapPath(label);
        fs.writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf8');
        return {
          action: 'snapshot',
          ok: true,
          snapshot_label: label,
          snapshot_path: normalizeSlashes(out),
          schema_version: manifest.schemaVersion,
          exported_count: Object.keys(manifest.exports).length,
          hint: `Snapshot saved. Change the API, then diff: api_diff({ before: "${label}" }) compares this snapshot to the current exports.`,
          writes_confined_to: normalizeSlashes(crefDir),
        };
      }

      // DELTA mode. BEFORE: an explicit path, else the named snapshot sidecar
      // (default label 'baseline'). AFTER: an explicit path, else the current index.
      const beforeIsPath = before && (before.includes('/') || before.includes('\\') || before.endsWith('.json'));
      const beforePath = before ? (beforeIsPath ? path.resolve(projectDir, before) : snapPath(before)) : snapPath('baseline');
      const beforeManifest = loadManifestFrom(beforePath);
      const afterManifest = after ? loadManifestFrom(path.resolve(projectDir, after)) : currentManifest();

      // No baseline snapshot -> honest no-data, NEVER a false "0 breaking changes".
      const diff = diffApiSurface({ before: beforeManifest, after: afterManifest });
      const cap = clampLimit(limit);
      const pagedAdded = paginate(diff.added, offset, cap);
      const pagedRemoved = paginate(diff.removed, offset, cap);
      const pagedChanged = paginate(diff.changed, offset, cap);

      const envelope: Record<string, unknown> = {
        action: 'delta',
        ok: !diff.noData,
        schema_version: diff.schemaVersion,
        before_path: normalizeSlashes(beforePath),
        no_data: diff.noData,
        // Decomposed change vector — NO composite breaking-count verdict.
        added_count: diff.added.length,
        removed_count: diff.removed.length,
        changed_count: diff.changed.length,
        unchanged_count: diff.unchangedCount,
        added: pagedAdded.page,
        removed: pagedRemoved.page,
        changed: pagedChanged.page,
        offset: pagedAdded.offset,
        limit: pagedAdded.limit,
        has_more: pagedAdded.has_more || pagedRemoved.has_more || pagedChanged.has_more,
        warnings: diff.warnings,
        note: diff.noData
          ? `${diff.note} No baseline snapshot at ${normalizeSlashes(beforePath)} — run api_diff({ snapshot: true }) first.`
          : diff.note,
      };
      return shapeResponse(envelope, response_format, ['added', 'removed', 'changed']);
    },

    // dependency_rules (P7): check DECLARED architecture constraints (an optional
    // .coderef/rules.json — forbid/allow layer-pairs) against the OBSERVED
    // declared-layer edges in graph.json. Read-only, mirrors validation_status's
    // report shape. Surfaces-not-verdicts (no composite score) + absence=no-data
    // (no rules.json -> no_data:true, never a false all-pass). MCP has no exit
    // code — the CLI --gate flag owns the CI gate; the tool only reports.
    dependency_rules({ limit, offset, response_format }) {
      const crefDir = path.join(projectDir, '.coderef');
      const graph = loadGraph(projectDir, cache);
      const layerEdges = projectLayerEdges(
        graph.nodes as unknown as DependencyRulesNode[],
        graph.edges as unknown as DependencyRulesEdge[],
      );

      const rulesPath = path.join(crefDir, 'rules.json');
      if (!fs.existsSync(rulesPath)) {
        return {
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
        };
      }

      let rulesRaw: unknown;
      try {
        rulesRaw = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      } catch (err) {
        return {
          action: 'gate',
          ok: false,
          no_data: true,
          error: 'rules_json_invalid',
          hint: `.coderef/rules.json is not valid JSON: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`,
        };
      }

      const spec = parseRulesSpec(rulesRaw);
      const report = checkDependencyRules({ rules: spec, layerEdges });
      const cap = clampLimit(limit);
      const paged = paginate(report.rules, offset, cap);
      const envelope: Record<string, unknown> = {
        action: 'gate',
        ok: report.violatedCount === 0,
        no_data: false,
        schema_version: report.schemaVersion,
        rule_count: report.ruleCount,
        violated_count: report.violatedCount,
        satisfied_count: report.satisfiedCount,
        not_applicable_count: report.notApplicableCount,
        observed_layer_edge_count: layerEdges.length,
        rules: paged.page,
        offset: paged.offset,
        limit: paged.limit,
        has_more: paged.has_more,
        warnings: report.warnings,
        note: report.note,
      };
      return shapeResponse(envelope, response_format, ['rules']);
    },

    // change_dossier (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P5,
    // REC-007): the pre-flight envelope for a proposed change — ONE call
    // composing the four verify legs this handler object already owns
    // (diff_impact + tests_for_change + api_diff delta + dependency_rules),
    // condensed through the pure src/query/change-dossier.ts seam. Same
    // sibling-handler JOIN pattern as orient: no new substrate, no new write
    // path (api_diff is called in DELTA mode only — never snapshot). A leg
    // that fails (e.g. git diff error) degrades to null + a named warning;
    // composeChangeDossier lists absent legs in no_data.
    change_dossier({ ref, max_depth } = {}) {
      const gitRef = ref ?? 'HEAD';
      const warnings: string[] = [];
      const leg = (name: string, fn: () => Record<string, unknown>): Record<string, unknown> | null => {
        try {
          const env = fn();
          if (env && typeof env === 'object' && 'error' in env) {
            warnings.push(`${name}: ${String(env.error)}${env.detail ? ` — ${String(env.detail).slice(0, 120)}` : ''}`);
            return null;
          }
          return env;
        } catch (err) {
          warnings.push(`${name}: ${String(err instanceof Error ? err.message : err).slice(0, 120)}`);
          return null;
        }
      };

      const impactEnv = leg('diff_impact', () => tools.diff_impact({ ref: gitRef, max_depth, limit: 10 }));
      const testsEnv = leg('tests_for_change', () => tools.tests_for_change({ ref: gitRef, max_depth, limit: 10 }));
      const apiEnv = leg('api_diff', () => tools.api_diff({ limit: 5 }));
      const rulesEnv = leg('dependency_rules', () => tools.dependency_rules({ limit: 100 }));

      return composeChangeDossier({
        ref: gitRef,
        impact: condenseImpact(impactEnv),
        tests: condenseTests(testsEnv),
        api: condenseApiDiff(apiEnv),
        rules: condenseRules(rulesEnv),
        warnings,
      }) as unknown as Record<string, unknown>;
    },

    // docstrings (P8): per-element docstring presence + text, read from the
    // ElementData.docstring slot the live extractor now fills. Read-only,
    // paginated, mirrors the query-tool report shape. Surfaces-not-verdicts
    // (coverageRatio is provenance, not a quality grade) + absence=no-data
    // (undocumented is a fact; empty element set -> no_data). Complements the
    // file-grain docs-analyzer JSDocCoverage — it does not replace it.
    docstrings({ element, documented, limit, offset, response_format }) {
      const index = loadIndex(projectDir, cache);
      const surface = computeDocstringSurface({
        elements: (index.elements ?? []) as unknown as DocstringElement[],
        filter: element,
        documented,
        limit: clampLimit(limit),
        offset: offset === undefined || !Number.isFinite(offset) ? 0 : Math.max(0, Math.floor(offset)),
      });
      return shapeResponse(surface as unknown as Record<string, unknown>, response_format, ['items']);
    },

    // clones (P10): structural-signature duplication surface. Groups elements
    // sharing (kind, name, arity, param-name shingle, import-source set) — the
    // honest zero-re-parse clone signal the index carries (no body/endLine/hash
    // for a true line-hash or AST-subtree pass). Read-only, paginated.
    // Surfaces-not-verdicts (a group is co-location-of-shape, NOT a defect; no
    // score/grade) + absence=no-data (empty set -> no_data). signature_basis +
    // elements_without_signature disclose the basis + thin-signature elements.
    clones({ filter, min_group_size, limit, offset, response_format }) {
      const index = loadIndex(projectDir, cache);
      const surface = computeCloneSurface({
        elements: (index.elements ?? []) as unknown as CloneElement[],
        filter,
        minGroupSize:
          min_group_size === undefined || !Number.isFinite(min_group_size)
            ? undefined
            : Math.max(2, Math.floor(min_group_size)),
        limit: clampLimit(limit),
        offset: offset === undefined || !Number.isFinite(offset) ? 0 : Math.max(0, Math.floor(offset)),
      });
      return shapeResponse(surface as unknown as Record<string, unknown>, response_format, ['groups']);
    },

    // scip_resolution_delta (P11, scope-A): what a user-provided SCIP index
    // resolves that CodeRef's own heuristic did NOT (the ~21.58%-resolution
    // lift). Opt-in via scip_path; ABSENT -> no_data (the honest default, since
    // most repos have no .scip). Read-only: does NOT feed the resolver or mutate
    // edges (that live wiring is a deferred deep integration). Surfaces-not-verdicts.
    scip_resolution_delta({ scip_path, limit, offset, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const index = loadIndex(projectDir, cache);
      let scip = null;
      if (scip_path) {
        try {
          const bytes = fs.readFileSync(scip_path);
          scip = decodeScipIndex(new Uint8Array(bytes));
        } catch (err) {
          // Decode/read failure degrades to no_data with a note rather than a
          // hard tool error — the delta is opt-in enrichment, never a gate.
          if (!(err instanceof ScipDecodeError) && (err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            throw err;
          }
          scip = null;
        }
      }
      const surface = computeScipResolutionDelta({
        scip,
        elements: (index.elements ?? []) as unknown as ScipDeltaElement[],
        edges: (graph.edges ?? []) as unknown as ScipDeltaEdge[],
        limit: clampLimit(limit),
        offset: offset === undefined || !Number.isFinite(offset) ? 0 : Math.max(0, Math.floor(offset)),
      });
      return shapeResponse(surface as unknown as Record<string, unknown>, response_format, ['deltas']);
    },
  };
  return tools;
}
