/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability doc-ingestion
 * @exports DOC_ID_PREFIX, DocFact, DocSectionFact, DocReferenceClaim, DocIngestResult, docNodeId, docTargets, isDocNodeId, collectDocFacts, parseDocFrontmatter, headingSlug, extractDocSections, normalizeMention, lexFencedIdentifiers, docReferenceClaims
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
  /**
   * Heading-delimited sections in document order
   * (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P1). Empty for a
   * heading-less doc — absence of headings is NO-DATA, never an error.
   */
  sections: DocSectionFact[];
}

/**
 * One heading-delimited section of a markdown doc
 * (WO-TREAT-MARKDOWN-FILES-LIKE-CODE-SECTION-LEVEL-AST-001 P1).
 *
 * Sections are ADDITIVE children of the whole-file `@Doc/...` node, which is
 * retained unchanged — every existing consumer of doc nodes keeps working, and
 * containment is a traversable `contains` edge rather than something a reader
 * has to infer from the id string.
 */
export interface DocSectionFact {
  /** `@Doc/<repo-relative-path>#<slug>` — the section node id (DL-1). */
  id: string;
  /** Owning document's node id (`@Doc/<repo-relative-path>`). */
  docId: string;
  /** Heading text verbatim, `#` markers and surrounding space stripped. */
  heading: string;
  /** Heading level, 1-6. */
  depth: number;
  /** Disambiguated GitHub-style slug (the `#...` half of `id`). */
  slug: string;
  /** 0-based position among this file's sections, document order. */
  order: number;
  /** 1-based line of the heading itself. */
  line: number;
  /** 1-based last line of this section's body (inclusive of the heading). */
  endLine: number;
  /**
   * Identifier-shaped inline backtick spans in this section (P2), deduped in
   * document order. These are CANDIDATES only — a token becomes an edge solely
   * when the symbol table backs it (DL-3). Fenced-block interiors are excluded
   * here; they are P3's separate lane.
   */
  mentions: string[];
  /**
   * Identifiers lexed from this section's fenced ts/js blocks (P3), deduped in
   * document order. QUARANTINED by DL-4: these never enter the global symbol
   * table — they are candidates for the same membership gate as `mentions`,
   * nothing more. Absent until P3 populates it.
   */
  codeIdentifiers?: string[];
}

/**
 * Normalize an inline backtick span to a candidate symbol name, or null when
 * it is not identifier-shaped.
 *
 * Backticks in prose wrap far more paths, flags, and kebab-slugs than symbols
 * (`--source-headers`, `coderef/foundation-docs`, `npm run build`), so this
 * pre-filter keeps the fact list honest before the symbol-table gate ever runs.
 * A trailing call suffix is dropped so `run()` and `run` are the same claim.
 *
 * v1 deliberately does NOT resolve member expressions (`ctx.run()`): the
 * receiver would have to be typed to know what it names, and guessing is the
 * failure mode DL-3 exists to prevent.
 */
export function normalizeMention(raw: string): string | null {
  const token = raw.trim().replace(/\(\s*\)$/, '');
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token) ? token : null;
}

/** collectDocFacts output: facts plus counted skips (never silent drops). */
export interface DocIngestResult {
  docs: DocFact[];
  skipped: Array<{ path: string; reason: string }>;
}

/**
 * GitHub-style heading slug: lowercase, punctuation dropped, whitespace runs
 * collapsed to single hyphens. Deliberately NOT reversible — it is an id
 * component, not a display string, and `heading` carries the original text.
 *
 * Normalizing away case and punctuation is what keeps a section id stable
 * across cosmetic heading edits; a genuine RENAME legitimately re-keys the
 * section (the same accepted trade-off codeRefId makes with line numbers).
 */
export function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    // Collapse hyphen runs and drop edge hyphens, so a dropped punctuation
    // mark ('Phase 3 — Proof') cannot leave a double separator and a
    // rule-shaped heading ('## ---') slugs to '' and takes the section-N
    // fallback rather than becoming the literal id '#---'.
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Opening/closing marker of a fenced code block (``` or ~~~, any indent). */
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)/;
const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;

/** Info-string languages whose fenced blocks P3 lexes. */
const LEXED_FENCE_LANGS = new Set(['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript']);

/**
 * Reserved words that are identifier-shaped in a call/`new` position but never
 * name a repo symbol. Filtering them keeps the candidate list meaningful; the
 * DL-3 gate would reject them anyway, so this is honesty, not correctness.
 */
const JS_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'instanceof',
  'await', 'new', 'delete', 'void', 'function', 'class', 'const', 'let', 'var',
  'import', 'export', 'from', 'as', 'default', 'this', 'super', 'yield', 'in',
  'of', 'do', 'else', 'try', 'finally', 'throw', 'case', 'break', 'continue',
]);

/**
 * Lex the identifiers a fenced ts/js example REFERENCES — imported names, call
 * callees, and `new` targets — in document order, deduped.
 *
 * DL-4 QUARANTINE, and it is the whole point of this function's shape: these
 * names NEVER enter the global symbol table and never reach the scanner. A doc
 * example calling `run()` must not mint a call edge into real code, must not
 * move the resolution-rate denominator, and must not come within reach of
 * rename_apply. What comes out of here is a list of CANDIDATES for the same
 * membership gate prose mentions go through — nothing else.
 *
 * Deliberately a lexer, not a parser: string and comment bodies are blanked so
 * a name mentioned in a string literal is not read as a reference, and member
 * callees (`ctx.run()`) are skipped because the receiver would have to be
 * typed to know what `run` names.
 */
export function lexFencedIdentifiers(code: string): string[] {
  const scrubbed = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');

  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string): void => {
    const token = raw.trim();
    if (!token || JS_KEYWORDS.has(token) || seen.has(token)) return;
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token)) return;
    seen.add(token);
    out.push(token);
  };

  // Named import bindings: `import { a, b as c } from '...'` -> a, b.
  for (const m of scrubbed.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) add(part.split(/\s+as\s+/)[0]);
  }
  // Default / namespace imports: `import Foo from '...'`, `import * as Foo`.
  for (const m of scrubbed.matchAll(/import\s+(?:type\s+)?(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s+from/g)) {
    add(m[1]);
  }
  // Call and construction sites, skipping member callees (preceded by `.`).
  for (const m of scrubbed.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) add(m[2]);
  for (const m of scrubbed.matchAll(/\bnew\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);

  return out;
}

/**
 * Parse a markdown body into its heading-delimited sections, in document
 * order. Deterministic given identical bytes (AC-08 / DL-7): no clock, no
 * randomness, single forward pass.
 *
 * TWO things are deliberately NOT headings:
 *   - anything inside a fenced code block — a shell example's `# comment` is a
 *     comment, not a section, and treating it as one would mint phantom nodes
 *     in every doc that shows a terminal transcript;
 *   - anything inside the leading frontmatter block — that surface is already
 *     parsed by parseDocFrontmatter and is metadata, not prose.
 *
 * Duplicate slugs within one file disambiguate `-2`, `-3`, … in document
 * order, so two `## Usage` headings stay addressable as distinct nodes. A
 * heading that slugs to the empty string (e.g. `## ---`) falls back to
 * `section-<n>` rather than colliding on ''.
 */
export function extractDocSections(docId: string, text: string): DocSectionFact[] {
  const lines = text.split(/\r?\n/);

  // Skip the leading frontmatter block, when present, by line index.
  let start = 0;
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        start = i + 1;
        break;
      }
    }
  }

  const sections: DocSectionFact[] = [];
  const slugCounts = new Map<string, number>();
  const seenMentions = new Map<number, Set<string>>();
  let fence: string | null = null;

  /** Collect identifier-shaped backtick spans on a line into its section. */
  const harvest = (line: string): void => {
    const current = sections[sections.length - 1];
    if (!current) return; // prose before the first heading belongs to no section
    let m: RegExpExecArray | null;
    const re = /`([^`\n]+)`/g;
    while ((m = re.exec(line)) !== null) {
      const token = normalizeMention(m[1]);
      if (token === null) continue;
      let seen = seenMentions.get(current.order);
      if (!seen) {
        seen = new Set<string>();
        seenMentions.set(current.order, seen);
      }
      if (seen.has(token)) continue;
      seen.add(token);
      current.mentions.push(token);
    }
  };

  let fenceLang = '';
  let fenceBody: string[] = [];
  /** Attribute a closed ts/js fence's identifiers to its enclosing section. */
  const flushFence = (): void => {
    const current = sections[sections.length - 1];
    if (current && LEXED_FENCE_LANGS.has(fenceLang) && fenceBody.length > 0) {
      const found = lexFencedIdentifiers(fenceBody.join('\n'));
      if (found.length > 0) {
        const bucket = current.codeIdentifiers ?? (current.codeIdentifiers = []);
        for (const token of found) if (!bucket.includes(token)) bucket.push(token);
      }
    }
    fenceLang = '';
    fenceBody = [];
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      // A fence closes only on its OWN marker char; ``` inside a ~~~ block is
      // literal content, not a close.
      if (fence === null) {
        fence = marker;
        fenceLang = fenceMatch[2].toLowerCase();
        fenceBody = [];
      } else if (fence === marker) {
        fence = null;
        flushFence();
      }
      continue;
    }
    if (fence !== null) {
      fenceBody.push(line);
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (!headingMatch) {
      harvest(line);
      continue;
    }

    const heading = headingMatch[2].trim();
    const base = headingSlug(heading) || `section-${sections.length + 1}`;
    const seen = slugCounts.get(base) ?? 0;
    slugCounts.set(base, seen + 1);
    const slug = seen === 0 ? base : `${base}-${seen + 1}`;

    if (sections.length > 0) sections[sections.length - 1].endLine = i;
    sections.push({
      id: `${docId}#${slug}`,
      docId,
      heading,
      depth: headingMatch[1].length,
      slug,
      order: sections.length,
      line: i + 1,
      endLine: lines.length,
      mentions: [],
    });
    // A heading may itself name a symbol ("## The `run()` contract").
    harvest(line);
  }

  return sections;
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

/** One doc-to-code claim a section makes, tagged with the lane it came from. */
export interface DocReferenceClaim {
  token: string;
  origin: 'prose' | 'code-block';
}

/**
 * Every symbol claim a section makes, prose lane first, deduped across lanes.
 *
 * The single seam graph-builder feeds through the DL-3 membership gate — one
 * place decides what counts as a claim, so the prose and fenced-code lanes
 * cannot drift apart in what they are allowed to assert. A token named in BOTH
 * lanes is ONE claim, attributed to prose: a sentence naming a symbol is the
 * stronger signal, and two edges for one mention would double-count it.
 */
export function docReferenceClaims(section: DocSectionFact): DocReferenceClaim[] {
  const out: DocReferenceClaim[] = [];
  const seen = new Set<string>();
  for (const token of section.mentions) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push({ token, origin: 'prose' });
  }
  for (const token of section.codeIdentifiers ?? []) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push({ token, origin: 'code-block' });
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
      sections: extractDocSections(docNodeId(rel), text),
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
      sections: extractDocSections(docNodeId(rel), text),
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
      // TKT-QQ8QDE: this lane used to `continue` WITHOUT recording the skip, while the
      // resource-sheet and foundation lanes both push `unreadable`. The DocIngestResult
      // docblock promises "unreadable — fs error reading the file; scanning continues",
      // so an unreadable report candidate vanished with no record anywhere. Silent.
      skipped.push({ path: rel, reason: 'unreadable' });
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
      sections: extractDocSections(docNodeId(rel), text),
    });
  }

  return { docs, skipped };
}
