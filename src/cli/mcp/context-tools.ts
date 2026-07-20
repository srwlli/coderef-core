/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-context-tools
 * @exports buildContextTools
 */

/**
 * Context/refactor tool family (CLI/MCP parity P6 READ pair): pack_context
 * (focus + dependency-closure bundle) and rename_preview (dry-run rename
 * plan — NO apply path; source mutation stays CLI-only).
 * Extracted VERBATIM from the coderef-mcp-server monolith
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1) — handler bodies, response
 * envelopes, and pagination semantics unchanged; tool registration stays in
 * coderef-mcp-server.ts.
 */

import { packContext } from '../../context/context-packer.js';
import { planRename } from '../../refactor/rename-planner.js';
import { type HandlerContext, type ToolHandlers, notFound } from './shared.js';

export type ContextTools = Pick<ToolHandlers, 'pack_context' | 'rename_preview'>;

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
  };
}
