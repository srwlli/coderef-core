/**
 * IMP-CORE-044: Frontend Update Generator
 *
 * Automates frontend API call updates for migrations with confidence scoring
 * and batch replacement capabilities.
 *
 * Features:
 * - Confidence scoring (95%+ auto, 70-94% suggest, <70% flag)
 * - Git patch generation
 * - Direct file modifications
 * - Batch replacement with dry-run support
 *
 * @module validator/frontend-update-generator
 */

import type { FrontendCall, MigrationMapping } from '../types/types.js';
import { applyMappings } from './migration-mapper.js';

/**
 * Confidence level categorization for update decisions
 */
export type ConfidenceLevel = 'auto' | 'suggest' | 'flag';

/**
 * Frontend call update suggestion with confidence scoring
 */
export interface FrontendUpdateSuggestion {
  /** Unique identifier for this suggestion */
  id: string;
  /** Original frontend call */
  originalCall: FrontendCall;
  /** Suggested new path after migration */
  suggestedPath: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Confidence level category */
  confidenceLevel: ConfidenceLevel;
  /** Reason for the suggestion */
  reason: string;
  /** Migration rule that matched */
  mappingRule: 'explicit' | 'pattern' | 'similarity' | 'none';
  /** Whether this update can be auto-applied */
  canAutoApply: boolean;
  /** Line content for replacement (if available) */
  originalLine?: string;
  /** Suggested replacement line content */
  suggestedLine?: string;
}

/**
 * Batch update result for multiple frontend calls
 */
export interface BatchUpdateResult {
  /** Total number of calls processed */
  totalCalls: number;
  /** Calls that can be auto-updated (95%+ confidence) */
  autoUpdates: FrontendUpdateSuggestion[];
  /** Calls that need manual review (70-94% confidence) */
  suggestedUpdates: FrontendUpdateSuggestion[];
  /** Calls that require attention (<70% confidence) */
  flaggedUpdates: FrontendUpdateSuggestion[];
  /** Calls with no mapping found */
  unmappedCalls: FrontendCall[];
  /** Statistics by confidence level */
  stats: {
    auto: number;
    suggest: number;
    flag: number;
    unmapped: number;
  };
}

/**
 * Git patch format for code changes
 */
export interface GitPatch {
  /** Patch file name */
  filename: string;
  /** Patch content in unified diff format */
  content: string;
  /** File being modified */
  targetFile: string;
  /** Number of additions */
  additions: number;
  /** Number of deletions */
  deletions: number;
}

/**
 * File modification operation
 */
export interface FileModification {
  /** File path to modify */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Original content */
  original: string;
  /** Replacement content */
  replacement: string;
  /** Whether this is a safe replacement */
  safe: boolean;
}

/**
 * Thresholds for confidence level categorization
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Auto-apply threshold (95%+) */
  AUTO: 95,
  /** Suggest threshold (70-94%) */
  SUGGEST: 70,
  /** Below this is flagged (<70%) */
  FLAG: 0
} as const;

/**
 * Calculate confidence level from score
 *
 * @param confidence - Confidence score (0-100)
 * @returns Confidence level category
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO) {
    return 'auto';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.SUGGEST) {
    return 'suggest';
  }
  return 'flag';
}

/**
 * Calculate similarity score between two paths
 *
 * Uses multiple heuristics:
 * - Exact match: 100
 * - Same path segments: 90
 * - Pattern match via mapping: 80
 * - Similar structure (same segment count): 60
 * - Partial match: 40
 * - No match: 0
 *
 * @param originalPath - Original API path
 * @param targetPath - Target/migrated path
 * @param method - HTTP method for context
 * @param mappingResult - Result from migration mapping
 * @returns Confidence score (0-100)
 */
export function calculatePathConfidence(
  originalPath: string,
  targetPath: string,
  method: string,
  mappingResult: { confidence: number; mappingRule: string }
): number {
  // No mapping available - unmapped routes get 0 confidence
  if (mappingResult.mappingRule === 'unmapped') {
    return 0;
  }

  // Exact match with valid mapping
  if (originalPath === targetPath && mappingResult.confidence > 0) {
    return 100;
  }

  // Use mapping confidence if available
  if (mappingResult.confidence > 0) {
    // Boost explicit mappings
    if (mappingResult.mappingRule === 'explicit') {
      return Math.min(100, mappingResult.confidence + 5);
    }
    return mappingResult.confidence;
  }

  // Calculate structural similarity
  const originalSegments = originalPath.split('/').filter(Boolean);
  const targetSegments = targetPath.split('/').filter(Boolean);

  // Same number of segments = potential migration
  if (originalSegments.length === targetSegments.length) {
    // Check for common segments
    const commonSegments = originalSegments.filter(seg =>
      targetSegments.some(targetSeg =>
        targetSeg.toLowerCase().includes(seg.toLowerCase()) ||
        seg.toLowerCase().includes(targetSeg.toLowerCase())
      )
    );

    const similarityRatio = commonSegments.length / Math.max(originalSegments.length, targetSegments.length);
    return Math.round(60 * similarityRatio);
  }

  // Different structure, low confidence
  return Math.round(30 * (1 / Math.abs(originalSegments.length - targetSegments.length + 1)));
}

/**
 * Generate update suggestions for frontend calls
 *
 * @param calls - Frontend API calls to analyze
 * @param migrationConfig - Migration configuration
 * @returns Array of update suggestions
 */
export function generateUpdateSuggestions(
  calls: FrontendCall[],
  migrationConfig: MigrationMapping
): FrontendUpdateSuggestion[] {
  const suggestions: FrontendUpdateSuggestion[] = [];

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];

    // Apply migration mappings
    const mappingResult = applyMappings(call.path, migrationConfig);

    // Calculate confidence with method context
    const confidence = calculatePathConfidence(
      call.path,
      mappingResult.transformedPath,
      call.method,
      mappingResult
    );

    // Determine confidence level and auto-apply eligibility
    const confidenceLevel = getConfidenceLevel(confidence);
    const canAutoApply = confidenceLevel === 'auto' && mappingResult.confidence > 0;

    // Generate reason
    let reason: string;
    if (mappingResult.mappingRule === 'explicit') {
      reason = `Explicit mapping: ${call.path} → ${mappingResult.transformedPath}`;
    } else if (mappingResult.mappingRule === 'pattern') {
      reason = `Pattern match: ${call.path} → ${mappingResult.transformedPath}`;
    } else if (confidence > 60) {
      reason = `Similar path structure detected`;
    } else if (confidence > 0) {
      reason = `Potential migration candidate (low confidence)`;
    } else {
      reason = `No matching migration rule found`;
    }

    suggestions.push({
      id: `update-${i + 1}`,
      originalCall: call,
      suggestedPath: mappingResult.transformedPath,
      confidence,
      confidenceLevel,
      reason,
      mappingRule: mappingResult.mappingRule as 'explicit' | 'pattern' | 'similarity' | 'none',
      canAutoApply
    });
  }

  return suggestions;
}

/**
 * Batch process frontend calls and categorize by confidence level
 *
 * @param calls - Frontend API calls
 * @param migrationConfig - Migration configuration
 * @returns Batch update result with categorized suggestions
 */
export function batchProcessCalls(
  calls: FrontendCall[],
  migrationConfig: MigrationMapping
): BatchUpdateResult {
  const suggestions = generateUpdateSuggestions(calls, migrationConfig);

  const autoUpdates = suggestions.filter(s => s.confidenceLevel === 'auto');
  const suggestedUpdates = suggestions.filter(s => s.confidenceLevel === 'suggest');
  const flaggedUpdates = suggestions.filter(s => s.confidenceLevel === 'flag');
  const unmappedCalls = suggestions
    .filter(s => s.confidence === 0)
    .map(s => s.originalCall);

  return {
    totalCalls: calls.length,
    autoUpdates,
    suggestedUpdates,
    flaggedUpdates,
    unmappedCalls,
    stats: {
      auto: autoUpdates.length,
      suggest: suggestedUpdates.length,
      flag: flaggedUpdates.length,
      unmapped: unmappedCalls.length
    }
  };
}

/**
 * Generate file modifications for auto-applicable updates
 *
 * @param suggestions - Update suggestions (typically autoUpdates)
 * @param fileContents - Map of file paths to their contents
 * @returns Array of file modifications
 */
export function generateModifications(
  suggestions: FrontendUpdateSuggestion[],
  fileContents: Map<string, string[]>
): FileModification[] {
  const modifications: FileModification[] = [];

  for (const suggestion of suggestions) {
    const { originalCall, suggestedPath, confidence } = suggestion;
    const fileLines = fileContents.get(originalCall.file);

    if (!fileLines || originalCall.line < 1 || originalCall.line > fileLines.length) {
      continue;
    }

    const originalLine = fileLines[originalCall.line - 1];

    // Simple string replacement of the path
    // Note: This is a basic implementation - production would need AST-aware replacement
    const escapedPath = originalCall.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pathRegex = new RegExp(`(['"\`])${escapedPath}(['"\`])`);

    if (pathRegex.test(originalLine)) {
      const replacement = originalLine.replace(pathRegex, `$1${suggestedPath}$2`);

      modifications.push({
        file: originalCall.file,
        line: originalCall.line,
        original: originalLine,
        replacement,
        safe: confidence >= CONFIDENCE_THRESHOLDS.AUTO
      });

      // Update suggestion with line content
      suggestion.originalLine = originalLine;
      suggestion.suggestedLine = replacement;
    }
  }

  return modifications;
}

/**
 * Generate a git patch from modifications
 *
 * @param modifications - File modifications to include
 * @param projectPath - Base project path for relative paths
 * @returns Git patch in unified diff format
 */
export function generateGitPatch(
  modifications: FileModification[],
  projectPath: string
): GitPatch {
  // Group modifications by file
  const byFile = new Map<string, FileModification[]>();
  for (const mod of modifications) {
    const existing = byFile.get(mod.file) || [];
    existing.push(mod);
    byFile.set(mod.file, existing);
  }

  let patchContent = '';
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const [file, mods] of byFile) {
    // Sort by line number (descending) to apply from bottom up
    const sortedMods = mods.sort((a, b) => b.line - a.line);

    const relativePath = file.replace(projectPath, '').replace(/^[/\\]/, '');

    patchContent += `--- a/${relativePath}\n`;
    patchContent += `+++ b/${relativePath}\n`;

    for (const mod of sortedMods) {
      patchContent += `@@ -${mod.line},1 +${mod.line},1 @@\n`;
      patchContent += `-${mod.original}\n`;
      patchContent += `+${mod.replacement}\n`;
      totalAdditions++;
      totalDeletions++;
    }

    patchContent += '\n';
  }

  return {
    filename: `migration-frontend-updates-${Date.now()}.patch`,
    content: patchContent,
    targetFile: projectPath,
    additions: totalAdditions,
    deletions: totalDeletions
  };
}

/**
 * Apply modifications directly to files (dry-run option available)
 *
 * @param modifications - Modifications to apply
 * @param dryRun - If true, only return what would be changed
 * @returns Applied modifications or preview
 */
export async function applyModifications(
  modifications: FileModification[],
  dryRun = false
): Promise<{ applied: FileModification[]; skipped: FileModification[]; preview?: string }> {
  const fs = await import('fs/promises');

  const applied: FileModification[] = [];
  const skipped: FileModification[] = [];
  let preview = '';

  // Group by file
  const byFile = new Map<string, FileModification[]>();
  for (const mod of modifications) {
    const existing = byFile.get(mod.file) || [];
    existing.push(mod);
    byFile.set(mod.file, existing);
  }

  for (const [filePath, mods] of byFile) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Sort by line number descending to avoid offset issues
      const sortedMods = mods.sort((a, b) => b.line - a.line);

      let modifiedContent = content;

      for (const mod of sortedMods) {
        if (dryRun) {
          preview += `--- ${filePath}:${mod.line} ---\n`;
          preview += `- ${mod.original}\n`;
          preview += `+ ${mod.replacement}\n\n`;
          applied.push(mod);
        } else {
          // Verify line matches before replacing
          if (lines[mod.line - 1] === mod.original) {
            lines[mod.line - 1] = mod.replacement;
            applied.push(mod);
          } else {
            skipped.push(mod);
          }
        }
      }

      if (!dryRun && applied.length > 0) {
        modifiedContent = lines.join('\n');
        await fs.writeFile(filePath, modifiedContent, 'utf-8');
      }
    } catch (error) {
      // Skip files that can't be read/written
      skipped.push(...mods);
    }
  }

  return { applied, skipped, preview: dryRun ? preview : undefined };
}

/**
 * Generate a summary report of batch update results
 *
 * @param result - Batch update result
 * @returns Human-readable summary
 */
export function generateUpdateReport(result: BatchUpdateResult): string {
  const lines: string[] = [];

  lines.push('# Frontend Migration Update Report\n');
  lines.push(`**Total Calls Processed:** ${result.totalCalls}\n`);

  lines.push('## Summary by Confidence Level\n');
  lines.push(`- ✅ **Auto-apply (${CONFIDENCE_THRESHOLDS.AUTO}%+):** ${result.stats.auto} calls`);
  lines.push(`- 💡 **Suggest (70-94%):** ${result.stats.suggest} calls`);
  lines.push(`- ⚠️ **Flag (<70%):** ${result.stats.flag} calls`);
  lines.push(`- ❓ **Unmapped:** ${result.stats.unmapped} calls\n`);

  if (result.autoUpdates.length > 0) {
    lines.push('## Auto-Apply Updates\n');
    for (const update of result.autoUpdates) {
      lines.push(`### ${update.id}`);
      lines.push(`- **File:** ${update.originalCall.file}:${update.originalCall.line}`);
      lines.push(`- **Change:** ${update.originalCall.path} → ${update.suggestedPath}`);
      lines.push(`- **Method:** ${update.originalCall.method}`);
      lines.push(`- **Confidence:** ${update.confidence}%`);
      lines.push(`- **Reason:** ${update.reason}\n`);
    }
  }

  if (result.suggestedUpdates.length > 0) {
    lines.push('## Suggested Updates (Review Recommended)\n');
    for (const update of result.suggestedUpdates.slice(0, 5)) {
      lines.push(`- ${update.originalCall.file}:${update.originalCall.line}`);
      lines.push(`  ${update.originalCall.path} → ${update.suggestedPath} (${update.confidence}%)`);
    }
    if (result.suggestedUpdates.length > 5) {
      lines.push(`\n... and ${result.suggestedUpdates.length - 5} more\n`);
    }
  }

  if (result.flaggedUpdates.length > 0) {
    lines.push('## Flagged Updates (Manual Intervention Required)\n');
    for (const update of result.flaggedUpdates.slice(0, 5)) {
      lines.push(`- ${update.originalCall.file}:${update.originalCall.line}`);
      lines.push(`  ${update.originalCall.path} (${update.confidence}% confidence)`);
    }
    if (result.flaggedUpdates.length > 5) {
      lines.push(`\n... and ${result.flaggedUpdates.length - 5} more\n`);
    }
  }

  return lines.join('\n');
}

/**
 * Export batch results to JSON format for tooling integration
 *
 * @param result - Batch update result
 * @returns JSON-serializable export
 */
export function exportBatchResults(result: BatchUpdateResult): Record<string, unknown> {
  return {
    version: '1.0.0-IMP-CORE-044',
    generatedAt: new Date().toISOString(),
    summary: {
      total: result.totalCalls,
      auto: result.stats.auto,
      suggest: result.stats.suggest,
      flag: result.stats.flag,
      unmapped: result.stats.unmapped
    },
    updates: {
      auto: result.autoUpdates.map(u => ({
        id: u.id,
        file: u.originalCall.file,
        line: u.originalCall.line,
        originalPath: u.originalCall.path,
        suggestedPath: u.suggestedPath,
        method: u.originalCall.method,
        confidence: u.confidence,
        reason: u.reason
      })),
      suggest: result.suggestedUpdates.map(u => ({
        id: u.id,
        file: u.originalCall.file,
        line: u.originalCall.line,
        originalPath: u.originalCall.path,
        suggestedPath: u.suggestedPath,
        method: u.originalCall.method,
        confidence: u.confidence,
        reason: u.reason
      })),
      flag: result.flaggedUpdates.map(u => ({
        id: u.id,
        file: u.originalCall.file,
        line: u.originalCall.line,
        originalPath: u.originalCall.path,
        confidence: u.confidence,
        reason: u.reason
      }))
    },
    unmapped: result.unmappedCalls.map(c => ({
      file: c.file,
      line: c.line,
      path: c.path,
      method: c.method
    }))
  };
}
