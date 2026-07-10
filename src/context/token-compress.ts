/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability token-compress
 * @exports estimateTokens, compressStructurePreserving
 * @used_by src/integration/ai-prompt-generator.ts, src/context/context-packer.ts
 */

/**
 * token-compress — the structure-preserving token-budget primitive, extracted
 * VERBATIM from AIPromptGenerator's private estimateTokens/optimizePromptForTokens
 * (src/integration/ai-prompt-generator.ts) so it can be shared by the context
 * packer without duplicating the truncation heuristics.
 *
 * Strategy (unchanged from the origin): split text into logical sections on
 * markdown headings and blank-line boundaries. Keep all signature lines
 * (function/class/type keyword lines, one-liners, heading lines). Drop body
 * lines — the indented lines between a signature and the next blank line —
 * when over budget, collapsing each dropped gap to a single `  // ...`
 * placeholder. If still over budget, hard-truncate at the last section
 * boundary. This preserves the structural skeleton while shedding
 * implementation detail that costs tokens but rarely helps LLM understanding
 * of shape.
 *
 * Pure and local: no filesystem, no network, no LLM. Behaviour is identical to
 * the original private methods (same regexes, same thresholds).
 */

/**
 * Estimate tokens (rough approximation: 1 token ≈ 4 characters).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Compress text to fit a token budget using structure-preserving truncation.
 *
 * Returns the (possibly shortened) text plus a `truncated` flag. When
 * `estimateTokens(text) <= budget` the text is returned unchanged with
 * `truncated: false` — UNLESS `opts.force` is set, which runs the
 * signature-first body-drop pass unconditionally (the context packer uses this
 * so dependency source is compressed to its skeleton even when it would fit the
 * remaining budget uncompressed). Pass-2 hard-truncate still only fires when the
 * pass-1 result is over budget, so `force` never truncates content that fits.
 */
export function compressStructurePreserving(
  text: string,
  budget: number,
  opts?: { force?: boolean },
): { text: string; truncated: boolean } {
  if (!opts?.force && estimateTokens(text) <= budget) {
    return { text, truncated: false };
  }

  const lines = text.split('\n');
  const SIGNATURE_RE = /^\s*(function |class |interface |type |const |let |var |export |import |async |private |public |protected |#|##|###)/;
  const BODY_SKIP_RE = /^\s{2,}[^#\-*\s]/; // indented non-list, non-heading lines

  // Pass 1: keep all signature/heading lines; drop body lines to meet budget.
  const kept: string[] = [];
  let inBody = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      inBody = false;
      kept.push(line);
      continue;
    }
    if (SIGNATURE_RE.test(line)) {
      inBody = true;
      kept.push(line);
      continue;
    }
    if (inBody && BODY_SKIP_RE.test(line)) {
      // Drop body line — record placeholder only once per gap
      if (kept[kept.length - 1] !== '  // ...') kept.push('  // ...');
      continue;
    }
    kept.push(line);
  }

  let result = kept.join('\n');

  // Pass 2: if still over budget, hard-truncate at last section boundary.
  const overBudget = estimateTokens(result) > budget;
  if (overBudget) {
    const charLimit = Math.floor(budget * 4); // 1 token ≈ 4 chars
    result = result.substring(0, charLimit);
    const lastHeading = result.lastIndexOf('\n##');
    const lastBlank = result.lastIndexOf('\n\n');
    const cutAt = Math.max(lastHeading, lastBlank);
    if (cutAt > charLimit * 0.7) result = result.substring(0, cutAt);
  }

  // Non-force path (the original AIPromptGenerator contract): reaching here means
  // the input was over budget, so it is ALWAYS marked truncated + gets the
  // marker — byte-identical to the pre-extraction behavior.
  // Force path (the context packer): pass-1 sheds bodies to the skeleton even
  // when the input fit; that is compression, not budget-truncation. Only append
  // the marker (and report truncated) when pass-2 actually cut content to fit.
  if (!opts?.force) {
    return { text: result + '\n\n[Context truncated to fit token limit]', truncated: true };
  }
  if (overBudget) {
    return { text: result + '\n\n[Context truncated to fit token limit]', truncated: true };
  }
  return { text: result, truncated: false };
}
