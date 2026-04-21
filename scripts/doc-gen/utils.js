/**
 * Shared utilities for .coderef doc generation scripts
 * Workorder: WO-FOUNDATION-DOCS-001
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CODREF_DIR = path.join(PROJECT_ROOT, '.coderef');
const FOUNDATION_DOCS_DIR = path.join(PROJECT_ROOT, 'coderef', 'foundation-docs');

/**
 * Read and parse a .coderef JSON file
 * @param {string} filename - Name of the JSON file (e.g., 'index.json')
 * @returns {Object|null} Parsed JSON or null if error
 */
function readCoderefFile(filename) {
  const filepath = path.join(CODREF_DIR, filename);
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Ensure foundation docs directory exists
 */
function ensureFoundationDocsDir() {
  if (!fs.existsSync(FOUNDATION_DOCS_DIR)) {
    fs.mkdirSync(FOUNDATION_DOCS_DIR, { recursive: true });
  }
}

/**
 * Write a markdown file to foundation docs
 * @param {string} filename - Name of the .md file
 * @param {string} content - Markdown content
 */
function writeFoundationDoc(filename, content) {
  ensureFoundationDocsDir();
  const filepath = path.join(FOUNDATION_DOCS_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✓ Generated ${filename}`);
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
  readCoderefFile,
  ensureFoundationDocsDir,
  writeFoundationDoc,
  formatDate,
  uuidAnchor,
  complexityBadge,
  countByExtension,
  groupByType,
  getTopFilesByDensity,
  escapeMarkdown
};
