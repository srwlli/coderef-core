/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-context-tools
 * @exports ContextTools, buildContextTools
 * @used_by src/cli/coderef-mcp-server.ts
 */

/**
 * Context/refactor tool family: pack_context (focus + dependency-closure
 * bundle), rename_preview (dry-run rename plan), and rename_apply — the
 * SINGLE sanctioned source-write MCP tool (scoped supersession, operator
 * ruling 2026-08-01, WO-GX-003-MIRRORED-RENAME-APPLY-SCOPED-SOURCE-WRITE-001).
 * rename_apply is a THIN MIRROR of the coderef-rename CLI: it delegates to
 * the SAME planRename/applyRename modules with zero forked rewrite logic;
 * apply:false (default) is a pure preview, and shadow-ambiguous lines are
 * NEVER rewritten over MCP (the CLI-only escape hatch is not mirrored).
 * pack_context/rename_preview extracted VERBATIM from the coderef-mcp-server
 * monolith (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1); tool
 * registration stays in coderef-mcp-server.ts.
 */

import { packContext } from '../../context/context-packer.js';
import { planRename } from '../../refactor/rename-planner.js';
import { applyRename } from '../../refactor/rename-applier.js';
import { type HandlerContext, type ToolHandlers, loadValidationReport, notFound } from './shared.js';

export type ContextTools = Pick<ToolHandlers, 'pack_context' | 'rename_preview' | 'rename_apply'>;

/**
 * Graph-resolution blind-spot disclosure, STRATIFIED per
 * discovery-resolution-core-issue.md REC-R2: report the src-only numbers
 * (unresolved_src_count, resolved_of_resolvable) ALONGSIDE the raw totals —
 * quoting the raw headline alone overstates the production blind spot ~19x
 * because ~95% of raw unresolved edges are test-DSL calls (vitest ambient
 * globals + matcher chains), a denominator artifact pending the test_dsl
 * reclassify ruling. Surfaces, not verdicts. Absent report => disclosed
 * no_data, never a silent omit.
 */
function resolutionDisclosure(projectDir: string): Record<string, unknown> {
  try {
    const report = loadValidationReport(projectDir);
    return {
      note:
        'Rename recall is bounded by graph resolution: sites the graph did not resolve silently survive a rename. ' +
        'STRATIFIED read (REC-R2): unresolved_src_count + resolved_of_resolvable are the production-code numbers; ' +
        '~95% of raw unresolved edges are test-DSL calls (vitest ambient globals + matcher chains) — a denominator ' +
        'artifact pending the test_dsl reclassify ruling. Quoting the raw headline alone overstates the production ' +
        'blind spot ~19x. Surfaces, not verdicts.',
      unresolved_src_count: report.unresolved_src_count,
      ambiguous_src_count: report.ambiguous_src_count,
      resolved_of_resolvable: report.resolved_of_resolvable,
      resolution_rate: report.resolution_rate,
      unresolved_edges_total: report.unresolved_count,
      ambiguous_edges_total: report.ambiguous_count,
    };
  } catch {
    return {
      no_data: true,
      note:
        'validation-report.json absent/unreadable — the graph-resolution blind-spot numbers are unavailable. ' +
        'The rename recall bound is UNDISCLOSED here, not zero; re-run populate to restore the report.',
    };
  }
}

export function buildContextTools(ctx: HandlerContext): ContextTools {
  const { projectDir } = ctx;

  return {

    // ---- CLI/MCP parity (WO-...-CLI-MCP-PARITY-001 P6) ----------------------
    // pack_context + rename_preview are READ tools (they only load
    // .coderef/graph.json + read source). rename_preview is PREVIEW-ONLY: no
    // apply arg, no write — source mutation lives exclusively on the
    // coderef-rename CLI. See buildToolHandlers header + the registerTool blocks.

    pack_context({ element, token_budget, full_deps, include_callers }) {
      // Wrap the clean substrate export. full_deps=true opts back into full
      // dependency windows (compressDeps=false); default compresses deps.
      // include_callers=true (Phase 4, ego-graph) also packs the focus's 1-hop
      // inbound callers (who calls it), signature-compressed — the
      // understand-before-edit view. Default off = bundle byte-unchanged.
      try {
        const result = packContext(projectDir, element, {
          tokenBudget: token_budget,
          compressDeps: full_deps ? false : undefined,
          includeCallers: include_callers ?? false,
        });
        return { bundle: result.bundle, manifest: result.manifest };
      } catch (e: any) {
        // packContext throws Error('focus not found: ...') on a miss — surface
        // the same clean not-found envelope the resolved-edge tools use.
        const msg = String(e?.message ?? e);
        if (/focus not found/i.test(msg)) return notFound(element);
        return { error: 'pack_failed', query: element, detail: msg.slice(0, 300) };
      }
    },

    rename_preview({ old_name, new_name, min_confidence }) {
      // Dry-run ONLY. planRename reads the canonical graph and returns the plan
      // (sites/typeOnlyRefs/ambiguities). It writes NOTHING. There is
      // deliberately NO apply path here — a stray apply-arg regression would be
      // caught by the mcp-server test's write-confinement guard.
      // Phase 3: each site carries its confidence tier (declaration sites are
      // 'exact'; reference sites echo their edge tier). min_confidence tightens
      // the reference sites to the threshold — e.g. 'exact' leaves only the
      // auto-apply-safe sites, dropping provisional single-candidate ones.
      try {
        const plan = planRename(projectDir, old_name, new_name, min_confidence);
        // Tier tally so an agent can see the safe-vs-review split at a glance.
        const byConfidence: Record<string, number> = {};
        for (const s of plan.sites) byConfidence[s.confidence] = (byConfidence[s.confidence] ?? 0) + 1;
        return {
          old_name: plan.oldName,
          new_name: plan.newName,
          preview_only: true,
          apply_hint: 'To apply, run the coderef-rename CLI (--apply). MCP is preview-only.',
          ...(plan.minConfidence ? { min_confidence: plan.minConfidence } : {}),
          target_ids: plan.targetIds,
          site_count: plan.sites.length,
          sites_by_confidence: byConfidence,
          sites: plan.sites,
          type_only_refs: plan.typeOnlyRefs,
          ambiguities: plan.ambiguities,
        };
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (/symbol not found/i.test(msg)) return notFound(old_name);
        return { error: 'rename_preview_failed', query: old_name, detail: msg.slice(0, 300) };
      }
    },

    rename_apply({ old_name, new_name, apply, min_confidence }) {
      // THE single sanctioned source-write MCP tool (scoped supersession,
      // operator ruling 2026-08-01). Thin mirror of the coderef-rename CLI:
      // the SAME planRename/applyRename modules do all the work — zero forked
      // rewrite logic. Safety envelope (ruling conditions):
      //   - apply defaults to FALSE: pure preview, identical plan to
      //     rename_preview, zero filesystem writes.
      //   - forceAmbiguous is hard-false BY CONSTRUCTION: shadow-ambiguous
      //     lines are never rewritten over MCP (CLI-only escape hatch), only
      //     disclosed in files[].ambiguous.
      //   - writes are atomic (writeTextAtomic inside applyRename).
      //   - the response always carries the stratified resolution disclosure.
      try {
        const plan = planRename(projectDir, old_name, new_name, min_confidence);
        const doApply = apply === true;
        const result = applyRename(plan, { apply: doApply });

        const byConfidence: Record<string, number> = {};
        for (const s of plan.sites) byConfidence[s.confidence] = (byConfidence[s.confidence] ?? 0) + 1;

        return {
          old_name: plan.oldName,
          new_name: plan.newName,
          applied: doApply,
          ...(doApply
            ? {}
            : { apply_hint: 'Preview only (apply=false, the default): nothing was written. Pass apply:true to perform the atomic rewrite.' }),
          ...(plan.minConfidence ? { min_confidence: plan.minConfidence } : {}),
          target_ids: plan.targetIds,
          site_count: plan.sites.length,
          sites_by_confidence: byConfidence,
          sites: plan.sites,
          type_only_refs: plan.typeOnlyRefs,
          ambiguities: plan.ambiguities,
          // Per-file rewrite counts + the skipped-ambiguity list. oldText/
          // newText are deliberately DROPPED over MCP (token budget) — the
          // counts and ambiguity reasons are the contract surface.
          files: result.previews.map(p => ({ file: p.file, rewrites: p.rewrites, ambiguous: p.ambiguous })),
          total_rewrites: result.totalRewrites,
          ambiguity_count: result.ambiguities,
          ...(doApply ? { applied_files: result.appliedFiles } : {}),
          ...(result.halted ? { halted: result.halted } : {}),
          resolution_disclosure: resolutionDisclosure(projectDir),
        };
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (/symbol not found/i.test(msg)) return notFound(old_name);
        return { error: 'rename_apply_failed', query: old_name, detail: msg.slice(0, 300) };
      }
    },
  };
}
