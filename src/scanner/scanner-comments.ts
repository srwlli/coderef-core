/**
 * Scanner Comments — extracted from scanner.ts (P1-003)
 *
 * Context-aware comment detection helpers. Pure: no I/O, no state.
 * Behavior preserved verbatim from the original scanner.ts — the
 * refactor only moves the code.
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

export function isLineCommented(
  line: string,
  lineIndex?: number,
  allLines?: string[]
): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;

  if (lineIndex !== undefined && allLines !== undefined) {
    if (isInsideTemplateString(lineIndex, allLines)) {
      return false;
    }
  }

  if (trimmed.startsWith('//')) {
    return true;
  }

  if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
    if (lineIndex !== undefined && allLines !== undefined) {
      return isInsideMultiLineComment(lineIndex, allLines);
    }
    return true;
  }

  if (containsCodeContext(trimmed)) {
    return false;
  }

  return false;
}

export function isInsideMultiLineComment(lineIndex: number, allLines: string[]): boolean {
  let inComment = false;

  for (let i = 0; i <= lineIndex; i++) {
    const line = allLines[i];

    if (line.includes('/*')) {
      inComment = true;
    }

    if (inComment && line.includes('*/')) {
      const startIdx = line.indexOf('/*');
      const endIdx = line.indexOf('*/');

      if (i === lineIndex) {
        const trimmed = line.trim();
        if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
          return true;
        }
      }

      if (i < lineIndex || (i === lineIndex && endIdx < startIdx)) {
        inComment = false;
      }
    }
  }

  return inComment;
}

export function isInsideTemplateString(lineIndex: number, allLines: string[]): boolean {
  let inTemplate = false;
  let templateChar = '';

  for (let i = 0; i <= lineIndex; i++) {
    const line = allLines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j - 1] : '';

      if (char === '`' && prevChar !== '\\') {
        if (!inTemplate) {
          inTemplate = true;
          templateChar = '`';
        } else if (templateChar === '`') {
          inTemplate = false;
          templateChar = '';
        }
      }
    }
  }

  return inTemplate;
}

export function containsCodeContext(trimmed: string): boolean {
  if (trimmed.includes('`') || trimmed.includes('${')) {
    return true;
  }

  const regexPattern = /\/[^\/\n]+\/[gimsuvy]*/;
  if (regexPattern.test(trimmed)) {
    const beforeSlash = trimmed.substring(0, trimmed.indexOf('/'));
    if (
      beforeSlash.trim().length === 0 ||
      /[=(\[{:,]$/.test(beforeSlash.trim()) ||
      /^(const|let|var|return|if|while)\s/.test(trimmed)
    ) {
      return true;
    }
  }

  return false;
}

export function isEntirelyCommented(content: string): boolean {
  if (content.includes('declare module') || content.includes('declare namespace')) {
    return true;
  }

  const nonEmptyLines = content.split('\n').filter(line => line.trim().length > 0);
  const commentedLines = nonEmptyLines.filter(line => isLineCommented(line));

  return commentedLines.length > nonEmptyLines.length * 0.9;
}
