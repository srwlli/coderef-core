/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability route-extractor
 * @exports RouteFact, FrontendCallFact, RouteExtractionResult, RouteExtractor
 * @used_by src/pipeline/orchestrator.ts
 */

/**
 * RouteExtractor - carry API route + frontend-call facts on the single pipeline pass
 *
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 - Phase 1 (REC-001)
 *
 * The detection capability this module surfaces has existed and been integration-tested
 * since WO-API-ROUTE-DETECTION-001 / WO-ROUTE-VALIDATION-ENHANCEMENT-001. What it lost
 * was a live PRODUCER: `saveIndex()`/`scanCodebase()` were the only callers, and neither
 * has a production call site since PipelineOrchestrator replaced the legacy scan path.
 * `.coderef/routes.json` went stale in March 2026 and `.coderef/frontend-calls.json`
 * stopped being written at all, which is why `validate-routes` exits 2 today.
 *
 * This extractor is deliberately THIN. It reimplements nothing:
 *   - server routes  -> `frameworkRegistry.detectAll(file, content)` (7 registered detectors)
 *   - client calls   -> the four Babel parsers in analyzer/frontend-call-parsers.ts
 * It is a pure projection over content the orchestrator has ALREADY read and it performs
 * no filesystem access of its own, so it adds no second file walk to the pipeline.
 *
 * The facts land on dedicated PipelineState fields rather than being stamped onto
 * `state.elements`. Synthesising carrier elements into the element inventory would
 * change index.json counts, graph node counts, and coverage/complexity denominators —
 * a trust-metric regression for a phase whose job is purely to reconnect a producer.
 * The routes generator materialises the carriers locally instead (see
 * pipeline/generators/routes-generator.ts).
 */

import { frameworkRegistry } from '../../scanner/framework-registry.js';
// MUST be imported for its registration side effect. frameworkRegistry ships EMPTY;
// register-frameworks.js is what puts the 7 detectors in it, and it self-invokes on
// module load. Without this import the registry resolves to zero detectors and
// detectAll() silently returns [] — a no-data answer indistinguishable from "this
// project exposes no routes". The legacy scanner got its registrations transitively
// (scanner.ts imports this module); the pipeline path has no such neighbour, so the
// dependency is declared explicitly here rather than inherited by accident.
import { registerDefaultFrameworks } from '../../scanner/register-frameworks.js';
import {
  parseFetchCalls,
  parseAxiosCalls,
  parseReactQueryCalls,
  parseCustomApiCalls,
} from '../../analyzer/frontend-call-parsers.js';
import type { RouteMetadata, FrontendCall } from '../../types/types.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';

/**
 * A detected server route, with the handler identity the detector reported.
 * `name`/`line` mirror what the legacy scanner recorded so routes.json is
 * shape-identical to the artifact the library path used to emit.
 */
export interface RouteFact {
  name: string;
  file: string;
  line: number;
  route: RouteMetadata;
}

/** A detected client-side API call. Shape is the parsers' own FrontendCall. */
export type FrontendCallFact = FrontendCall;

export interface RouteExtractionResult {
  routes: RouteFact[];
  frontendCalls: FrontendCallFact[];
}

/**
 * Test-origin exclusion. Mirrors graph-builder's TEST_ORIGIN_RE (which is
 * module-private) and mcp/shared.ts's identical TEST_FILE_RE.
 *
 * This is load-bearing, not hygiene. The stale artifact this phase deletes claimed
 * "34 express routes" in a repo that is a CLI library exposing zero HTTP endpoints.
 * Every one of them was a regex match on a route-shaped STRING LITERAL inside a test
 * fixture — e.g. __tests__/orphan-detection.test.ts:74 and
 * src/validator/report-generator.test.ts:331. The express detector matches
 * /(?:app|router)\.(get|post|put|delete|patch)\s*\(/ against raw content, so a test
 * that merely describes a route is indistinguishable from a file that serves one.
 * Without this gate the phantom-route class returns under a new producer.
 */
const TEST_ORIGIN_RE = /__tests__|__mocks__|\.test\.|\.spec\.|(^|\/)(?:fixtures|test-fixtures)\//;

function isTestOrigin(file: string): boolean {
  return TEST_ORIGIN_RE.test(file.split('\\').join('/'));
}

/**
 * Frontend-call detection is limited to browser-reachable source extensions,
 * matching frontend-scanner's isFrontendFile gate.
 *
 * KNOWN LIMITATION (RISK-008, documented rather than silently absorbed): this gate
 * also excludes SERVER-to-server HTTP calls. A backend module that fetches another
 * service's endpoint is invisible to the consumer side, which bounds what a
 * cross-boundary impact_of walk can honestly claim. Absence of a caller here is
 * no-data, never proof that none exists.
 */
const FRONTEND_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue'];

function isFrontendFile(file: string): boolean {
  const normalized = file.split('\\').join('/').toLowerCase();
  return FRONTEND_EXTENSIONS.some(ext => normalized.endsWith(ext));
}

/**
 * Blank out comment bodies while preserving byte offsets and line structure.
 *
 * WHY THIS IS LOAD-BEARING. The content-regex detectors (express, flask, fastapi)
 * match raw text, so they cannot tell a route DEFINITION from a comment DESCRIBING
 * one. Run against this repo, they reported 7 endpoints — every one of them from a
 * JSDoc `@example` or a `//` explanation inside the detectors' own source:
 *
 *   src/analyzer/route-parsers.ts:15   * Parse Flask route decorator: @app.route('/path', ...)
 *   src/analyzer/route-parsers.ts:81   * Parse Express route: app.get('/path', handler)
 *   src/scanner/scanner.ts:200         // Flask: @app.route('/path', methods=['GET'])
 *   src/scanner/tree-sitter-scanner.ts:484  * Example: @staticmethod, @property, @app.route('/api')
 *
 * That is the same phantom-route class as the 34 test-file matches this phase deleted,
 * relocated into production source where a test-origin filter cannot reach it. A route
 * mentioned in a comment is documentation, not an exposed endpoint.
 *
 * DELIBERATELY LINE-ORIENTED, not a lexer. A character-level scanner has to tell a
 * regex literal from a division operator to know whether a quote is real, and this very
 * file's neighbours are full of patterns like /(\w+)\.(get|post)\(['"]([^'"]+)['"]/ —
 * whose quote characters desync any naive string tracking, causing the /** blocks after
 * them to go unrecognised. A line rule cannot make that mistake: it only ever blanks
 * lines that are ENTIRELY comment, so it can never corrupt code.
 *
 * The trade-off is a trailing comment after real code (`app.get('/x'); // note`) is left
 * intact — which is correct anyway, since that line does define a route.
 *
 * One output line per input line, so line numbers stay aligned with the source and a
 * detector that reports a line number still reports the right one.
 */
function blankComments(content: string): string {
  const lines = content.split('\n');
  let inBlock = false;

  const blanked = lines.map(line => {
    const trimmed = line.trim();
    const wasInBlock = inBlock;

    if (inBlock) {
      // A line that closes the block is still comment content up to the marker;
      // blanking the whole line is safe because code sharing a line with `*/` is
      // vanishingly rare and would be a route definition we'd rather miss than fake.
      if (trimmed.includes('*/')) inBlock = false;
      return '';
    }

    // Opening a block comment that does not also close on the same line.
    if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
      inBlock = true;
      return '';
    }

    // Whole-line comments: JSDoc continuation (`*`), JS/TS line comment (`//`),
    // single-line block (`/* ... */`), and Python (`#`).
    if (
      trimmed.startsWith('*') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('#')
    ) {
      return '';
    }

    return wasInBlock ? '' : line;
  });

  // One output line per input line — line numbers stay byte-aligned with the source.
  return blanked.join('\n');
}

/**
 * RouteExtractor - stateless projection of route + frontend-call facts.
 *
 * Instantiated once by PipelineOrchestrator and invoked per file inside the existing
 * processFile() pass, so it sees content that has already been read for parsing.
 */
export class RouteExtractor {
  /**
   * Extract server routes and client API calls from one already-read file.
   *
   * @param filePath Absolute path to the source file
   * @param content  File content the orchestrator already read for tree-sitter
   * @returns Route + frontend-call facts (both arrays empty for a non-participating file)
   */
  constructor() {
    // Idempotent (register() is a Map.set keyed by detector name). Belt-and-braces
    // alongside the module-load side effect above: an explicit call means the registry
    // is populated even if a bundler tree-shakes a side-effect-only import away.
    registerDefaultFrameworks();
  }

  extract(filePath: string, content: string): RouteExtractionResult {
    const empty: RouteExtractionResult = { routes: [], frontendCalls: [] };

    // Detectors are fed POSIX-normalized paths, NOT the raw platform path.
    //
    // The file-based detectors match on literal forward-slash path segments —
    // nextjs-detector.ts:16 tests `file.includes('/app/api/')` and
    // /\/route\.(ts|js|tsx|jsx)$/, remix-detector.ts:16 tests `file.includes('/routes/')`.
    // The pipeline hands out native paths, so on Windows those checks could never match
    // and every file-based framework (Next.js App Router, Remix) silently detected
    // nothing. That is a FALSE EMPTY: no-data reported as "no routes". Normalizing here
    // makes the detectors' existing POSIX contract hold on every platform without
    // editing seven detectors (DR-002: reuse, do not reimplement).
    const posixPath = normalizeSlashes(filePath);

    // A test fixture that describes a route does not serve one.
    if (isTestOrigin(posixPath)) return empty;

    return {
      // Route detection sees comment-blanked content so documentation cannot
      // masquerade as an endpoint.
      routes: this.extractRoutes(posixPath, blankComments(content)),
      // Frontend-call detection sees the ORIGINAL content: those parsers work over a
      // Babel AST, which discards comments already, and blanking would gain nothing
      // while risking a parse error on some construct the blanker mishandles.
      frontendCalls: this.extractFrontendCalls(posixPath, content),
    };
  }

  /**
   * Server routes via the registered framework detectors. detectAll() returns at most
   * one result per detector (each detector reports its FIRST route definition for the
   * file), so a file matching two frameworks yields two facts — the legacy scanner
   * behaved identically.
   *
   * A detector throwing must not fail the file: route facts are additive enrichment,
   * never a reason to lose a file's elements/imports/calls.
   */
  private extractRoutes(filePath: string, content: string): RouteFact[] {
    let results;
    try {
      results = frameworkRegistry.detectAll(filePath, content);
    } catch {
      return [];
    }

    return results.map(result => ({
      name: result.elementName,
      file: filePath,
      // RouteMetadata carries no line number; the detectors report route identity,
      // not a source anchor. 0 is the legacy scanner's own placeholder here.
      line: 0,
      route: result.route,
    }));
  }

  /**
   * Client API calls via the four Babel parsers. They share a one-slot parse cache
   * keyed on content, so calling all four for the same file costs ONE Babel parse.
   * Each parser already swallows its own parse failures and returns [] — a malformed
   * or non-JS file degrades to no-data, never a throw.
   *
   * Confidence semantics are carried verbatim from the parsers: 100 for a static
   * string literal, 80 for a template literal collapsed to a {id} placeholder.
   */
  private extractFrontendCalls(filePath: string, content: string): FrontendCallFact[] {
    if (!isFrontendFile(filePath)) return [];

    try {
      return [
        ...parseFetchCalls(content, filePath),
        ...parseAxiosCalls(content, filePath),
        ...parseReactQueryCalls(content, filePath),
        ...parseCustomApiCalls(content, filePath),
      ];
    } catch {
      return [];
    }
  }
}

export default RouteExtractor;
