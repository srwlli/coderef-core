/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability analyzer-build-call-edges
 * @exports buildCallEdges, analyzeCallPatterns
 * @used_by src/analyzer/js-call-detector/index.ts
 */

/**
 * IMP-CORE-035: JavaScript Call Graph Analyzer
 * Builds call edges and analyzes patterns
 */



import { CallExpression, CallEdge, CallPatternAnalysis } from './types.js';

/**
 * Build call relationship edges from detected calls.
 *
 * Takes precomputed per-file calls data rather than a detector object: the
 * caller (JSCallDetector.buildCallEdges) runs detection and passes the
 * results, keeping this module free of any coupling back to the detector.
 */
export function buildCallEdges(
  callsByFile: Map<string, CallExpression[]>,
  elementMap?: Map<string, { file: string; type: string }>
): CallEdge[] {
  const edges: CallEdge[] = [];
  const edgeMap = new Map<string, CallEdge>();

  for (const [filePath, calls] of callsByFile) {
    for (const call of calls) {
      // Map callee function to element
      const calleeIdentifier = call.calleeObject
        ? `${call.calleeObject}.${call.calleeFunction}`
        : call.calleeFunction;

      // Find target file if elementMap provided
      let targetFile = call.calleeFunction;
      if (elementMap) {
        const element = elementMap.get(calleeIdentifier);
        if (element) {
          targetFile = element.file;
        }
      }

      const edgeKey = `${filePath} -> ${targetFile}`;

      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          sourceFile: filePath,
          targetFile,
          calls: [],
          edgeType: 'calls',
        });
      }

      edgeMap.get(edgeKey)!.calls.push(call);
    }
  }

  return Array.from(edgeMap.values());
}

/**
 * Analyze call frequency and patterns from precomputed per-file calls data.
 */
export function analyzeCallPatterns(
  callsByFile: Map<string, CallExpression[]>
): CallPatternAnalysis {
  let totalCalls = 0;
  const uniqueFunctions = new Set<string>();
  let methodCalls = 0;
  let constructorCalls = 0;
  let asyncCalls = 0;
  let nestedCalls = 0;

  for (const [, calls] of callsByFile) {
    for (const call of calls) {
      totalCalls++;
      uniqueFunctions.add(call.calleeFunction);

      if (call.callType === 'method') methodCalls++;
      if (call.callType === 'constructor') constructorCalls++;
      if (call.isAsync) asyncCalls++;
      if (call.isNested) nestedCalls++;
    }
  }

  return {
    totalCalls,
    uniqueFunctions,
    methodCalls,
    constructorCalls,
    asyncCalls,
    nestedCalls,
  };
}
