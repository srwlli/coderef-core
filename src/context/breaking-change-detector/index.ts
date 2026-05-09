/**
 * IMP-CORE-035: Breaking Change Detector - Modular Architecture
 * 
 * Main entry point that re-exports the BreakingChangeDetector class and all types.
 * This module replaces the monolithic breaking-change-detector.ts with focused sub-modules:
 * 
 * - types.ts: All interfaces and type definitions
 * - signature-comparator.ts: Function signature comparison
 * - impact-assessor.ts: Breaking change scoring and severity
 * - diff-analyzer.ts: AST diff detection and call site analysis
 * - hint-generator.ts: Migration hint generation
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports BreakingChangeDetector
 */

// Re-export all types
export type {
  SignatureChange,
  ImpactedCallSite,
  MigrationHint,
  BreakingChangeReport,
  BlastRadius,
  ParameterDiff,
  ContextualFactor,
} from './types.js';

// Re-export signature comparator
export {
  compareSignatures,
  compareParameters,
  isBreakingChange,
  analyzeDifference,
} from './signature-comparator.js';

// Re-export impact assessor
export {
  calculateSeverity,
  calculateConfidence,
  scoreCallType,
  adjustForContextualFactors,
  calculateReportConfidence,
  isCompatibleCall,
} from './impact-assessor.js';

// Re-export diff analyzer
export {
  findImpactedCallSites,
  extractCallContext,
  getChangedElements,
  extractSignaturesFromRef,
  extractSignaturesFromWorktree,
} from './diff-analyzer.js';

// Re-export hint generator
export {
  generateMigrationHints,
  suggestWrapPattern,
  suggestRenamePattern,
  suggestAdapterPattern,
  suggestDefaultParamPattern,
  suggestOptionsObjectPattern,
} from './hint-generator.js';

// Import dependencies for the main class
import { AnalyzerService } from '../../analyzer/analyzer-service.js';
import { ImpactSimulator } from '../impact-simulator.js';
import {
  SignatureChange,
  BreakingChangeReport,
  ImpactedCallSite,
  BlastRadius,
} from './types.js';
import { compareSignatures, isBreakingChange } from './signature-comparator.js';
import { calculateSeverity, calculateReportConfidence } from './impact-assessor.js';
import { findImpactedCallSites, getChangedElements, extractSignaturesFromRef, extractSignaturesFromWorktree } from './diff-analyzer.js';
import { generateMigrationHints } from './hint-generator.js';

/**
 * Breaking Change Detector Service
 * 
 * Detects signature incompatibilities before code generation, enabling agents
 * to refactor safely without causing runtime failures at call sites.
 * 
 * REFACTORED: Now uses modular sub-components for better maintainability
 * - Delegates to specialized modules for comparison, assessment, and analysis
 */
export class BreakingChangeDetector {
  private analyzerService: AnalyzerService;
  private impactSimulator: ImpactSimulator;

  constructor(analyzerService: AnalyzerService, impactSimulator: ImpactSimulator) {
    this.analyzerService = analyzerService;
    this.impactSimulator = impactSimulator;
  }

  /**
   * Detect breaking changes between two git refs or worktree
   */
  async detectChanges(
    baseRef: string,
    headRef?: string,
    useWorktree?: boolean,
    maxDepth?: number
  ): Promise<BreakingChangeReport> {
    const startTime = Date.now();

    try {
      const changedElements = await getChangedElements(baseRef, headRef);

      if (changedElements.length === 0) {
        return {
          baseRef,
          headRef,
          worktree: useWorktree,
          summary: {
            breakingCount: 0,
            potentiallyBreakingCount: 0,
            nonBreakingCount: 0,
          },
          changes: [],
          metadata: {
            analyzedAt: new Date().toISOString(),
            analysisTime: Date.now() - startTime,
            confidence: 1.0,
          },
        };
      }

      const changes = [];
      let breakingCount = 0;
      let potentiallyBreakingCount = 0;

      for (const element of changedElements) {
        const signatures = {
          before: await extractSignaturesFromRef(baseRef, element.file),
          after: useWorktree
            ? await extractSignaturesFromWorktree(element.file)
            : await extractSignaturesFromRef(headRef || 'HEAD', element.file),
        };

        const beforeSig = signatures.before.get(element.name);
        const afterSig = signatures.after.get(element.name);

        if (!beforeSig || !afterSig) continue;

        const signatureChange = compareSignatures(beforeSig, afterSig);
        if (!signatureChange) continue;

        const isBreaking = isBreakingChange(signatureChange);
        if (isBreaking) {
          breakingCount++;
        } else {
          potentiallyBreakingCount++;
        }

        const impactedCallSites = await findImpactedCallSites(
          element,
          signatureChange,
          this.analyzerService
        );

        const severity = calculateSeverity(
          signatureChange,
          impactedCallSites.length,
          this.impactSimulator
        );

        const migrationHints = generateMigrationHints(signatureChange, impactedCallSites);

        changes.push({
          element: signatureChange.element,
          changeType: signatureChange.changeType,
          severity,
          details: signatureChange.details,
          impactedCallSites,
          migrationHints,
        });
      }

      return {
        baseRef,
        headRef,
        worktree: useWorktree,
        summary: {
          breakingCount,
          potentiallyBreakingCount,
          nonBreakingCount: changedElements.length - breakingCount - potentiallyBreakingCount,
        },
        changes,
        metadata: {
          analyzedAt: new Date().toISOString(),
          analysisTime: Date.now() - startTime,
          confidence: calculateReportConfidence(changes),
        },
      };
    } catch (error) {
      throw new Error(`Breaking change detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default BreakingChangeDetector;
