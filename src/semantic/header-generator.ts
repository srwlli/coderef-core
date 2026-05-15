/**
 * @coderef-semantic: 1.0.0
 * @exports SemanticHeader, HeaderGenerationOptions, HeaderGenerator, generateHeaders
 * @used_by src/cli/populate.ts, src/semantic/orchestrator.ts
 */



`);
      return comments;
    }

    for (const header of headers) {
      const value = header.content.join(', ').replace(/^\[|\]$/g, '');
      comments.push(`// @coderef-semantic: 1.0.0 @${header.type} ${value}`);
    }

    return comments;
  }

  /**
   * Insert headers into source file at appropriate location
   */
  async insertHeaders(filePath: string, headers: SemanticHeader[]): Promise<void> {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');

      // Skip if file already has semantic headers (unless overwrite enabled)
      if (this.options.preserveExisting && this.hasSemanticHeader(content)) {
        console.warn(`[header-generator] ${filePath} already has semantic headers, skipping`);
        return;
      }

      // When overwriting, remove all existing semantic header blocks first
      if (!this.options.preserveExisting && this.hasSemanticHeader(content)) {
        content = this.removeExistingHeaders(content);
      }

      const comments = this.formatAsComments(headers);
      const headerBlock = comments.join('\n');

      // Insert at file start so the parser's /^\s*\/\*\*/ anchor finds it first.
      // Only skip a shebang line — everything else (existing JSDoc, license
      // headers) stays below the semantic block.
      let insertPoint = 0;
      if (content.startsWith('#!/')) {
        insertPoint = content.indexOf('\n') + 1;
      }

      const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
      const prefix = content.slice(0, insertPoint);
      const suffix = content.slice(insertPoint);
      const newContent = prefix + headerBlock.replace(/\n/g, lineEnding) + lineEnding + lineEnding + suffix;
      fs.writeFileSync(filePath, newContent, 'utf-8');
    } catch (error) {
      console.error(`Error inserting headers into ${filePath}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Derive structural rules from exports and imports
   */
  private deriveRules(exports: ExportInfo[], imports: ImportInfo[]): string[] {
    const rules: string[] = [];

    // Rule 1: Public API consistency
    if (exports.length > 0 && imports.length > 0) {
      rules.push('public_api_imports_internal');
    }

    // Rule 2: No circular dependencies (checked at integration level)
    rules.push('no_circular_deps');

    // Rule 3: Default export pattern
    const hasDefault = exports.some((e) => e.type === 'default');
    if (hasDefault) {
      rules.push('uses_default_export');
    }

    // Rule 4: Named exports pattern
    const hasNamed = exports.some((e) => e.type === 'named');
    if (hasNamed && exports.length > 3) {
      rules.push('high_export_count');
    }

    return rules;
  }

  /**
   * Derive related modules from imports
   */
  private deriveRelated(imports: ImportInfo[], externalDeps: string[]): string[] {
    const related: string[] = [];

    // Group imports by source
    const importsBySource = new Map<string, ImportInfo[]>();
    for (const imp of imports) {
      const existing = importsBySource.get(imp.from) || [];
      existing.push(imp);
      importsBySource.set(imp.from, existing);
    }

    // List top related modules (by import count)
    const sorted = Array.from(importsBySource.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    for (const [source, _] of sorted) {
      related.push(this.normalizePath(source));
    }

    return related;
  }

  /**
   * Normalize module path
   */
  private normalizePath(modulePath: string): string {
    // Remove leading ./ and trailing /index
    return modulePath
      .replace(/^\.\//, '')
      .replace(/\/index$/, '')
      .replace(/\.(ts|tsx|js|jsx)$/, '');
  }

  private skipSingleNewline(content: string, index: number): number {
    if (content.slice(index, index + 2) === '\r\n') {
      return index + 2;
    }
    if (content[index] === '\n') {
      return index + 1;
    }
    return index;
  }

  private removeExistingHeaders(content: string): string {
    // Remove block-style /** @coderef-semantic */ headers
    let result = content.replace(/\/\*\*[\s\S]*?@coderef-semantic\s*:[\s\S]*?\*\/\n?/g, '');
    // Remove line-style // @coderef-semantic headers (one line at a time)
    result = result.replace(/^\/\/\s*@coderef-semantic\s*:.*\n?/gm, '');
    // Collapse runs of 3+ blank lines down to 2 (cleanup from removed blocks)
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
  }

  private hasSemanticHeader(content: string): boolean {
    return /\/\*\*[\s\S]*?@coderef-semantic\s*:[\s\S]*?\*\//.test(content)
      || /^\/\/\s*@coderef-semantic\s*:/m.test(content);
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueObjects<T>(values: T[], getKey: (value: T) => string): T[] {
  const unique = new Map<string, T>();
  for (const value of values) {
    const key = getKey(value);
    if (!unique.has(key)) {
      unique.set(key, value);
    }
  }
  return Array.from(unique.values());
}

function getRelatedPath(entry: any): string {
  return entry?.file || entry?.path || '';
}

/**
 * Generate headers for a single file
 */
export async function generateHeaders(
  filePath: string,
  exports: ExportInfo[],
  imports: ImportInfo[],
  options?: HeaderGenerationOptions,
): Promise<void> {
  const generator = new HeaderGenerator(options);
  const headers = generator.generateHeaders(exports, imports);
  await generator.insertHeaders(filePath, headers);
}
