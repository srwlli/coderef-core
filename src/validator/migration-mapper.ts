/**
 * @coderef-semantic: 1.0.0
 * @exports validateMigrationConfig, checkRequiredFields, validateRegexPatterns, detectPathConflicts, checkDeprecatedAddedOverlap, applyExplicitMapping, applyPatternMapping, applyMappings, calculateMigrationCoverage, findUnmappedCalls, findDeprecatedCalls, groupCoverageByApiPrefix, SemanticParameterMapping, SemanticParameterMapper
 * @used_by src/validator/frontend-update-generator.ts, src/validator/route-validator.ts
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports validateMigrationConfig, checkRequiredFields, validateRegexPatterns, detectPathConflicts, checkDeprecatedAddedOverlap, applyExplicitMapping, applyPatternMapping, applyMappings, calculateMigrationCoverage, findUnmappedCalls, findDeprecatedCalls, groupCoverageByApiPrefix, SemanticParameterMapping, SemanticParameterMapper
 * @used_by src/validator/frontend-update-generator.ts, src/validator/route-validator.ts
 */



/**
 * WO-MIGRATION-VALIDATION-001: Migration Mapper
 * Handles migration config validation and path transformation
 */

import type { MigrationMapping } from '../types/types.js';

/**
 * Validate migration config structure and detect issues
 *
 * @param config - Migration mapping configuration
 * @returns Validation result with errors array
 *
 * @example
 * const config = { version: "1.0.0", name: "v1→v2", mappings: {...} };
 * const result = validateMigrationConfig(config);
 * if (!result.valid) {
 *   console.error("Config errors:", result.errors);
 * }
 */
export function validateMigrationConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  const requiredFieldErrors = checkRequiredFields(config);
  errors.push(...requiredFieldErrors);

  // Validate regex patterns
  if (config.mappings?.patterns) {
    const regexErrors = validateRegexPatterns(config.mappings.patterns);
    errors.push(...regexErrors);
  }

  // Detect path conflicts
  if (config.mappings?.paths) {
    const conflictErrors = detectPathConflicts(config.mappings.paths);
    errors.push(...conflictErrors);
  }

  // Check deprecated/added overlap
  if (config.mappings?.deprecated && config.mappings?.added) {
    const overlapErrors = checkDeprecatedAddedOverlap(
      config.mappings.deprecated,
      config.mappings.added
    );
    errors.push(...overlapErrors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check that all required fields are present
 */
export function checkRequiredFields(config: any): string[] {
  const errors: string[] = [];

  if (!config.version) {
    errors.push('Missing required field: version');
  }

  if (!config.name) {
    errors.push('Missing required field: name');
  }

  if (!config.mappings) {
    errors.push('Missing required field: mappings');
  }

  if (!config.metadata) {
    errors.push('Missing required field: metadata');
  } else {
    if (!config.metadata.source) {
      errors.push('Missing required field: metadata.source');
    }
    if (!config.metadata.target) {
      errors.push('Missing required field: metadata.target');
    }
  }

  return errors;
}

/**
 * Validate that all regex patterns are valid
 */
export function validateRegexPatterns(patterns: Array<{ find: string; replace: string }>): string[] {
  const errors: string[] = [];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];

    if (!pattern.find) {
      errors.push(`Pattern ${i}: missing 'find' field`);
      continue;
    }

    if (!pattern.replace) {
      errors.push(`Pattern ${i}: missing 'replace' field`);
      continue;
    }

    // Test if regex is valid
    try {
      new RegExp(pattern.find);
    } catch (error) {
      errors.push(`Pattern ${i}: invalid regex '${pattern.find}' - ${error}`);
    }
  }

  return errors;
}

/**
 * Detect duplicate path mappings (same old path maps to multiple new paths)
 */
export function detectPathConflicts(paths: Record<string, string>): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const [oldPath, newPath] of Object.entries(paths)) {
    if (seen.has(oldPath)) {
      errors.push(`Duplicate mapping for path: ${oldPath}`);
    }
    seen.add(oldPath);

    if (!newPath) {
      errors.push(`Empty target path for: ${oldPath}`);
    }
  }

  return errors;
}

/**
 * Check that deprecated and added arrays don't overlap
 */
export function checkDeprecatedAddedOverlap(
  deprecated: string[],
  added: string[]
): string[] {
  const errors: string[] = [];

  const deprecatedSet = new Set(deprecated);
  const addedSet = new Set(added);

  for (const path of deprecated) {
    if (addedSet.has(path)) {
      errors.push(`Path appears in both deprecated and added: ${path}`);
    }
  }

  return errors;
}

/**
 * Apply explicit path mapping (1:1 dictionary lookup)
 *
 * @param path - Original path to transform
 * @param mappings - Path mappings dictionary
 * @returns Transformed path or null if no mapping found
 *
 * @example
 * const result = applyExplicitMapping('/api/v1/users', { '/api/v1/users': '/api/v2/users' });
 * // Returns: '/api/v2/users'
 */
export function applyExplicitMapping(
  path: string,
  mappings: Record<string, string>
): string | null {
  return mappings[path] || null;
}

/**
 * Apply pattern-based mapping (regex find/replace)
 *
 * @param path - Original path to transform
 * @param patterns - Array of regex patterns
 * @returns Transformed path or null if no pattern matches
 *
 * @example
 * const patterns = [{ find: '^/api/v1/(.*)', replace: '/api/v2/$1' }];
 * const result = applyPatternMapping('/api/v1/users', patterns);
 * // Returns: '/api/v2/users'
 */
export function applyPatternMapping(
  path: string,
  patterns: Array<{ find: string; replace: string }>
): string | null {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.find);
      if (regex.test(path)) {
        return path.replace(regex, pattern.replace);
      }
    } catch (error) {
      // Skip malformed patterns (already caught in validation)
      continue;
    }
  }
  return null;
}

/**
 * Apply migration mappings to a path with priority: explicit > pattern > unmapped
 *
 * @param path - Original path to transform
 * @param config - Migration configuration
 * @returns Transformation result with confidence score
 *
 * @example
 * const config = {
 *   mappings: {
 *     paths: { '/api/upload': '/api/v2/files/upload' },
 *     patterns: [{ find: '^/api/v1/(.*)', replace: '/api/v2/$1' }]
 *   }
 * };
 * const result = applyMappings('/api/v1/users', config);
 * // Returns: { originalPath: '/api/v1/users', transformedPath: '/api/v2/users', confidence: 80, mappingRule: 'pattern' }
 */
export function applyMappings(
  path: string,
  config: MigrationMapping
): {
  originalPath: string;
  transformedPath: string;
  confidence: number;
  mappingRule: 'explicit' | 'pattern' | 'unmapped';
} {
  // Try explicit mapping first (highest confidence)
  if (config.mappings.paths) {
    const explicitResult = applyExplicitMapping(path, config.mappings.paths);
    if (explicitResult) {
      return {
        originalPath: path,
        transformedPath: explicitResult,
        confidence: 100,
        mappingRule: 'explicit'
      };
    }
  }

  // Try pattern-based mapping (medium confidence)
  if (config.mappings.patterns) {
    const patternResult = applyPatternMapping(path, config.mappings.patterns);
    if (patternResult) {
      return {
        originalPath: path,
        transformedPath: patternResult,
        confidence: 80,
        mappingRule: 'pattern'
      };
    }
  }

  // No mapping found (unmapped)
  return {
    originalPath: path,
    transformedPath: path, // Keep original
    confidence: 0,
    mappingRule: 'unmapped'
  };
}

/**
 * Calculate migration coverage metrics
 *
 * @param oldRoutes - Routes from old system
 * @param newRoutes - Routes from new system
 * @param transformations - Transformation results for each route
 * @returns Coverage metrics
 *
 * @example
 * const coverage = calculateMigrationCoverage(oldRoutes, newRoutes, transformations);
 * console.log(`Migration coverage: ${coverage.coverage}%`);
 */
export function calculateMigrationCoverage(
  oldRoutes: Array<{ path: string }>,
  newRoutes: Array<{ path: string }>,
  transformations: Array<{ confidence: number }>
): import('../types/types.js').MigrationCoverage {
  const totalOldRoutes = oldRoutes.length;
  const totalNewRoutes = newRoutes.length;

  // Count routes with successful transformations (confidence > 0)
  const migratedRoutes = transformations.filter(t => t.confidence > 0).length;

  // Count newly added routes (in new but not old)
  const oldPaths = new Set(oldRoutes.map(r => r.path));
  const newlyAddedRoutes = newRoutes.filter(r => !oldPaths.has(r.path)).length;

  // Calculate coverage percentage
  const coverage = totalOldRoutes > 0 ? (migratedRoutes / totalOldRoutes) * 100 : 100;

  return {
    totalOldRoutes,
    totalNewRoutes,
    migratedRoutes,
    newlyAddedRoutes,
    coverage: Math.round(coverage * 10) / 10 // Round to 1 decimal
  };
}

/**
 * Find frontend calls with no mapping rule (unmapped)
 *
 * @param calls - Frontend calls
 * @param transformations - Transformation results
 * @returns Unmapped frontend calls
 */
export function findUnmappedCalls(
  calls: Array<any>,
  transformations: Array<{ confidence: number; mappingRule: string }>
): Array<any> {
  return calls.filter((call, index) => {
    const transformation = transformations[index];
    return transformation && transformation.confidence === 0;
  });
}

/**
 * Find frontend calls to deprecated routes
 *
 * @param calls - Frontend calls
 * @param deprecatedRoutes - List of deprecated route paths
 * @returns Calls to deprecated routes
 */
export function findDeprecatedCalls(
  calls: Array<{ path: string }>,
  deprecatedRoutes: string[]
): Array<{ path: string }> {
  const deprecatedSet = new Set(deprecatedRoutes);
  return calls.filter(call => deprecatedSet.has(call.path));
}

/**
 * Group coverage by API prefix (/api/users, /api/posts, etc.)
 *
 * @param transformations - Transformation results with paths
 * @returns Coverage grouped by API prefix
 */
export function groupCoverageByApiPrefix(
  transformations: Array<{ originalPath: string; confidence: number }>
): Record<string, { total: number; migrated: number; coverage: number }> {
  const groups: Record<string, { paths: string[]; migrated: number }> = {};

  // Group by prefix (first two path segments, e.g., /api/users)
  for (const transformation of transformations) {
    const parts = transformation.originalPath.split('/').filter(Boolean);
    const prefix = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : transformation.originalPath;

    if (!groups[prefix]) {
      groups[prefix] = { paths: [], migrated: 0 };
    }

    groups[prefix].paths.push(transformation.originalPath);
    if (transformation.confidence > 0) {
      groups[prefix].migrated++;
    }
  }

  // Calculate coverage for each group
  const result: Record<string, { total: number; migrated: number; coverage: number }> = {};
  for (const [prefix, data] of Object.entries(groups)) {
    const total = data.paths.length;
    const migrated = data.migrated;
    const coverage = total > 0 ? (migrated / total) * 100 : 0;

    result[prefix] = {
      total,
      migrated,
      coverage: Math.round(coverage * 10) / 10
    };
  }

  return result;
}

// ============================================================================
// SEMANTIC PARAMETER MAPPING (IMP-CORE-040)
// ============================================================================

/**
 * Semantic parameter mapping definition
 */
export interface SemanticParameterMapping {
  parameterName: string;
  location: 'path' | 'query' | 'body' | 'header';
  source: {
    framework: string;
    type: string;
    pattern?: string;
    validation?: {
      min?: number;
      max?: number;
      regex?: string;
      required?: boolean;
    };
  };
  target: {
    framework: string;
    type: string;
    pydanticSchema?: string;
    validation?: {
      ge?: number;
      le?: number;
      min_length?: number;
      max_length?: number;
      pattern?: string;
      description?: string;
    };
  };
  conversionNotes?: string;
}

/**
 * Map of type converters between frameworks
 */
const TYPE_CONVERTERS: Record<string, Record<string, string>> = {
  flask: {
    int: 'int',
    string: 'str',
    float: 'float',
    uuid: 'UUID',
    path: 'path'
  },
  express: {
    string: 'string',
    int: 'number',
    float: 'number',
    uuid: 'string'
  },
  fastapi: {
    int: 'int',
    string: 'str',
    float: 'float',
    uuid: 'UUID',
    Path: 'Path',
    Query: 'Query',
    Body: 'Body'
  },
  nestjs: {
    string: 'string',
    int: 'number',
    float: 'number',
    uuid: 'string'
  }
};

/**
 * Pydantic schema mappings for common types
 */
const PYDANTIC_SCHEMAS: Record<string, string> = {
  int: 'int',
  string: 'str',
  float: 'float',
  uuid: 'UUID',
  PositiveInt: 'PositiveInt',
  NonNegativeInt: 'NonNegativeInt',
  EmailStr: 'EmailStr',
  HttpUrl: 'HttpUrl'
};

/**
 * Semantic parameter mapper for framework migrations
 * Handles type conversions, validation mapping, and location mapping
 *
 * @example
 * const mapper = new SemanticParameterMapper(flaskToFastApiMappings);
 * const result = mapper.mapParameter('user_id', '<int:user_id>', 'flask', 'fastapi');
 * // Returns: { name: 'user_id', type: 'int', location: 'path', pydanticType: 'PositiveInt' }
 */
export class SemanticParameterMapper {
  private mappings: SemanticParameterMapping[];

  constructor(mappings: SemanticParameterMapping[] = []) {
    this.mappings = mappings;
  }

  /**
   * Map a parameter from source framework to target framework
   *
   * @param paramName - Parameter name
   * @param sourcePattern - Original URL pattern (e.g., '<int:id>')
   * @param sourceFramework - Source framework (flask, express, etc.)
   * @param targetFramework - Target framework (fastapi, nestjs, etc.)
   * @returns Mapped parameter definition or null if no mapping found
   */
  mapParameter(
    paramName: string,
    sourcePattern: string,
    sourceFramework: string,
    targetFramework: string
  ): {
    name: string;
    sourceType: string;
    targetType: string;
    location: string;
    pydanticSchema?: string;
    validation?: Record<string, any>;
  } | null {
    // Find matching mapping
    const mapping = this.mappings.find(m =>
      m.parameterName === paramName &&
      m.source.framework === sourceFramework &&
      m.target.framework === targetFramework
    );

    if (mapping) {
      return {
        name: paramName,
        sourceType: mapping.source.type,
        targetType: mapping.target.type,
        location: mapping.location,
        pydanticSchema: mapping.target.pydanticSchema,
        validation: mapping.target.validation
      };
    }

    // Auto-detect from pattern if no explicit mapping
    const detected = this.detectFromPattern(sourcePattern, sourceFramework);
    if (detected) {
      const targetType = TYPE_CONVERTERS[targetFramework]?.[detected.type] || detected.type;
      return {
        name: paramName,
        sourceType: detected.type,
        targetType,
        location: detected.location,
        pydanticSchema: this.inferPydanticSchema(detected.type, targetFramework)
      };
    }

    return null;
  }

  /**
   * Detect parameter type and location from URL pattern
   *
   * @param pattern - URL pattern (e.g., '<int:id>', ':id')
   * @param framework - Source framework
   * @returns Detected type and location
   */
  private detectFromPattern(
    pattern: string,
    framework: string
  ): { type: string; location: string } | null {
    // Flask patterns: <int:id>, <string:name>, <uuid:doc_id>, <path:filepath>
    if (framework === 'flask') {
      const match = pattern.match(/<(\w+):(\w+)>/);
      if (match) {
        const [, type, name] = match;
        return {
          type: type,
          location: 'path'
        };
      }
    }

    // Express patterns: :id, :name (always string in Express)
    if (framework === 'express') {
      const match = pattern.match(/:(\w+)/);
      if (match) {
        return {
          type: 'string',
          location: 'path'
        };
      }
    }

    // FastAPI patterns: {id}, {id:int} (in path string)
    if (framework === 'fastapi') {
      const match = pattern.match(/{(\w+)(?::(\w+))?}/);
      if (match) {
        const [, name, type] = match;
        return {
          type: type || 'string',
          location: 'path'
        };
      }
    }

    return null;
  }

  /**
   * Infer appropriate Pydantic schema based on type and target framework
   *
   * @param type - Source type
   * @param targetFramework - Target framework
   * @returns Pydantic schema name or undefined
   */
  private inferPydanticSchema(type: string, targetFramework: string): string | undefined {
    if (targetFramework !== 'fastapi') {
      return undefined;
    }

    // Map common types to appropriate Pydantic schemas
    const schemaMap: Record<string, string> = {
      int: 'int',
      string: 'str',
      float: 'float',
      uuid: 'UUID',
      PositiveInt: 'PositiveInt'
    };

    return schemaMap[type];
  }

  /**
   * Map validation constraints from source to target framework
   *
   * @param sourceValidation - Source validation constraints
   * @param sourceFramework - Source framework
   * @param targetFramework - Target framework
   * @returns Target validation constraints
   */
  mapValidation(
    sourceValidation: Record<string, any>,
    sourceFramework: string,
    targetFramework: string
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // Flask manual validation → FastAPI Pydantic Field()
    if (sourceFramework === 'flask' && targetFramework === 'fastapi') {
      if (sourceValidation.min !== undefined) {
        result.ge = sourceValidation.min;
      }
      if (sourceValidation.max !== undefined) {
        result.le = sourceValidation.max;
      }
      if (sourceValidation.regex) {
        result.pattern = sourceValidation.regex;
      }
    }

    // Express → NestJS
    if (sourceFramework === 'express' && targetFramework === 'nestjs') {
      if (sourceValidation.min !== undefined) {
        result.min = sourceValidation.min;
      }
      if (sourceValidation.max !== undefined) {
        result.max = sourceValidation.max;
      }
    }

    return result;
  }

  /**
   * Get parameter location mapping for different frameworks
   *
   * @param location - Parameter location (path, query, body, header)
   * @param framework - Target framework
   * @returns Framework-specific location syntax
   */
  getLocationSyntax(location: string, framework: string): string {
    const locationMap: Record<string, Record<string, string>> = {
      fastapi: {
        path: 'Path',
        query: 'Query',
        body: 'Body',
        header: 'Header'
      },
      nestjs: {
        path: '@Param',
        query: '@Query',
        body: '@Body',
        header: '@Headers'
      },
      flask: {
        path: 'path parameter',
        query: 'request.args',
        body: 'request.json',
        header: 'request.headers'
      },
      express: {
        path: 'req.params',
        query: 'req.query',
        body: 'req.body',
        header: 'req.headers'
      }
    };

    return locationMap[framework]?.[location] || location;
  }

  /**
   * Add a new semantic mapping
   *
   * @param mapping - Semantic parameter mapping to add
   */
  addMapping(mapping: SemanticParameterMapping): void {
    // Remove existing mapping for same parameter if exists
    this.mappings = this.mappings.filter(m =>
      !(m.parameterName === mapping.parameterName &&
        m.source.framework === mapping.source.framework &&
        m.target.framework === mapping.target.framework)
    );
    this.mappings.push(mapping);
  }

  /**
   * Get all mappings
   */
  getMappings(): SemanticParameterMapping[] {
    return [...this.mappings];
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.mappings = [];
  }
}
