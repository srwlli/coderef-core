/**
 * @coderef-semantic: 1.0.0
 * @exports ParseHeaderResult, parseHeader
 * @used_by src/pipeline/extractors/relationship-extractor.ts, __tests__/pipeline/header-layer-runtime-validation.test.ts, __tests__/pipeline/header-tag-validation.test.ts
 */




function detectHeaderBlock(
  sourceText: string,
): { body: string; startLine: number } | null {
  const blockMatch = sourceText.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (blockMatch && SEMANTIC_MARKER_RE.test(blockMatch[1])) {
    const startLine = countLines(sourceText.slice(0, blockMatch.index ?? 0)) + 1;
    return { body: blockMatch[1], startLine };
  }

  const lineMatch = sourceText.match(/^\s*((?:\/\/.*\n)+)/);
  if (lineMatch) {
    const stripped = lineMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*\/\/\s?/, ''))
      .join('\n');
    if (SEMANTIC_MARKER_RE.test(stripped)) {
      const startLine = countLines(sourceText.slice(0, lineMatch.index ?? 0)) + 1;
      return { body: stripped, startLine };
    }
  }

  const docstringMatch = sourceText.match(/^\s*"""([\s\S]*?)"""/);
  if (docstringMatch && SEMANTIC_MARKER_RE.test(docstringMatch[1])) {
    const startLine = countLines(sourceText.slice(0, docstringMatch.index ?? 0)) + 1;
    return { body: docstringMatch[1], startLine };
  }

  return null;
}

function countLines(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

/**
 * Extract the line number (relative to source start) of a tag in the body.
 */
function tagLineInSource(
  body: string,
  blockStartLine: number,
  tagOffset: number,
): number {
  return blockStartLine + countLines(body.slice(0, tagOffset));
}

/**
 * Parse a single `@tag value` line. The value is the slice from after the
 * tag-and-whitespace up to the next `@`-tag or end-of-block.
 */
function extractTagValue(body: string, tag: string): { value: string; offset: number } | null {
  const re = new RegExp(`@${tag}\\b\\s*`, 'g');
  const m = re.exec(body);
  if (!m) return null;
  const valueStart = m.index + m[0].length;
  const tail = body.slice(valueStart);
  // Stop at next @tag (preceded by whitespace or *) or end of block.
  const stopMatch = tail.match(/(\n\s*\*?\s*@[a-zA-Z_][a-zA-Z0-9_-]*\b)|$/);
  const stopOffset = stopMatch ? stopMatch.index ?? tail.length : tail.length;
  let raw = tail.slice(0, stopOffset);
  // Trim trailing newlines / leading whitespace and strip JSDoc `* ` prefixes.
  raw = raw
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : line.replace(/^\s*\*\s?/, '')))
    .join('\n')
    .trim();
  return { value: raw, offset: m.index };
}

function pushError(
  errors: HeaderParseError[],
  tag: string,
  message: string,
  line: number,
): void {
  errors.push({ tag, message, line });
}

function parseConstraintArray(
  raw: string,
  line: number,
  errors: HeaderParseError[],
): string[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    pushError(errors, '@constraint', `not valid JSON: ${raw}`, line);
    return undefined;
  }
  if (!Array.isArray(parsed)) {
    pushError(errors, '@constraint', 'value must be a JSON array', line);
    return undefined;
  }
  const items: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') {
      pushError(errors, '@constraint', `non-string item: ${JSON.stringify(item)}`, line);
      continue;
    }
    if (!KEBAB_CASE_RE.test(item)) {
      pushError(errors, '@constraint', `non-kebab-case constraint: ${item}`, line);
      continue;
    }
    items.push(item);
  }
  return items;
}

function parseExportsList(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function parseImportsArray(
  raw: string,
  line: number,
  sourceFile: string,
  errors: HeaderParseError[],
): HeaderImportFact[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    pushError(errors, '@imports', `not valid JSON: ${raw}`, line);
    return [];
  }
  if (!Array.isArray(parsed)) {
    pushError(errors, '@imports', 'value must be a JSON array of "module:symbol" strings', line);
    return [];
  }
  const facts: HeaderImportFact[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') {
      pushError(errors, '@imports', `non-string item: ${JSON.stringify(item)}`, line);
      continue;
    }
    const colon = item.indexOf(':');
    if (colon < 0) {
      pushError(errors, '@imports', `missing ":" in "${item}" — expected module:symbol`, line);
      continue;
    }
    const module = item.slice(0, colon);
    const symbol = item.slice(colon + 1);
    if (!module || !symbol) {
      pushError(errors, '@imports', `empty module or symbol in "${item}"`, line);
      continue;
    }
    facts.push({ sourceFile, module, symbol, line });
  }
  return facts;
}

/**
 * Pure header parser. See module docstring for contract.
 */
export function parseHeader(
  sourceText: string,
  sourceFile: string,
): ParseHeaderResult {
  const block = detectHeaderBlock(sourceText);
  if (!block) {
    return {
      headerFact: { sourceFile },
      headerStatus: 'missing',
      importFacts: [],
    };
  }

  const { body, startLine } = block;
  const errors: HeaderParseError[] = [];
  const fact: HeaderFact = { sourceFile };

  // Semantic marker (required).
  const markerMatch = body.match(SEMANTIC_MARKER_RE);
  if (markerMatch) {
    fact.version = markerMatch[1];
  } else {
    pushError(errors, '@coderef-semantic', 'missing @coderef-semantic marker', startLine);
  }

  // @layer
  const layerTag = extractTagValue(body, 'layer');
  if (layerTag) {
    const tagLine = tagLineInSource(body, startLine, layerTag.offset);
    if (isValidLayer(layerTag.value)) {
      fact.layer = layerTag.value;
    } else {
      pushError(errors, '@layer', `unknown layer "${layerTag.value}"`, tagLine);
    }
  }

  // @capability
  const capabilityTag = extractTagValue(body, 'capability');
  if (capabilityTag) {
    const tagLine = tagLineInSource(body, startLine, capabilityTag.offset);
    if (isKebabCase(capabilityTag.value)) {
      fact.capability = capabilityTag.value;
    } else {
      pushError(errors, '@capability', `not kebab-case: "${capabilityTag.value}"`, tagLine);
    }
  }

  // @constraint
  const constraintTag = extractTagValue(body, 'constraint');
  if (constraintTag) {
    const tagLine = tagLineInSource(body, startLine, constraintTag.offset);
    const items = parseConstraintArray(constraintTag.value, tagLine, errors);
    if (items) fact.constraints = items;
  }

  // @exports
  const exportsTag = extractTagValue(body, 'exports');
  if (exportsTag) {
    const list = parseExportsList(exportsTag.value);
    const tagLine = tagLineInSource(body, startLine, exportsTag.offset);
    const valid: string[] = [];
    for (const item of list) {
      if (IDENTIFIER_RE.test(item)) {
        valid.push(item);
      } else {
        pushError(errors, '@exports', `not a valid identifier: "${item}"`, tagLine);
      }
    }
    fact.exports = valid;
  }

  // @imports
  const importsTag = extractTagValue(body, 'imports');
  let importFacts: HeaderImportFact[] = [];
  if (importsTag) {
    const tagLine = tagLineInSource(body, startLine, importsTag.offset);
    importFacts = parseImportsArray(importsTag.value, tagLine, sourceFile, errors);
    fact.imports = importFacts;
  }

  // @generated
  const generatedTag = extractTagValue(body, 'generated');
  if (generatedTag) {
    const tagLine = tagLineInSource(body, startLine, generatedTag.offset);
    if (ISO_8601_RE.test(generatedTag.value)) {
      fact.generated = generatedTag.value;
    } else {
      pushError(errors, '@generated', `not ISO 8601: "${generatedTag.value}"`, tagLine);
    }
  }

  if (errors.length > 0) {
    fact.parseErrors = errors;
    return { headerFact: fact, headerStatus: 'partial', importFacts };
  }

  return { headerFact: fact, headerStatus: 'defined', importFacts };
}
