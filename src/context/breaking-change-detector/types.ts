/**
 * @coderef-semantic: 1.0.0
 * @exports SignatureChange, ImpactedCallSite, MigrationHint, BreakingChangeReport, BlastRadius, ParameterDiff, ContextualFactor
 * @used_by src/context/breaking-change-detector/diff-analyzer.ts, src/context/breaking-change-detector/hint-generator.ts, src/context/breaking-change-detector/impact-assessor.ts, src/context/breaking-change-detector/index.ts, src/context/breaking-change-detector/signature-comparator.ts
 */



/**
 * IMP-CORE-035: Breaking Change Detector Types
 * Extracted from breaking-change-detector.ts for modularity
 */

/**
 * Represents a change to a function/method signature
 */
export interface SignatureChange {
  element: {
    name: string;
    kind: 'Fn' | 'M' | 'Cl';
    file: string;
    line: number;
    coderefTag: string;
  };
  changeType: 'signature' | 'return' | 'visibility' | 'export' | 'overload' | 'type';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    before: string;
    after: string;
    diff: string;
  };
}

/**
 * Represents an impacted call site that will break
 */
export interface ImpactedCallSite {
  file: string;
  line: number;
  callerElement: string;
  callContext: string;
  confidence: number;
  callType: 'direct' | 'imported' | 'dynamic' | 'proxy';
}

/**
 * Suggestion for fixing a breaking change
 */
export interface MigrationHint {
  hintType: 'wrap' | 'rename' | 'defaultParam' | 'optionsObject' | 'adapter';
  text: string;
  confidence: number;
  codeExample?: string;
}

/**
 * Complete breaking change analysis result
 */
export interface BreakingChangeReport {
  baseRef: string;
  headRef?: string;
  worktree?: boolean;
  summary: {
    breakingCount: number;
    potentiallyBreakingCount: number;
    nonBreakingCount: number;
  };
  changes: {
    element: SignatureChange['element'];
    changeType: SignatureChange['changeType'];
    severity: SignatureChange['severity'];
    details: SignatureChange['details'];
    impactedCallSites: ImpactedCallSite[];
    migrationHints: MigrationHint[];
  }[];
  metadata: {
    analyzedAt: string;
    analysisTime: number;
    confidence: number;
  };
}

/**
 * Blast radius calculation result
 */
export interface BlastRadius {
  directImpacts: string[];
  transitiveImpacts: string[];
  riskScore: number;
}

/**
 * Parameter comparison result
 */
export interface ParameterDiff {
  description: string;
  type: 'added' | 'removed' | 'reordered' | 'type-changed';
}

/**
 * Contextual factor for confidence adjustment
 */
export interface ContextualFactor {
  type: 'test_coverage' | 'usage_frequency' | 'api_stability';
  value: number;
}
