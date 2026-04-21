/**
 * IMP-CORE-035: Diff Analyzer
 * Finds impacted call sites and extracts call context
 */

import { SignatureChange, ImpactedCallSite } from './types.js';
import { calculateConfidence, isCompatibleCall } from './impact-assessor.js';

/**
 * Find all call sites that will be affected by a signature change
 */
export async function findImpactedCallSites(
  element: any,
  change: SignatureChange,
  analyzerService: { getDependents(elementName: string): Promise<Array<{ name: string; file: string; line: number }>> }
): Promise<ImpactedCallSite[]> {
  const impactedSites: ImpactedCallSite[] = [];

  try {
    // Get all callers from dependency graph
    const callers = await analyzerService.getDependents(element.name);

    if (!callers || callers.length === 0) {
      return impactedSites;
    }

    for (const caller of callers) {
      try {
        // Extract call context at caller location
        const callContext = extractCallContext(caller.file, caller.line);
        if (!callContext) continue;

        // Check if this call will be affected by the change
        const isImpacted = isCompatibleCall(caller, change);
        if (isImpacted === null) {
          continue;
        }

        // Calculate confidence this call will break
        const confidence = calculateConfidence(
          { ...callContext, name: caller.name },
          change
        );

        impactedSites.push({
          file: caller.file,
          line: caller.line,
          callerElement: caller.name || 'unknown',
          callContext: callContext.context || '',
          confidence,
          callType: callContext.type,
        });
      } catch (err) {
        console.debug(
          `Failed to analyze call site at ${caller.file}:${caller.line}: ${err}`
        );
        continue;
      }
    }

    return impactedSites;
  } catch (error) {
    console.warn(`Failed to find impacted call sites for ${element.name}: ${error}`);
    return [];
  }
}

/**
 * Extract the actual call context at a specific location
 */
export function extractCallContext(
  file: string,
  line: number
): { context: string; type: 'direct' | 'imported' | 'dynamic' | 'proxy' } | null {
  const fs = require('fs');

  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    if (line < 1 || line > lines.length) {
      return null;
    }

    // Get code context
    const contextStart = Math.max(0, line - 2);
    const contextEnd = Math.min(lines.length, line + 1);
    const codeSnippet = lines.slice(contextStart, contextEnd).join('\n').trim();

    // Determine call type based on code pattern
    const callLine = lines[line - 1] || '';
    let callType: 'direct' | 'imported' | 'dynamic' | 'proxy' = 'direct';

    if (callLine.includes('[') && callLine.includes(']')) {
      callType = 'dynamic';
    } else if (callLine.includes('?.')) {
      callType = 'proxy';
    } else if (
      callLine.includes('new Proxy') ||
      callLine.includes('jest.mock') ||
      callLine.includes('sinon.stub')
    ) {
      callType = 'proxy';
    }

    return {
      context: codeSnippet,
      type: callType,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get all changed elements between two refs
 * Uses git diff to identify changed files, then scans for elements
 */
export async function getChangedElements(
  baseRef: string,
  headRef?: string
): Promise<Array<{ name: string; file: string; type: string; line: number }>> {
  // Placeholder implementation - would integrate with git and scanner
  console.log(`Getting changed elements between ${baseRef} and ${headRef || 'worktree'}`);
  return [];
}

/**
 * Extract signatures from a git ref
 */
export async function extractSignaturesFromRef(
  ref: string,
  filePath: string
): Promise<Map<string, any>> {
  // Placeholder implementation
  console.log(`Extracting signatures from ${ref}:${filePath}`);
  return new Map();
}

/**
 * Extract signatures from worktree
 */
export async function extractSignaturesFromWorktree(
  filePath: string
): Promise<Map<string, any>> {
  // Placeholder implementation
  console.log(`Extracting signatures from worktree:${filePath}`);
  return new Map();
}
