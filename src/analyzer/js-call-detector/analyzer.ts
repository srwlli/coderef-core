/**
 * IMP-CORE-035: JavaScript Call Graph Analyzer
 * Builds call edges and analyzes patterns
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports buildCallEdges, analyzeCallPatterns
 * @used_by src/analyzer/js-call-detector/index.ts
 */

import { CallExpression, CallEdge, CallPatternAnalysis } from './types.js';

/**
 * Build call relationship edges from detected calls
 */
export function buildCallEdges(
  filePaths: string[],
  callDetector: { detectCalls(filePath: string): CallExpression[] },
  elementMap?: Map<string, { file: string; type: string }>
): CallEdge[] {
  const edges: CallEdge[] = [];
  const edgeMap = new Map<string, CallEdge>();

  for (const filePath of filePaths) {
    const calls = callDetector.detectCalls(filePath);

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
 * Analyze call frequency and patterns
 */
export function analyzeCallPatterns(
  filePaths: string[],
  callDetector: { detectCalls(filePath: string): CallExpression[] }
): CallPatternAnalysis {
  let totalCalls = 0;
  const uniqueFunctions = new Set<string>();
  let methodCalls = 0;
  let constructorCalls = 0;
  let asyncCalls = 0;
  let nestedCalls = 0;

  for (const filePath of filePaths) {
    const calls = callDetector.detectCalls(filePath);

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
