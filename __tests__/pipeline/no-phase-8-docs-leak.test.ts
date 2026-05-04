import { describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Phase 7 task 1.13 — boundary enforcer asserting NO Phase 8 doc-sync
// fields leak into Phase 7 output (mirrors how Phase 6 created
// no-rag-indexing.test.ts to keep Phase 7 fields out of Phase 6).
//
// Phase 8's job is to sync documentation to actual code behavior. It
// produces docs/ artifacts and metadata about doc generation. None of
// those fields belong in Phase 7's IndexingResult, ValidationReport,
// ExportedGraph, or PipelineState. If a future change accidentally
// stashes a Phase 8 field name into a Phase 7 surface, this test
// catches it before the Phase 8 work begins.
//
// Forbidden field names per WO-PIPELINE-INDEXING-RAG-001 analysis.json
// phase_8_boundary.no_leak_fields:
const FORBIDDEN_PHASE_8_FIELDS = [
  'docsGenerated',
  'schemaDocPath',
  'schemaDocMd',
  'apiContractMd',
  'agentUsageContractMd',
  'headerGrammarDocPath',
  'documentationVersion',
  'docsBuildTimestamp',
];

const TYPE_FILES = [
  // Phase 7 IndexingResult and friends:
  'src/integration/rag/indexing-orchestrator.ts',
  'src/integration/rag/code-chunk.ts',
  'src/integration/vector/vector-store.ts',
  // Phase 6 ValidationReport / ValidationResult:
  'src/pipeline/output-validator.ts',
  // Phase 5 ExportedGraph:
  'src/export/graph-exporter.ts',
  // PipelineState:
  'src/pipeline/types.ts',
];

describe('Phase 8 boundary — no doc-sync field leak into Phase 7 surfaces', () => {
  for (const relPath of TYPE_FILES) {
    it(`${relPath} contains no Phase 8 forbidden field names`, async () => {
      const repoRoot = path.resolve(__dirname, '..', '..');
      const filePath = path.join(repoRoot, relPath);
      const source = await fs.readFile(filePath, 'utf-8');

      for (const forbidden of FORBIDDEN_PHASE_8_FIELDS) {
        // Match the field as a property/identifier surface — guard
        // against false positives from comment-only mentions by
        // anchoring at a word boundary that is followed by ':' or '?'
        // (TypeScript field/optional-field syntax) or '=' (assignment).
        const fieldDeclRegex = new RegExp(`\\b${forbidden}\\s*[:?=]`);
        expect(
          fieldDeclRegex.test(source),
          `Phase 8 forbidden field "${forbidden}" appears in ${relPath}; ` +
            'this is a Phase 7 → Phase 8 boundary leak. Phase 7 must not ' +
            'reference doc-sync fields; that work belongs to Phase 8.',
        ).toBe(false);
      }
    });
  }
});
