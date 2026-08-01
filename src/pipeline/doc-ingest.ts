/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability doc-ingestion
 * @exports DOC_ID_PREFIX, DocFact, DocIngestResult, docNodeId, docTargets, isDocNodeId, collectDocFacts, parseDocFrontmatter
 * @used_by src/pipeline/orchestrator.ts, src/pipeline/graph-builder.ts
 */

/**
 * doc-ingest — collect governing-documentation facts from the repo's own
 * documentation surfaces so they can become first-class graph nodes.
 *
 * WO-DOCS-TO-GRAPH-P1-DOCS-PHASE-OF-THE-001 (docs phase of the standards
 * rule-graph program; GX-005 standards overlay rides this machinery in P2).
 *
 * THREE SOURCE CLASSES, ONE NODE KIND (`@Doc/<repo-relative-path>`):
 *
 *   resource sheets   — coderef/resource-sheets/*.md. Frontmatter-keyed
 *                       (documents:, status:, subject:); the `documents:` key
 *                       is what produces a `documents` edge to the documented
 *                       file's `@File/...` node. The EDGE-BEARING class.
 *   foundation docs   — coderef/foundation-docs/*.md. Generated, repo-level.
 *                       Since WO-FOUNDATION-DOCS-GENERATOR-EMITTED-FRONTMATTER
 *                       the doc-gen generators stamp frontmatter with
 *                       mechanically-derived documents:/related_files: lists,
 *                       so these docs bear `documents` edges too. docStatus is
 *                       ALWAYS 'generated' (lane-decided — generated prose
 *                       never outranks reviewed sheets, DR-DOCS-E). A
 *                       frontmatter-less foundation doc (older generator
 *                       output) still mints a node with no edges: absence of
 *                       frontmatter is NO-DATA, never a parse error (G1).
 *   report candidates — any markdown below coderef/ whose frontmatter opts in
 *                       with `ingestion_candidate: true`. This lets living
 *                       genre reports and evaluation/planning reports join the
 *                       graph without hard-coding their project-specific
 *                       homes. Non-opted-in reports remain invisible.
 *
 * REPO-AGNOSTIC BY CONVENTION: both globs are relative to projectPath —
 * whatever repo is being scanned supplies its own sheets. No fleet layout,
 * no cross-repo paths.
 *
 * DELIBERATELY NOT A PER-FILE FACT: doc facts do NOT enter the incremental
 * byFile fact store. The doc surface is tiny (tens of small markdown files)
 * and repo-global, so BOTH pipeline paths (full run() and the incremental
 * assembleAndResolve()) re-collect it fresh each scan. That is what makes
 * incremental parity hold by construction — and it keeps these facts clear of
 * the incremental-store keying defect class entirely
 * (STUB-INDEXING-ORCHESTRATOR-PATH-NORMALIZATION-001).
 *
 * PURE-ENOUGH CONTRACT: filesystem reads only (readFileSync over a sorted,
 * deterministic file list); no clock, no randomness, no writes. Given the
 * same on-disk docs it always yields the same facts in the same order, which
 * is what keeps constructGraph deterministic (AC-08) once these facts enter
 * PipelineState.
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeSlashes } from '../utils/path-normalize.js';

/** Prefix of every doc node id. Mirrors `@File/` / `@Endpoint/`. */
export const DOC_ID_PREFIX = '@Doc/';

/** One governing-documentation artifact, ready for node/edge minting. */
export interface DocFact {
  /** `@Doc/<repo-relative-posix-path>` — full path, extension kept. */
  id: string;
  /** Filename stem (e.g. `parser-RESOURCE-SHEET`). */
  slug: string;
  /** Which source class produced this fact. */
  docType: 'resource-sheet' | 'foundation' | 'report';
  /** Repo-relative posix path of the markdown artifact itself. */
  sheetPath: string;
  /** Frontmatter `subject:` when present (human-friendly node name). */
  subject?: string;
  /**
   * Authoring status. Sheets: frontmatter `status:` (missing defaults to
   * 'draft' — discovery G4, legacy sheets predate the key). Foundation docs:
   * always 'generated'.
   */
  docStatus: string;
  /** Raw frontmatter `documents:` value (repo-relative path), when present. */
  documentsPath?: string;
  /**
   * List-form frontmatter `documents:` entries (repo-relative paths), when the
   * key is written as a YAML list. Generator-emitted foundation docs use this
   * shape (a HOTSPOTS doc documents many files); sheets/reports may too — the
   * scalar and list forms are unioned at edge-minting time (docTargets).
   */
  documentsPaths?: string[];
  /** Frontmatter `related_files:` list entries, when present. */
  relatedFiles: string[];
  /**
   * Count of body sections carrying the generation-placeholder marker.
   * Placeholder prose is NEVER authority — consumers rank these last and
   * flag them (retrieval contract DR-DOCS-E).
   */
  placeholderSections: number;
  /** Frontmatter `task:` provenance (stub/WO id), when present. */
  task?: string;
}

/** collectDocFacts output: facts plus counted skips (never silent drops). */
export interface DocIngestResult {
  docs: DocFact[];
  skipped: Array<{ path: string; reason: string }>;
}

/** Marker line author-sheet.mjs writes into a section that failed generation. */
const PLACEHOLDER_MARKER = 'This section is a placeholder pending regeneration';

/** Build the doc node id from a repo-relative posix path. */
export function docNodeId(relPosixPath: string): string {
  return `${DOC_ID_PREFIX}${relPosixPath.replace(/^\.\//, '')}`;
}

/**
 * All `documents:` claim targets for a fact — scalar and list forms unioned,
 * order-preserving, deduped. The single seam graph-builder mints edges from.
 */
export function docTargets(doc: Pick<DocFact, 'documentsPath' | 'documentsPaths'>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [doc.documentsPath, ...(doc.documentsPaths ?? [])]) {
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Is this graph node id a doc pseudo-node? */
export function isDocNodeId(id: string): boolean {
  return id.startsWith(DOC_ID_PREFIX);
}

/**
 * Minimal frontmatter reader for the sheet contract's flat `key: value` +
 * simple `key:\n  - item` list shapes. NOT a YAML parser by design: the sheet
 * kind standard owns the schema, and the only consumers here are five scalar
 * keys and one string list. Returns null when the text has no leading
 * `---` block.
 */
export function parseDocFrontmatter(
  text: string,
): { scalars: Record<string, string>; lists: Record<string, string[]> } | null {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const scalars: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  let openList: string | null = null;
  for (const rawLine of m[1].split(/\r?\n/)) {
    const listItem = rawLine.match(/^\s+-\s+(.+)$/);
    if (listItem && openList) {
      lists[openList].push(listItem[1].trim());
      continue;
    }
    const kv = rawLine.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2].trim();
    if (value.length === 0) {
      openList = key;
      lists[key] = lists[key] ?? [];
    } else {
      openList = null;
      scalars[key] = value;
    }
  }
  return { scalars, lists };
}

/** Sorted repo-relative posix paths of `*.md` directly under dir (no recurse). */
function listMarkdown(projectPath: string, relDir: string): string[] {
  const abs = path.join(projectPath, relDir);
  let entries: string[];
  try {
    entries = fs.readdirSync(abs);
  } catch {
    return []; // repo has no such surface — NO-DATA, not an error
  }
  return entries
    .filter(f => f.toLowerCase().endsWith('.md'))
    .map(f => normalizeSlashes(path.join(relDir, f)))
    .sort();
}

/**
 * Sorted markdown paths below a repo-relative directory. Used only for the
 * explicit `ingestion_candidate: true` lane: walking `coderef/` is safe here
 * because a file still has to opt in before it becomes a fact.
 */
function listMarkdownRecursive(projectPath: string, relDir: string): string[] {
  const found: string[] = [];
  const visit = (currentRel: string): void => {
    const abs = path.join(projectPath, currentRel);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const childRel = normalizeSlashes(path.join(currentRel, entry.name));
      if (entry.isDirectory()) {
        visit(childRel);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        found.push(childRel);
      }
    }
  };
  visit(relDir);
  return found.sort();
}

/**
 * Collect every doc fact for a project. Deterministic order: resource sheets
 * (sorted) then foundation docs (sorted).
 *
 * Skip policy (discovery G3/G4 — counted, never silent, never fatal):
 *   frontmatter_missing — a sheet with no `---` block (e.g. the legacy
 *                         SCRIPTS inventory sheet). It cannot claim what it
 *                         documents, so it mints nothing.
 *   unreadable          — fs error reading the file; scanning continues.
 */
export function collectDocFacts(projectPath: string): DocIngestResult {
  const docs: DocFact[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];

  const sheetPaths = listMarkdown(projectPath, path.join('coderef', 'resource-sheets'));
  const foundationPaths = listMarkdown(projectPath, path.join('coderef', 'foundation-docs'));
  const reservedPaths = new Set([...sheetPaths, ...foundationPaths]);

  for (const rel of sheetPaths) {
    let text: string;
    try {
      text = fs.readFileSync(path.join(projectPath, rel), 'utf8');
    } catch {
      skipped.push({ path: rel, reason: 'unreadable' });
      continue;
    }
    const fm = parseDocFrontmatter(text);
    if (!fm) {
      skipped.push({ path: rel, reason: 'frontmatter_missing' });
      continue;
    }
    const documentsRaw = fm.scalars['documents'];
    const documentsList = fm.lists['documents'];
    docs.push({
      id: docNodeId(rel),
      slug: path.basename(rel, '.md'),
      docType: 'resource-sheet',
      sheetPath: rel,
      subject: fm.scalars['subject'],
      // Missing status is a legacy-sheet condition, not an approval claim.
      docStatus: fm.scalars['status'] ?? 'draft',
      documentsPath: documentsRaw ? normalizeSlashes(documentsRaw).replace(/^\.\//, '') : undefined,
      // List-form documents: was previously parsed into fm.lists and then
      // silently ignored — a latent claim-drop. Now carried.
      documentsPaths: documentsList?.length
        ? documentsList.map(d => normalizeSlashes(d).replace(/^\.\//, ''))
        : undefined,
      relatedFiles: fm.lists['related_files'] ?? [],
      placeholderSections: text.split(PLACEHOLDER_MARKER).length - 1,
      task: fm.scalars['task'],
    });
  }

  for (const rel of foundationPaths) {
    let text: string;
    try {
      text = fs.readFileSync(path.join(projectPath, rel), 'utf8');
    } catch {
      skipped.push({ path: rel, reason: 'unreadable' });
      continue;
    }
    // Foundation docs are GENERATED artifacts. Since
    // WO-FOUNDATION-DOCS-GENERATOR-EMITTED-FRONTMATTER-001 the doc-gen
    // generators stamp frontmatter (status: generated + mechanically-derived
    // documents:/related_files:), so a foundation doc's documents: claims ARE
    // trusted and bear edges — the original DR-DOCS-D hold ("revisit when a
    // producer actually stamps them") is resolved: a producer now stamps them.
    // A frontmatter-less foundation doc (older generator output) still mints a
    // node with zero edges — absence of frontmatter is NO-DATA, never an error.
    // docStatus stays 'generated' REGARDLESS of any frontmatter status: value:
    // ranking (DR-DOCS-E) must never let generated prose outrank reviewed
    // sheets, so the lane, not the file, decides the status.
    const fm = parseDocFrontmatter(text);
    const documentsRaw = fm?.scalars['documents'];
    const documentsList = fm?.lists['documents'];
    docs.push({
      id: docNodeId(rel),
      slug: path.basename(rel, '.md'),
      docType: 'foundation',
      sheetPath: rel,
      subject: fm?.scalars['subject'],
      docStatus: 'generated',
      documentsPath: documentsRaw ? normalizeSlashes(documentsRaw).replace(/^\.\//, '') : undefined,
      documentsPaths: documentsList?.length
        ? documentsList.map(d => normalizeSlashes(d).replace(/^\.\//, ''))
        : undefined,
      relatedFiles: fm?.lists['related_files'] ?? [],
      placeholderSections: text.split(PLACEHOLDER_MARKER).length - 1,
      task: fm?.scalars['task'],
    });
  }

  // Explicit report-candidate lane. The recursive walk is discovery only;
  // `ingestion_candidate: true` is the opt-in authority. Reserved source
  // classes are excluded so adding the key to a sheet/foundation doc cannot
  // duplicate its @Doc node.
  for (const rel of listMarkdownRecursive(projectPath, 'coderef')) {
    if (reservedPaths.has(rel)) continue;
    let text: string;
    try {
      text = fs.readFileSync(path.join(projectPath, rel), 'utf8');
    } catch {
      continue;
    }
    const fm = parseDocFrontmatter(text);
    if (fm?.scalars['ingestion_candidate']?.toLowerCase() !== 'true') continue;
    const documentsRaw = fm.scalars['documents'];
    const documentsList = fm.lists['documents'];
    docs.push({
      id: docNodeId(rel),
      slug: path.basename(rel, '.md'),
      docType: 'report',
      sheetPath: rel,
      subject:
        fm.scalars['title'] ??
        fm.scalars['artifact_name'] ??
        fm.scalars['genre'],
      docStatus: fm.scalars['status'] ?? 'draft',
      documentsPath: documentsRaw
        ? normalizeSlashes(documentsRaw).replace(/^\.\//, '')
        : undefined,
      documentsPaths: documentsList?.length
        ? documentsList.map(d => normalizeSlashes(d).replace(/^\.\//, ''))
        : undefined,
      relatedFiles: fm.lists['related_files'] ?? [],
      placeholderSections: text.split(PLACEHOLDER_MARKER).length - 1,
      task: fm.scalars['task'] ?? fm.scalars['stub_ref'],
    });
  }

  return { docs, skipped };
}
