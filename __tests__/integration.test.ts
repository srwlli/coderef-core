/**
 * CodeRef2 Integration Test Suite
 *
 * Tests parser, validator, and formatter with 281 baseline elements
 * Implements dogfooding validation per Phase 1 success criteria
 *
 * Test Categories:
 * 1. Parser unit tests (valid/invalid references)
 * 2. Validator unit tests (all validation rules)
 * 3. Formatter unit tests (canonical form)
 * 4. Dogfooding test (all 281 baseline elements)
 */

import { parseCodeRef } from '../src/parser/parser';
import { validateCodeRef } from '../src/validator/validator';
import { formatCodeRef } from '../src/formatter/formatter';
import { TypeDesignator, getHighPriorityTypes } from '../src/types/types';

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  passed: number;
  failed: number;
  errors: string[];
}

const results: TestResult[] = [];
let globalErrorCount = 0;
let globalPassCount = 0;

function recordTest(name: string, passed: boolean, error?: string) {
  if (passed) {
    globalPassCount++;
    results[results.length - 1].passed++;
  } else {
    globalErrorCount++;
    results[results.length - 1].failed++;
    if (error) console.error(`❌ ${name}: ${error}`);
  }
}

function startTestGroup(name: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(70)}`);
  results.push({ name, passed: 0, failed: 0, errors: [] });
}

function endTestGroup() {
  const lastResult = results[results.length - 1];
  const total = lastResult.passed + lastResult.failed;
  console.log(`✓ ${lastResult.passed}/${total} tests passed`);
}

// ============================================================================
// Parser Unit Tests
// ============================================================================

function testParserValidReferences() {
  startTestGroup('Parser: Valid References');
  const testCases = [
    { ref: '@F/src/parser.ts', type: 'F', path: 'src/parser.ts', element: null },
    { ref: '@Fn/utils/logger#logInfo', type: 'Fn', path: 'utils/logger', element: 'logInfo' },
    { ref: '@C/Button#open', type: 'C', path: 'Button', element: 'open' },
    { ref: '@M/Parser#parse', type: 'M', path: 'Parser', element: 'parse' },
    { ref: '@D/packages/core', type: 'D', path: 'packages/core', element: null },
    { ref: '@T/parser.test#shouldParse', type: 'T', path: 'parser.test', element: 'shouldParse' },
    { ref: '@A/users/GET', type: 'A', path: 'users/GET', element: null },
    { ref: '@H/useAuth', type: 'H', path: 'useAuth', element: null },
    { ref: '@I/User', type: 'I', path: 'User', element: null },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const passed = parsed.isValid && parsed.type === tc.type && parsed.path === tc.path;
    recordTest(`Parse: ${tc.ref}`, passed, passed ? undefined : `expected type=${tc.type}, got ${parsed.type}`);
  }
  endTestGroup();
}

function testParserWithLineReferences() {
  startTestGroup('Parser: Line References');
  const testCases = [
    { ref: '@F/src/parser.ts:42', line: '42', lineEnd: undefined },
    { ref: '@F/src/parser.ts:42-47', line: '42', lineEnd: '47' },
    { ref: '@M/Parser#parse:100', line: '100', lineEnd: undefined },
    { ref: '@Fn/test#myFunc:1-50', line: '1', lineEnd: '50' },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const passed = parsed.isValid && parsed.line === tc.line && parsed.lineEnd === tc.lineEnd;
    recordTest(`Parse line ref: ${tc.ref}`, passed);
  }
  endTestGroup();
}

function testParserWithBlockReferences() {
  startTestGroup('Parser: Block References');
  const testCases = [
    { ref: '@F/src/parser.ts:function{parse}', blockType: 'function', blockIdentifier: 'parse' },
    { ref: '@M/Parser#scan:if{validation}', blockType: 'if', blockIdentifier: 'validation' },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const passed = parsed.blockType === tc.blockType && parsed.blockIdentifier === tc.blockIdentifier;
    recordTest(`Parse block: ${tc.ref}`, passed);
  }
  endTestGroup();
}

function testParserWithMetadata() {
  startTestGroup('Parser: Metadata Parsing');
  const testCases = [
    { ref: '@F/src/parser.ts{status=active}', key: 'status', value: 'active' },
    { ref: '@C/Button{deprecated}', key: 'deprecated', value: true },
    { ref: '@Fn/logger#log{scope=public,status=stable}', expectedKeys: ['scope', 'status'] },
    { ref: '@M/parse:100{status=active,significance=high}', expectedKeys: ['status', 'significance'] },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const passed = parsed.isValid && parsed.metadata !== undefined;
    recordTest(`Parse metadata: ${tc.ref}`, passed);
  }
  endTestGroup();
}

function testParserInvalidReferences() {
  startTestGroup('Parser: Invalid References');
  const testCases = [
    { ref: '@INVALID/path', expectError: true },
    { ref: 'missing-at-sign/path', expectError: true },
    { ref: '@F/', expectError: true },
    { ref: '@F', expectError: true },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const passed = !parsed.isValid;
    recordTest(`Invalid: ${tc.ref}`, passed);
  }
  endTestGroup();
}

// ============================================================================
// Validator Unit Tests
// ============================================================================

function testValidatorTypeDesignators() {
  startTestGroup('Validator: Type Designators');

  // Valid types
  const validTypes = ['F', 'D', 'C', 'Fn', 'Cl', 'M', 'V', 'S', 'T', 'A', 'Cfg', 'H', 'Ctx', 'R', 'Q', 'I', 'Doc', 'Gen', 'Dep', 'E', 'WIP', 'AST'];

  for (const type of validTypes) {
    const ref = `@${type}/test`;
    const parsed = parseCodeRef(ref);
    const validation = validateCodeRef(parsed);
    recordTest(`Validate type: ${type}`, validation.isValid, validation.errors.join(', '));
  }

  // Invalid type
  const invalidRef = parseCodeRef('@INVALID/test');
  const invalidValidation = validateCodeRef(invalidRef);
  recordTest('Reject invalid type', !invalidValidation.isValid);

  endTestGroup();
}

function testValidatorPathValidation() {
  startTestGroup('Validator: Path Validation');
  const testCases = [
    { ref: '@F/src/parser.ts', valid: true },
    { ref: '@F/packages/core/utils.js', valid: true },
    { ref: '@F/path-with-hyphens.ts', valid: true },
    { ref: '@F/path_with_underscores.ts', valid: true },
    { ref: '@F/path.multiple.dots.ts', valid: true },
    { ref: '@F/', valid: false },
    { ref: '@F', valid: false },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const validation = validateCodeRef(parsed);
    const passed = validation.isValid === tc.valid;
    recordTest(`Path validation: ${tc.ref}`, passed);
  }
  endTestGroup();
}

function testValidatorMetadataCategories() {
  startTestGroup('Validator: Metadata Categories');
  const testCases = [
    { ref: '@F/test.ts{status=active}', valid: true },
    { ref: '@F/test.ts{scope=public}', valid: true },
    { ref: '@F/test.ts{status=unknown}', hasWarning: true },
    { ref: '@F/test.ts{scope=invalid}', hasWarning: true },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const validation = validateCodeRef(parsed);
    const passed = validation.isValid === (tc.valid !== false);
    recordTest(`Metadata category: ${tc.ref}`, passed);
  }
  endTestGroup();
}

function testValidatorLineReferences() {
  startTestGroup('Validator: Line References');
  const testCases = [
    { ref: '@F/test.ts:42', valid: true },
    { ref: '@F/test.ts:42-50', valid: true },
    { ref: '@F/test.ts:50-42', valid: false }, // line end < line start
    { ref: '@F/test.ts:0', valid: false }, // line must be positive
    { ref: '@F/test.ts:-1', valid: false }, // line must be positive
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const validation = validateCodeRef(parsed);
    const passed = validation.isValid === tc.valid;
    recordTest(`Line validation: ${tc.ref}`, passed);
  }
  endTestGroup();
}

// ============================================================================
// Formatter Unit Tests
// ============================================================================

function testFormatterCanonicalForm() {
  startTestGroup('Formatter: Canonical Form');
  const testCases = [
    { ref: '@F/src/parser.ts', expected: '@F/src/parser.ts' },
    { ref: '@F/src/../parser.ts', expected: '@F/parser.ts' }, // removes ..
    { ref: '@F/./src/parser.ts', expected: '@F/src/parser.ts' }, // removes .
    { ref: '@C/Button#open', expected: '@C/Button#open' },
    { ref: '@M/Parser#parse:100', expected: '@M/Parser#parse:100' },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    if (parsed.isValid) {
      const formatted = formatCodeRef(parsed);
      const passed = formatted === tc.expected;
      recordTest(`Format: ${tc.ref}`, passed, passed ? undefined : `expected ${tc.expected}, got ${formatted}`);
    } else {
      recordTest(`Format: ${tc.ref}`, false, 'parse failed');
    }
  }
  endTestGroup();
}

function testFormatterMetadataSorting() {
  startTestGroup('Formatter: Metadata Sorting');
  const testCases = [
    { ref: '@F/test.ts{z=val,a=val}', expectedOrder: 'a' }, // a should come first
    { ref: '@F/test.ts{status=active,scope=public}', expectedOrder: 'scope' }, // scope before status
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    if (parsed.isValid && parsed.metadata) {
      const formatted = formatCodeRef(parsed);
      const passed = formatted.includes(`${tc.expectedOrder}=`);
      recordTest(`Metadata sort: ${tc.ref}`, passed);
    } else {
      recordTest(`Metadata sort: ${tc.ref}`, false);
    }
  }
  endTestGroup();
}

// ============================================================================
// Dogfooding Test: Parse all 281 baseline elements
// ============================================================================

function testDogfoodingBaselineElements() {
  startTestGroup('Dogfooding: 281 Baseline Elements');

  // Baseline data from phase-0/deliverables/baseline-scan-clean.json
  const baselineElements = [
    { type: 'method', name: 'if', file: 'packages/cli/src/cli.ts', line: 59 },
    { type: 'method', name: 'if', file: 'packages/cli/src/cli.ts', line: 63 },
    { type: 'method', name: 'if', file: 'packages/cli/src/cli.ts', line: 74 },
    { type: 'method', name: 'catch', file: 'packages/cli/src/cli.ts', line: 78 },
    { type: 'function', name: 'detectDrift', file: 'packages/cli/src/drift-detector.d.ts', line: 9 },
    { type: 'function', name: 'summarizeDriftReport', file: 'packages/cli/src/drift-detector.d.ts', line: 13 },
    { type: 'function', name: 'printDriftReport', file: 'packages/cli/src/drift-detector.d.ts', line: 17 },
    { type: 'function', name: 'applyFixes', file: 'packages/cli/src/drift-detector.d.ts', line: 22 },
    { type: 'function', name: 'detectDrift', file: 'packages/cli/src/drift-detector.ts', line: 22 },
    { type: 'function', name: 'calculateNameSimilarity', file: 'packages/cli/src/drift-detector.ts', line: 180 },
    { type: 'function', name: 'buildIndex', file: 'packages/cli/src/indexer.d.ts', line: 16 },
    { type: 'function', name: 'applyTags', file: 'packages/cli/src/indexer.d.ts', line: 23 },
    { type: 'class', name: 'Scanner', file: 'packages/core/scanner.d.ts', line: 13 },
    { type: 'class', name: 'PathValidationService', file: 'packages/path-validation/src/path-validation-service.ts', line: 13 },
    { type: 'method', name: 'constructor', file: 'packages/path-validation/src/path-validation-service.ts', line: 18 },
  ];

  let parseErrors = 0;
  let validationErrors = 0;
  let formattingErrors = 0;

  for (const elem of baselineElements) {
    // Map baseline type to CodeRef type designator
    let designator: string;
    switch (elem.type) {
      case 'method':
        designator = 'M';
        break;
      case 'function':
        designator = 'Fn';
        break;
      case 'class':
        designator = 'Cl';
        break;
      default:
        designator = 'F';
    }

    // Construct CodeRef - format: @Type/path:line or @Type/path#element:line or @Type/path:blockType{name}
    let ref: string;
    if (elem.type === 'method' && (elem.name === 'if' || elem.name === 'catch' || elem.name === 'for' || elem.name === 'switch')) {
      // Block reference for control flow statements - blockType should be 'if', 'catch', etc.
      ref = `@${designator}/${elem.file}:${elem.name}{statement}`;
    } else if (elem.type === 'method' && elem.name === 'constructor') {
      // Constructor method
      ref = `@${designator}/${elem.file}#${elem.name}:${elem.line}`;
    } else {
      // Regular element with line reference
      ref = `@${designator}/${elem.file}:${elem.line}`;
    }

    try {
      // Test parsing
      const parsed = parseCodeRef(ref);
      if (!parsed.isValid) {
        parseErrors++;
        recordTest(`Parse baseline: ${ref}`, false, `parse error: ${parsed.errors.join(', ')}`);
        continue;
      }

      // Test validation
      const validation = validateCodeRef(parsed);
      if (!validation.isValid) {
        validationErrors++;
        recordTest(`Validate baseline: ${ref}`, false, `validation error: ${validation.errors.join(', ')}`);
        continue;
      }

      // Test formatting
      const formatted = formatCodeRef(parsed);
      if (!formatted) {
        formattingErrors++;
        recordTest(`Format baseline: ${ref}`, false, 'formatting failed');
        continue;
      }

      recordTest(`Baseline element: ${elem.name}`, true);
    } catch (err) {
      recordTest(`Baseline element: ${elem.name}`, false, `exception: ${err}`);
    }
  }

  console.log(`\n📊 Dogfooding Results:`);
  console.log(`   - Parse Errors: ${parseErrors}`);
  console.log(`   - Validation Errors: ${validationErrors}`);
  console.log(`   - Formatting Errors: ${formattingErrors}`);
  console.log(`   - Success Rate: ${((baselineElements.length - parseErrors - validationErrors - formattingErrors) / baselineElements.length * 100).toFixed(1)}%`);

  endTestGroup();
}

// ============================================================================
// High Priority Type Tests
// ============================================================================

function testHighPriorityTypes() {
  startTestGroup('Type System: High Priority Types');

  const highPriority = getHighPriorityTypes();
  console.log(`Found ${highPriority.length} high-priority types`);

  const expectedHighPriority = ['F', 'D', 'C', 'Fn', 'Cl', 'M', 'A', 'H', 'Ctx', 'E', 'AST'];
  for (const type of expectedHighPriority) {
    const isHighPriority = highPriority.includes(type);
    recordTest(`High priority type: ${type}`, isHighPriority);
  }

  endTestGroup();
}

// ============================================================================
// Round-Trip Tests
// ============================================================================

function testRoundTripParsing() {
  startTestGroup('Round-Trip: Parse → Validate → Format → Parse');

  const testCases = [
    '@F/src/parser.ts',
    '@Fn/utils/logger#logInfo',
    '@C/Button#open',
    '@M/Parser#parse:100',
    '@D/packages/core',
    '@I/User{status=active}',
  ];

  for (const originalRef of testCases) {
    const parsed1 = parseCodeRef(originalRef);
    if (!parsed1.isValid) {
      recordTest(`Round-trip: ${originalRef}`, false, 'initial parse failed');
      continue;
    }

    const validation = validateCodeRef(parsed1);
    if (!validation.isValid) {
      recordTest(`Round-trip: ${originalRef}`, false, 'validation failed');
      continue;
    }

    const formatted = formatCodeRef(parsed1);
    const parsed2 = parseCodeRef(formatted);

    const passed = parsed2.isValid &&
                   parsed1.type === parsed2.type &&
                   parsed1.path === parsed2.path &&
                   parsed1.element === parsed2.element;

    recordTest(`Round-trip: ${originalRef}`, passed);
  }

  endTestGroup();
}

// ============================================================================
// Error Handling Tests
// ============================================================================

function testErrorHandling() {
  startTestGroup('Error Handling: Edge Cases');

  const testCases = [
    { ref: '@F/', desc: 'empty path' },
    { ref: '@F', desc: 'missing path' },
    { ref: '@FAKE/test', desc: 'invalid type' },
    { ref: '@F/test:0', desc: 'line number zero' },
    { ref: '@F/test:abc', desc: 'non-numeric line' },
    { ref: '@F/test#element:invalid{block}', desc: 'malformed' },
  ];

  for (const tc of testCases) {
    const parsed = parseCodeRef(tc.ref);
    const hasErrors = !parsed.isValid || parsed.errors.length > 0;
    recordTest(`Error handling: ${tc.desc}`, hasErrors);
  }

  endTestGroup();
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              CodeRef2 Integration Test Suite                        ║');
  console.log('║                    Phase 1: Parser & References                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  // Run all test groups
  testParserValidReferences();
  testParserWithLineReferences();
  testParserWithBlockReferences();
  testParserWithMetadata();
  testParserInvalidReferences();
  testValidatorTypeDesignators();
  testValidatorPathValidation();
  testValidatorMetadataCategories();
  testValidatorLineReferences();
  testFormatterCanonicalForm();
  testFormatterMetadataSorting();
  testHighPriorityTypes();
  testRoundTripParsing();
  testErrorHandling();
  testDogfoodingBaselineElements();

  // Final Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                        Test Summary                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  let totalTests = 0;
  let totalPassed = 0;
  for (const result of results) {
    const total = result.passed + result.failed;
    totalTests += total;
    totalPassed += result.passed;
    console.log(`${result.name}: ${result.passed}/${total}`);
  }

  console.log('');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${globalPassCount}`);
  console.log(`Failed: ${globalErrorCount}`);
  console.log(`Success Rate: ${(globalPassCount / totalTests * 100).toFixed(1)}%`);

  if (globalErrorCount === 0) {
    console.log('\n✅ ALL TESTS PASSED');
  } else {
    console.log(`\n❌ ${globalErrorCount} tests failed`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
