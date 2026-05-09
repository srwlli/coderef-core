/**
 * IMP-CORE-035: Signature Comparator
 * Compares function signatures and detects incompatibilities
 */

/**
 * @semantic
 * exports: [compareSignatures, compareParameters, isBreakingChange, analyzeDifference]
 * used_by: [src/context/breaking-change-detector/index.ts]
 */

import { SignatureChange, ParameterDiff } from './types.js';

/**
 * Compare two function signatures and detect incompatibilities
 */
export function compareSignatures(before: any, after: any): SignatureChange | null {
  const beforeInfo = {
    params: before.params || [],
    returnType: before.returnType || 'void',
    isExported: before.isExported || false,
    name: before.name,
    file: before.file,
    line: before.line,
    coderefTag: before.coderefTag,
    kind: before.kind,
  };

  const afterInfo = {
    params: after.params || [],
    returnType: after.returnType || 'void',
    isExported: after.isExported || false,
  };

  // Check parameter changes
  const paramDiff = compareParameters(beforeInfo.params, afterInfo.params);
  if (paramDiff) {
    return {
      element: {
        name: beforeInfo.name,
        kind: beforeInfo.kind,
        file: beforeInfo.file,
        line: beforeInfo.line,
        coderefTag: beforeInfo.coderefTag,
      },
      changeType: 'signature',
      severity: 'medium',
      details: {
        before: `params: ${JSON.stringify(beforeInfo.params)}`,
        after: `params: ${JSON.stringify(afterInfo.params)}`,
        diff: paramDiff.description,
      },
    };
  }

  // Check return type changes
  if (beforeInfo.returnType !== afterInfo.returnType) {
    return {
      element: {
        name: beforeInfo.name,
        kind: beforeInfo.kind,
        file: beforeInfo.file,
        line: beforeInfo.line,
        coderefTag: beforeInfo.coderefTag,
      },
      changeType: 'return',
      severity: 'medium',
      details: {
        before: beforeInfo.returnType,
        after: afterInfo.returnType,
        diff: `return type changed from ${beforeInfo.returnType} to ${afterInfo.returnType}`,
      },
    };
  }

  // Check visibility changes (exported -> not exported)
  if (beforeInfo.isExported && !afterInfo.isExported) {
    return {
      element: {
        name: beforeInfo.name,
        kind: beforeInfo.kind,
        file: beforeInfo.file,
        line: beforeInfo.line,
        coderefTag: beforeInfo.coderefTag,
      },
      changeType: 'visibility',
      severity: 'high',
      details: {
        before: 'exported',
        after: 'not exported',
        diff: 'element is no longer exported (public API changed)',
      },
    };
  }

  return null;
}

/**
 * Compare parameter lists and detect incompatibilities
 */
export function compareParameters(
  beforeParams: any[],
  afterParams: any[]
): ParameterDiff | null {
  // Required parameter added (breaking if not optional)
  if (afterParams.length > beforeParams.length) {
    const newParams = afterParams.slice(beforeParams.length);
    const hasRequired = newParams.some((p: any) => !p.optional);
    if (hasRequired) {
      return {
        description: `Required parameter(s) added: ${newParams.map((p: any) => p.name).join(', ')}`,
        type: 'added',
      };
    }
  }

  // Parameter removed (breaking - callers might pass it)
  if (afterParams.length < beforeParams.length) {
    const removedParams = beforeParams.slice(afterParams.length);
    return {
      description: `Parameter(s) removed: ${removedParams.map((p: any) => p.name).join(', ')}`,
      type: 'removed',
    };
  }

  // Check parameter reordering
  for (let i = 0; i < beforeParams.length; i++) {
    if (beforeParams[i].name !== afterParams[i].name) {
      return {
        description: `Parameters reordered. Before: ${beforeParams.map((p: any) => p.name).join(', ')}. After: ${afterParams.map((p: any) => p.name).join(', ')}`,
        type: 'reordered',
      };
    }
  }

  // Check parameter type changes
  for (let i = 0; i < beforeParams.length; i++) {
    if (beforeParams[i].type !== afterParams[i].type) {
      return {
        description: `Parameter ${beforeParams[i].name} type changed from ${beforeParams[i].type} to ${afterParams[i].type}`,
        type: 'type-changed',
      };
    }
  }

  return null;
}

/**
 * Determine if a signature change is breaking
 */
export function isBreakingChange(change: SignatureChange): boolean {
  // All detected changes from compareSignatures are breaking by definition
  return true;
}

/**
 * Analyze differences between before/after values
 */
export function analyzeDifference(before: any, after: any): any {
  if (JSON.stringify(before) === JSON.stringify(after)) {
    return null;
  }

  return {
    before,
    after,
    changed: true,
  };
}
