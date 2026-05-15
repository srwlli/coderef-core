/**
 * @coderef-semantic: 1.0.0
 * @exports HeaderImportFact, HeaderParseError, HeaderFact
 * @used_by src/pipeline/extractors/relationship-extractor.ts, src/pipeline/semantic-header-parser.ts, src/pipeline/types.ts, src/semantic/projections.ts, src/types/types.ts, __tests__/pipeline/header-import-facts-cardinality.test.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts
 */




  version?: string;
  /** All parse / validation errors detected for this file's header. */
  parseErrors?: HeaderParseError[];
}
