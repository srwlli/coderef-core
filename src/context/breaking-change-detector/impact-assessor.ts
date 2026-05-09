/**
 * IMP-CORE-035: Impact Assessor
 * Calculates severity and confidence scores for breaking changes
 */

/**
 * @semantic
 * exports: [calculateSeverity, calculateConfidence, scoreCallType, adjustForContextualFactors, calculateReportConfidence, isCompatibleCall]
 * used_by: [src/context/breaking-change-detector/diff-analyzer.ts, src/context/breaking-change-detector/index.ts]
 */

import { SignatureChange, ImpactedCallSite, BlastRadius } from './types.js';

/**
 * Integrate with ImpactSimulator to boost severity for risky changes
 * 
 * Breaking changes to highly-used code are marked CRITICAL.
 * Risk score from ImpactSimulator influences final severity.
 */
export function calculateSeverity(
  change: SignatureChange,
  callSiteCount: number,
  impactSimulator?: { calculateBlastRadius(elementName: string, depth: number): { directImpacts: unknown[]; transitiveImpacts: unknown[]; riskScore: number } }
): 'low' | 'medium' | 'high' | 'critical' {
  // Base severity from change type
  let severity: 'low' | 'medium' | 'high' | 'critical' = change.severity;

  // Boost severity based on direct call site impact
  if (callSiteCount > 20) {
    severity = 'critical';
  } else if (callSiteCount > 10) {
    severity = 'high';
  } else if (callSiteCount > 5) {
    severity = 'medium';
  }

  // Further boost if visibility changed (public API)
  if (change.changeType === 'visibility') {
    severity = 'critical';
  }

  // Integration point: Use ImpactSimulator for transitive impact analysis
  if (impactSimulator) {
    try {
      const blastRadius = impactSimulator.calculateBlastRadius(change.element.name, 5);

      // If blast radius indicates high risk, escalate severity
      if (blastRadius.riskScore >= 75) {
        severity = 'critical';
      } else if (blastRadius.riskScore >= 50 && severity === 'medium') {
        severity = 'high';
      }

      // If many elements are transitively affected (>30), mark critical
      if (blastRadius.directImpacts.length + blastRadius.transitiveImpacts.length > 30) {
        severity = 'critical';
      }
    } catch (err) {
      // If blast radius calculation fails, continue with baseline severity
      console.debug(`Blast radius calculation failed: ${err}`);
    }
  }

  return severity;
}

/**
 * Calculate confidence that a detected call site will actually break
 * 
 * Multi-factor confidence scoring:
 * - Factor 1: Call Type (40% weight)
 * - Factor 2: Change Type (40% weight)
 * - Factor 3: Contextual Factors (20% weight)
 */
export function calculateConfidence(
  callSite: { callType?: string; name?: string },
  change: SignatureChange
): number {
  // Factor 1: Call type (40% of confidence)
  const callType = callSite.callType || 'direct';
  const callTypeScore = scoreCallType(callType);
  const callTypeFactor = callTypeScore * 0.4;

  // Factor 2: Change type (40% of confidence)
  let changeTypeMultiplier = 1.0;
  if (change.changeType === 'signature') {
    changeTypeMultiplier = 0.95;
  } else if (change.changeType === 'return') {
    changeTypeMultiplier = 0.80;
  } else if (change.changeType === 'visibility') {
    changeTypeMultiplier = 0.90;
  }
  const changeTypeFactor = changeTypeMultiplier * 0.4;

  // Factor 3: Contextual factors (20% of confidence)
  let contextualFactor = 0.2;

  if (change.changeType === 'signature' && change.details?.diff) {
    const diff = change.details.diff.toLowerCase();

    if (diff.includes('optional') || diff.includes('?')) {
      contextualFactor *= 0.5;
    }

    if (diff.includes('reorder')) {
      contextualFactor *= 1.2;
    }

    if (diff.includes('added') && !diff.includes('optional')) {
      contextualFactor *= 1.1;
    }
  }

  // Sum all factors
  const totalConfidence = callTypeFactor + changeTypeFactor + contextualFactor;

  // Bound the result between 0.3 and 0.99
  return Math.min(0.99, Math.max(0.3, totalConfidence));
}

/**
 * Score a specific type of call
 */
export function scoreCallType(callType: string): number {
  switch (callType) {
    case 'direct':
      return 0.92;
    case 'imported':
      return 0.85;
    case 'dynamic':
      return 0.65;
    case 'proxy':
      return 0.45;
    default:
      return 0.75;
  }
}

/**
 * Adjust confidence score based on contextual factors
 */
export function adjustForContextualFactors(baseScore: number, factors: any[]): number {
  let adjusted = baseScore;

  for (const factor of factors) {
    if (factor.type === 'test_coverage' && factor.value < 0.5) {
      adjusted *= 1.1;
    } else if (factor.type === 'usage_frequency' && factor.value > 10) {
      adjusted *= 1.05;
    }
  }

  return Math.min(0.99, adjusted);
}

/**
 * Calculate overall confidence of the report
 */
export function calculateReportConfidence(changes: any[]): number {
  if (changes.length === 0) return 1.0;

  const totalConfidence = changes.reduce((sum, change) => {
    const callSiteConfidences = change.impactedCallSites.map((cs: any) => cs.confidence);
    const avgCallSiteConfidence =
      callSiteConfidences.length > 0
        ? callSiteConfidences.reduce((a: number, b: number) => a + b, 0) / callSiteConfidences.length
        : 1.0;
    return sum + avgCallSiteConfidence;
  }, 0);

  return totalConfidence / changes.length;
}

/**
 * Determine if a specific call site is compatible with a signature change
 */
export function isCompatibleCall(callSite: any, change: SignatureChange): boolean | null {
  if (change.changeType === 'signature') {
    return false;
  } else if (change.changeType === 'return') {
    return false;
  } else if (change.changeType === 'visibility') {
    return false;
  }

  return null;
}
