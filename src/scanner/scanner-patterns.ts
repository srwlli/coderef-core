/**
 * Scanner Patterns — extracted from scanner.ts (P1-001)
 *
 * Owns the language-pattern registry and the priority-based pattern sort.
 * Pure module: no I/O, no scanning, no side effects beyond exporting the
 * mutable LANGUAGE_PATTERNS record (kept mutable for now so ScannerRegistry
 * and the current scanCurrentElements() callsite still work; P6 eliminates
 * the mutation).
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import { ElementData, RouteMetadata } from '../types/types.js';
import {
  parseExpressRoute,
  parseFlaskRoute,
  parseFastAPIRoute,
} from '../analyzer/route-parsers.js';
import {
  parseFetchCalls,
  parseAxiosCalls,
  parseReactQueryCalls,
  parseCustomApiCalls,
} from '../analyzer/frontend-call-parsers.js';

export interface PatternConfig {
  type: ElementData['type'];
  pattern: RegExp;
  nameGroup: number;
  extractMetadata?: (
    match: RegExpExecArray,
    content: string,
    line: number,
    file: string,
    fileContent: string
  ) => RouteMetadata | null;
  extractFrontendCall?: (
    match: RegExpExecArray,
    content: string,
    line: number,
    file: string,
    fileContent: string
  ) => import('../analyzer/frontend-call-parsers.js').FrontendCall | null;
}

const BASE_JS_PATTERNS: PatternConfig[] = [
  { type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
  { type: 'function', pattern: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g, nameGroup: 1 },
  { type: 'class', pattern: /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
  { type: 'constant', pattern: /(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Z0-9_]*)\s*=/g, nameGroup: 1 },
  { type: 'component', pattern: /(?:export\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_$]*)\s*(?:=|\()/g, nameGroup: 1 },
  { type: 'hook', pattern: /(?:export\s+)?(?:function|const)\s+(use[A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
  { type: 'method', pattern: /(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, nameGroup: 1 },
  {
    type: 'function',
    pattern: /(\w+)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
    nameGroup: 1,
    extractMetadata: (_match, content, line, _file, fileContent) => parseExpressRoute(content, line, fileContent),
  },
  {
    type: 'function',
    pattern: /fetch\s*\(/g,
    nameGroup: 0,
    extractFrontendCall: (_match, _content, line, file, fileContent) => {
      const calls = parseFetchCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    },
  },
  {
    type: 'function',
    pattern: /axios\.(get|post|put|delete|patch)\s*\(/g,
    nameGroup: 1,
    extractFrontendCall: (_match, _content, line, file, fileContent) => {
      const calls = parseAxiosCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    },
  },
  {
    type: 'hook',
    pattern: /(useQuery|useMutation)\s*\(/g,
    nameGroup: 1,
    extractFrontendCall: (_match, _content, line, file, fileContent) => {
      const calls = parseReactQueryCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    },
  },
  {
    type: 'function',
    pattern: /(api|apiClient|client|httpClient)\.(get|post|put|delete|patch)\s*\(/g,
    nameGroup: 1,
    extractFrontendCall: (_match, _content, line, file, fileContent) => {
      const calls = parseCustomApiCalls(fileContent, file);
      return calls.find(c => c.line === line) || null;
    },
  },
];

export const LANGUAGE_PATTERNS: Record<string, Array<PatternConfig>> = {
  ts: BASE_JS_PATTERNS,
  js: BASE_JS_PATTERNS,
  tsx: BASE_JS_PATTERNS,
  jsx: BASE_JS_PATTERNS,
  svelte: [
    { type: 'component', pattern: /export\s+(?:default\s+)?(?:function|const|let|var)?\s*([A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
    { type: 'function', pattern: /\$:\s*(\w+)\s*=/g, nameGroup: 1 },
    { type: 'function', pattern: /onMount\s*\(|beforeUpdate\s*\(|afterUpdate\s*\(|onDestroy\s*\(/g, nameGroup: 0 },
    { type: 'function', pattern: /\$:\s*\{[^}]*\}/g, nameGroup: 0 },
    { type: 'function', pattern: /\$([a-zA-Z_][a-zA-Z0-9_$]*)\s*[:=]/g, nameGroup: 1 },
    { type: 'function', pattern: /export\s+let\s+([a-zA-Z_][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
    { type: 'function', pattern: /function\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[^}]*(?:update|destroy)/g, nameGroup: 1 },
    { type: 'function', pattern: /(?:transition|in|out):\s*([a-zA-Z_][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
  ],
  vue: [
    { type: 'function', pattern: /setup\s*\([^)]*\)\s*\{/g, nameGroup: 0 },
    { type: 'hook', pattern: /(?:const|let|var)\s+(use[A-Z][a-zA-Z0-9_$]*)\s*=/g, nameGroup: 1 },
    { type: 'function', pattern: /(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*=\s*(?:ref|reactive|computed)\s*\(/g, nameGroup: 1 },
    { type: 'method', pattern: /(?:methods|computed):\s*\{[^}]*(?:[a-zA-Z_][a-zA-Z0-9_$]*):/g, nameGroup: 0 },
    { type: 'hook', pattern: /(onMounted|onUpdated|onUnmounted|onBeforeMount|onBeforeUpdate|onErrorCaptured|onRenderTracked|onRenderTriggered)\s*\(/g, nameGroup: 1 },
    { type: 'component', pattern: /import\s+([A-Z][a-zA-Z0-9_$]*)\s+from\s+['"][^'"]*\.vue['"]/g, nameGroup: 1 },
    { type: 'function', pattern: /(defineProps|defineEmits|defineExpose|defineOptions|defineSlots)\s*\(/g, nameGroup: 1 },
    { type: 'function', pattern: /(provide|inject)\s*\(/g, nameGroup: 1 },
    { type: 'function', pattern: /(watch|watchEffect)\s*\(/g, nameGroup: 1 },
  ],
  py: [
    { type: 'function', pattern: /def\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    { type: 'function', pattern: /async\s+def\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    { type: 'class', pattern: /class\s+([a-zA-Z0-9_]+)\s*(?:\(|:)/g, nameGroup: 1 },
    { type: 'method', pattern: /\s+def\s+([a-zA-Z0-9_]+)\s*\(self/g, nameGroup: 1 },
    { type: 'method', pattern: /@classmethod\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'method', pattern: /@staticmethod\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'method', pattern: /@property\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'function', pattern: /@([a-zA-Z0-9_]+)(?:\(|$)/gm, nameGroup: 1 },
    { type: 'function', pattern: /def\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*->\s*[a-zA-Z0-9_\[\]]+:/g, nameGroup: 1 },
    { type: 'method', pattern: /async\s+def\s+__(aenter|aexit)__/g, nameGroup: 1 },
    {
      type: 'function',
      pattern: /@(\w+)\.route\(/g,
      nameGroup: 1,
      extractMetadata: (_match, content, line) => parseFlaskRoute(content, line),
    },
    {
      type: 'function',
      pattern: /@app\.(get|post|put|delete|patch)\(/g,
      nameGroup: 1,
      extractMetadata: (_match, content, line) => parseFastAPIRoute(content, line),
    },
  ],
  go: [
    { type: 'function', pattern: /func\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    { type: 'method', pattern: /func\s+\([^)]+\)\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    { type: 'class', pattern: /type\s+([a-zA-Z0-9_]+)\s+struct\s*{/g, nameGroup: 1 },
    { type: 'class', pattern: /type\s+([a-zA-Z0-9_]+)\s+interface\s*{/g, nameGroup: 1 },
    { type: 'constant', pattern: /const\s+([A-Z][a-zA-Z0-9_]*)\s*=/g, nameGroup: 1 },
  ],
  rs: [
    { type: 'function', pattern: /(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(/g, nameGroup: 1 },
    { type: 'class', pattern: /(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'class', pattern: /(?:pub\s+)?enum\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'class', pattern: /(?:pub\s+)?trait\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'method', pattern: /impl\s+(?:[a-zA-Z0-9_]+\s+for\s+)?([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'constant', pattern: /const\s+([A-Z][A-Z0-9_]*)\s*:/g, nameGroup: 1 },
  ],
  java: [
    { type: 'class', pattern: /(?:public\s+|private\s+|protected\s+)?class\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'class', pattern: /(?:public\s+)?interface\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'class', pattern: /(?:public\s+)?enum\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 },
    { type: 'method', pattern: /(?:public|private|protected)\s+(?:static\s+)?(?:\w+)\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
    { type: 'constant', pattern: /(?:public\s+)?static\s+final\s+\w+\s+([A-Z][A-Z0-9_]*)\s*=/g, nameGroup: 1 },
  ],
  cpp: [
    { type: 'class', pattern: /class\s+([a-zA-Z0-9_]+)\s*(?:[:{]|$)/g, nameGroup: 1 },
    { type: 'class', pattern: /struct\s+([a-zA-Z0-9_]+)\s*(?:[:{]|$)/g, nameGroup: 1 },
    { type: 'function', pattern: /(?:^|\s)(?:inline\s+|static\s+|virtual\s+)*\w+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const\s*)?[{;]/g, nameGroup: 1 },
    { type: 'method', pattern: /^\s+(?:virtual\s+|static\s+|inline\s+)*\w+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)/gm, nameGroup: 1 },
    { type: 'constant', pattern: /#define\s+([A-Z][A-Z0-9_]*)/g, nameGroup: 1 },
    { type: 'constant', pattern: /const\s+\w+\s+([A-Z][A-Z0-9_]*)\s*=/g, nameGroup: 1 },
  ],
  c: [
    { type: 'class', pattern: /struct\s+([a-zA-Z0-9_]+)\s*(?:[{]|$)/g, nameGroup: 1 },
    { type: 'function', pattern: /(?:^|\s)(?:static\s+|inline\s+)*\w+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*[{;]/g, nameGroup: 1 },
    { type: 'constant', pattern: /#define\s+([A-Z][A-Z0-9_]*)/g, nameGroup: 1 },
  ],
};

export const DEFAULT_SUPPORTED_LANGS = ['ts', 'js', 'tsx', 'jsx', 'svelte', 'vue', 'py', 'go', 'rs', 'java', 'cpp', 'c'];

export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/__pycache__/**',
  '**/.git/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/archived/**',
  '**/tmp/**',
  '**/temp/**',
  '**/backup/**',
] as const;

/**
 * Type priority for deduplication (higher = more specific).
 */
export const TYPE_PRIORITY: Record<ElementData['type'], number> = {
  decorator: 8,
  interface: 7,
  type: 7,
  constant: 6,
  property: 5,
  component: 5,
  hook: 4,
  class: 3,
  function: 2,
  method: 1,
  unknown: 0,
};

/**
 * Sort patterns so the highest TYPE_PRIORITY runs first.
 */
export function sortPatternsByPriority(
  patterns: Array<{ type: ElementData['type']; pattern: RegExp; nameGroup: number }>
): Array<{ type: ElementData['type']; pattern: RegExp; nameGroup: number }> {
  return [...patterns].sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] || 0;
    const pb = TYPE_PRIORITY[b.type] || 0;
    return pb - pa;
  });
}
