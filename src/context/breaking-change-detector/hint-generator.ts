/**
 * IMP-CORE-035: Migration Hint Generator
 * Generates migration strategies for breaking changes
 */

import { SignatureChange, ImpactedCallSite, MigrationHint } from './types.js';

/**
 * Generate migration hints for fixing a breaking change
 */
export function generateMigrationHints(
  change: SignatureChange,
  callSites: ImpactedCallSite[]
): MigrationHint[] {
  const hints: MigrationHint[] = [];

  if (change.changeType === 'signature') {
    const callSiteCount = callSites.length;

    // For many call sites, wrap pattern is safest
    if (callSiteCount > 10) {
      hints.push(suggestWrapPattern(change));
      hints.push(suggestAdapterPattern(change));
    } else if (callSiteCount >= 5) {
      hints.push(suggestDefaultParamPattern(change));
      hints.push(suggestWrapPattern(change));
    } else {
      hints.push(suggestRenamePattern(change));
      hints.push(suggestWrapPattern(change));
    }

    // For complex signature changes, suggest options object
    if (callSites.length > 0 && callSites[0].callContext?.includes(',')) {
      hints.push(suggestOptionsObjectPattern(change));
    }
  } else if (change.changeType === 'visibility') {
    hints.push(suggestWrapPattern(change));
    hints.push(suggestRenamePattern(change));
  } else if (change.changeType === 'return') {
    hints.push(suggestAdapterPattern(change));
    hints.push(suggestWrapPattern(change));
  }

  return hints;
}

/**
 * Suggest wrap pattern (create new function alongside old)
 */
export function suggestWrapPattern(change: SignatureChange): MigrationHint {
  const name = change.element.name;
  return {
    hintType: 'wrap',
    text: `Create a new version alongside the old one. Keep old ${name}() working, add new ${name}New() or ${name}Async() with new signature.`,
    confidence: 0.9,
    codeExample: `// Keep old version\nfunction ${name}() { /* original implementation */ }\n\n// Add new version\nfunction ${name}New() { /* new implementation */ }`,
  };
}

/**
 * Suggest rename pattern (create alias for backward compatibility)
 */
export function suggestRenamePattern(change: SignatureChange): MigrationHint {
  const name = change.element.name;
  return {
    hintType: 'rename',
    text: `Create an alias to maintain backward compatibility. Update ${name}() implementation, export as ${name}Compat() or ${name}Legacy().`,
    confidence: 0.8,
    codeExample: `// Export with new name for compatibility\nexport function ${name}() { /* new implementation */ }\nexport const ${name}Compat = ${name}; // Alias for backward compat`,
  };
}

/**
 * Suggest adapter pattern (create wrapper)
 */
export function suggestAdapterPattern(change: SignatureChange): MigrationHint {
  const name = change.element.name;
  return {
    hintType: 'adapter',
    text: `Create an adapter that translates old calls to new signature. Useful for gradual migration.`,
    confidence: 0.75,
    codeExample: `// Adapter function\nfunction ${name}Adapter(oldArgs) {\n  const newArgs = transform(oldArgs);\n  return ${name}(newArgs);\n}`,
  };
}

/**
 * Suggest default parameter pattern
 */
export function suggestDefaultParamPattern(change: SignatureChange): MigrationHint {
  const name = change.element.name;
  return {
    hintType: 'defaultParam',
    text: `Add default parameter values for new required parameters. This allows existing code to work without changes.`,
    confidence: 0.85,
    codeExample: `// Updated signature with defaults\nfunction ${name}(a: string, b: string = 'default') {\n  // implementation\n}`,
  };
}

/**
 * Suggest options object pattern
 */
export function suggestOptionsObjectPattern(change: SignatureChange): MigrationHint {
  const name = change.element.name;
  return {
    hintType: 'optionsObject',
    text: `Convert multiple parameters to an options object. More flexible and easier to extend in the future.`,
    confidence: 0.8,
    codeExample: `// Before: function ${name}(a, b, c) { }\n// After:\ninterface ${name}Options { a: string; b?: string; c?: string; }\nfunction ${name}(opts: ${name}Options) { }`,
  };
}
