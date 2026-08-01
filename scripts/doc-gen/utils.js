/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability doc-gen-utils
 */

/**
 * Shared utilities for .coderef doc generation scripts
 * Workorder: WO-FOUNDATION-DOCS-001
 */

const fs = require('fs');
const path = require('path');

// Legacy: pinned to the coderef-core repo root (parents of scripts/doc-gen/).
// New callers should resolve paths via resolveProjectRoot(argv) instead.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CODREF_DIR = path.join(PROJECT_ROOT, '.coderef');
const FOUNDATION_DOCS_DIR = path.join(PROJECT_ROOT, 'coderef', 'foundation-docs');

/**
 * Resolve the effective project root from CLI argv.
 * Precedence: --project-dir <path> | --project-dir=<path>  →  process.cwd()  →  legacy PROJECT_ROOT.
 * @param {string[]} [argv] - argv slice to inspect (default: process.argv)
 * @returns {string} absolute project root
 */
function resolveProjectRoot(argv) {
  const args = argv || process.argv;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--project-dir' && i + 1 < args.length) {
      return path.resolve(args[i + 1]);
    }
    if (a.startsWith('--project-dir=')) {
      return path.resolve(a.slice('--project-dir='.length));
    }
  }
  return process.cwd();
}

/**
 * Build the .coderef dir under a given project root.
 */
function coderefDir(projectRoot) {
  return path.join(projectRoot, '.coderef');
}

/**
 * Build the foundation-docs dir under a given project root.
 */
function foundationDocsDir(projectRoot) {
  return path.join(projectRoot, 'coderef', 'foundation-docs');
}

/**
 * Read and parse a .coderef JSON file.
 * @param {string} filename - Name of the JSON file (e.g., 'index.json')
 * @param {string} [projectRoot] - Optional project root; defaults to legacy PROJECT_ROOT for back-compat.
 * @returns {Object|null} Parsed JSON or null if error
 */
function readCoderefFile(filename, projectRoot) {
  const dir = projectRoot ? coderefDir(projectRoot) : CODREF_DIR;
  const filepath = path.join(dir, filename);
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Ensure foundation docs directory exists (under the given project root).
 * @param {string} [projectRoot]
 */
function ensureFoundationDocsDir(projectRoot) {
  const dir = projectRoot ? foundationDocsDir(projectRoot) : FOUNDATION_DOCS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write a markdown file to foundation docs.
 * @param {string} filename - Name of the .md file
 * @param {string} content - Markdown content
 * @param {string} [projectRoot]
 */
function writeFoundationDoc(filename, content, projectRoot) {
  ensureFoundationDocsDir(projectRoot);
  const dir = projectRoot ? foundationDocsDir(projectRoot) : FOUNDATION_DOCS_DIR;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✓ Generated ${filename} (root: ${projectRoot || PROJECT_ROOT})`);
}

/**
 * Build the YAML frontmatter block for a generated foundation doc.
 *
 * Contract (WO-FOUNDATION-DOCS-GENERATOR-EMITTED-FRONTMATTER-001):
 * - `status: generated` always — generated prose never outranks approved/draft
 *   resource sheets in retrieval (doc-ingest DR-DOCS-E), but a `documents:`
 *   list lets the doc bear graph edges to the files it actually analyzes.
 * - Deterministic: lists are emitted in the order given (callers sort), and
 *   NO timestamps live inside the block — regen with unchanged inputs must be
 *   byte-identical so frontmatter never generates diff noise.
 * - Paths must be repo-relative posix; normalized here as a backstop.
 *
 * @param {Object} opts
 * @param {string} opts.subject - Human-friendly doc subject
 * @param {string} opts.generator - Repo-relative generator script path
 * @param {string[]} [opts.documents] - Files this doc documents (edge-bearing)
 * @param {string} [opts.documentsTruncated] - Disclosure line when the
 *   documents list is capped (e.g. "20 of 35 analyzed files listed")
 * @param {string[]} [opts.relatedFiles] - Non-edge-bearing related files
 * @returns {string} Frontmatter block ending with a blank line
 */
function foundationFrontmatter({ subject, generator, documents, documentsTruncated, relatedFiles }) {
  const posix = p => String(p).replace(/\\/g, '/').replace(/^\.\//, '');
  const lines = ['---'];
  lines.push(`subject: ${subject}`);
  lines.push('status: generated');
  lines.push(`generator: ${posix(generator)}`);
  if (documents && documents.length > 0) {
    lines.push('documents:');
    documents.forEach(d => lines.push(`  - ${posix(d)}`));
  }
  if (documentsTruncated) {
    lines.push(`documents_truncated: ${documentsTruncated}`);
  }
  if (relatedFiles && relatedFiles.length > 0) {
    lines.push('related_files:');
    relatedFiles.forEach(f => lines.push(`  - ${posix(f)}`));
  }
  lines.push('---');
  return lines.join('\n') + '\n\n';
}

/**
 * Idempotently upsert a frontmatter block onto in-place-enhanced docs.
 * The generator owns the ENTIRE leading `---` block on foundation docs: if one
 * exists it is replaced wholesale, else the block is prepended. Re-running
 * with unchanged inputs is byte-stable (lane-2 REC-005 discipline).
 * @param {string} content - Current doc content
 * @param {string} fmBlock - Block from foundationFrontmatter()
 * @returns {string} Content with exactly one canonical frontmatter block
 */
function upsertFrontmatter(content, fmBlock) {
  const existing = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n(\r?\n)?/);
  if (existing) {
    return fmBlock + content.slice(existing[0].length);
  }
  return fmBlock + content;
}

/**
 * Format a date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toISOString().split('T')[0];
}

/**
 * Create UUID anchor comment for markdown
 * @param {string} uuid - Element UUID
 * @returns {string} HTML comment
 */
function uuidAnchor(uuid) {
  return `<!-- coderef:uuid=${uuid} -->`;
}

/**
 * Get complexity badge for a score
 * @param {number} score - Complexity score
 * @returns {string} Markdown badge
 */
function complexityBadge(score) {
  if (score >= 50) return `🔴 ${score} (Critical)`;
  if (score >= 30) return `🟡 ${score} (High)`;
  if (score >= 15) return `🟢 ${score} (Moderate)`;
  return `⚪ ${score} (Low)`;
}

/**
 * Count elements by file extension
 * @param {Array} elements - Array of elements from index.json
 * @returns {Object} Counts by extension
 */
function countByExtension(elements) {
  const counts = {};
  elements.forEach(el => {
    const ext = el.file.split('.').pop();
    counts[ext] = (counts[ext] || 0) + 1;
  });
  return counts;
}

/**
 * Group elements by type
 * @param {Array} elements - Array of elements
 * @returns {Object} Elements grouped by type
 */
function groupByType(elements) {
  const groups = {};
  elements.forEach(el => {
    if (!groups[el.type]) groups[el.type] = [];
    groups[el.type].push(el);
  });
  return groups;
}

/**
 * Get top files by element count
 * @param {Array} elements - Array of elements
 * @param {number} limit - Number of files to return
 * @returns {Array} Top files with counts
 */
function getTopFilesByDensity(elements, limit = 20) {
  const fileCounts = {};
  elements.forEach(el => {
    fileCounts[el.file] = (fileCounts[el.file] || 0) + 1;
  });
  return Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([file, count]) => ({ file, count }));
}

/**
 * Escape special markdown characters
 * @param {string} text - Raw text
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[|\\\[\]{}()`*#]/g, '\\$&');
}

module.exports = {
  PROJECT_ROOT,
  CODREF_DIR,
  FOUNDATION_DOCS_DIR,
  resolveProjectRoot,
  coderefDir,
  foundationDocsDir,
  readCoderefFile,
  ensureFoundationDocsDir,
  writeFoundationDoc,
  foundationFrontmatter,
  upsertFrontmatter,
  formatDate,
  uuidAnchor,
  complexityBadge,
  countByExtension,
  groupByType,
  getTopFilesByDensity,
  escapeMarkdown
};
