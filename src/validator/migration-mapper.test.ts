/**
 * WO-MIGRATION-VALIDATION-001: Migration Mapper Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateMigrationConfig,
  checkRequiredFields,
  validateRegexPatterns,
  detectPathConflicts,
  checkDeprecatedAddedOverlap,
  applyExplicitMapping,
  applyPatternMapping,
  applyMappings
} from './migration-mapper.js';
import type { MigrationMapping } from '../types/types.js';

describe('checkRequiredFields', () => {
  it('should pass for valid config with all required fields', () => {
    const config = {
      version: '1.0.0',
      name: 'Test Migration',
      mappings: {},
      metadata: {
        source: 'Old System',
        target: 'New System',
        createdAt: '2024-01-15T10:00:00Z'
      }
    };

    const errors = checkRequiredFields(config);
    expect(errors).toEqual([]);
  });

  it('should detect missing version', () => {
    const config = {
      name: 'Test',
      mappings: {},
      metadata: { source: 'A', target: 'B', createdAt: '2024-01-15T10:00:00Z' }
    };

    const errors = checkRequiredFields(config);
    expect(errors).toContain('Missing required field: version');
  });

  it('should detect missing name', () => {
    const config = {
      version: '1.0.0',
      mappings: {},
      metadata: { source: 'A', target: 'B', createdAt: '2024-01-15T10:00:00Z' }
    };

    const errors = checkRequiredFields(config);
    expect(errors).toContain('Missing required field: name');
  });

  it('should detect missing mappings', () => {
    const config = {
      version: '1.0.0',
      name: 'Test',
      metadata: { source: 'A', target: 'B', createdAt: '2024-01-15T10:00:00Z' }
    };

    const errors = checkRequiredFields(config);
    expect(errors).toContain('Missing required field: mappings');
  });

  it('should detect missing metadata', () => {
    const config = {
      version: '1.0.0',
      name: 'Test',
      mappings: {}
    };

    const errors = checkRequiredFields(config);
    expect(errors).toContain('Missing required field: metadata');
  });

  it('should detect missing metadata.source', () => {
    const config = {
      version: '1.0.0',
      name: 'Test',
      mappings: {},
      metadata: { target: 'B', createdAt: '2024-01-15T10:00:00Z' }
    };

    const errors = checkRequiredFields(config);
    expect(errors).toContain('Missing required field: metadata.source');
  });

  it('should detect missing metadata.target', () => {
    const config = {
      version: '1.0.0',
      name: 'Test',
      mappings: {},
      metadata: { source: 'A', createdAt: '2024-01-15T10:00:00Z' }
    };

    const errors = checkRequiredFields(config);
    expect(errors).toContain('Missing required field: metadata.target');
  });
});

describe('validateRegexPatterns', () => {
  it('should pass for valid regex patterns', () => {
    const patterns = [
      { find: '^/api/v1/(.*)', replace: '/api/v2/$1' },
      { find: '/users/(\\d+)', replace: '/users/{id}' }
    ];

    const errors = validateRegexPatterns(patterns);
    expect(errors).toEqual([]);
  });

  it('should detect missing find field', () => {
    const patterns = [
      { find: '', replace: '/api/v2/$1' }
    ];

    const errors = validateRegexPatterns(patterns);
    expect(errors).toContain('Pattern 0: missing \'find\' field');
  });

  it('should detect missing replace field', () => {
    const patterns = [
      { find: '^/api/v1/(.*)', replace: '' }
    ];

    const errors = validateRegexPatterns(patterns);
    expect(errors).toContain('Pattern 0: missing \'replace\' field');
  });

  it('should detect invalid regex syntax', () => {
    const patterns = [
      { find: '^/api/v1/([', replace: '/api/v2/$1' } // Invalid: unclosed group
    ];

    const errors = validateRegexPatterns(patterns);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('invalid regex');
  });

  it('should validate multiple patterns', () => {
    const patterns = [
      { find: '^/api/v1/(.*)', replace: '/api/v2/$1' }, // Valid
      { find: '[invalid', replace: '/test' }, // Invalid
      { find: '/users/(\\d+)', replace: '/users/{id}' } // Valid
    ];

    const errors = validateRegexPatterns(patterns);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('Pattern 1');
  });
});

describe('detectPathConflicts', () => {
  it('should pass for non-conflicting paths', () => {
    const paths = {
      '/api/v1/users': '/api/v2/users',
      '/api/v1/posts': '/api/v2/posts'
    };

    const errors = detectPathConflicts(paths);
    expect(errors).toEqual([]);
  });

  it('should detect empty target path', () => {
    const paths = {
      '/api/v1/users': ''
    };

    const errors = detectPathConflicts(paths);
    expect(errors).toContain('Empty target path for: /api/v1/users');
  });

  it('should not detect false duplicates (unique paths)', () => {
    const paths = {
      '/api/v1/users': '/api/v2/users',
      '/api/v1/posts': '/api/v2/posts',
      '/api/v1/comments': '/api/v2/comments'
    };

    const errors = detectPathConflicts(paths);
    expect(errors).toEqual([]);
  });
});

describe('checkDeprecatedAddedOverlap', () => {
  it('should pass when no overlap exists', () => {
    const deprecated = ['/api/v1/old'];
    const added = ['/api/v2/new'];

    const errors = checkDeprecatedAddedOverlap(deprecated, added);
    expect(errors).toEqual([]);
  });

  it('should detect overlap between deprecated and added', () => {
    const deprecated = ['/api/legacy', '/api/old'];
    const added = ['/api/new', '/api/legacy'];

    const errors = checkDeprecatedAddedOverlap(deprecated, added);
    expect(errors).toContain('Path appears in both deprecated and added: /api/legacy');
  });

  it('should handle empty arrays', () => {
    const deprecated: string[] = [];
    const added: string[] = [];

    const errors = checkDeprecatedAddedOverlap(deprecated, added);
    expect(errors).toEqual([]);
  });

  it('should detect multiple overlaps', () => {
    const deprecated = ['/api/a', '/api/b', '/api/c'];
    const added = ['/api/b', '/api/c', '/api/d'];

    const errors = checkDeprecatedAddedOverlap(deprecated, added);
    expect(errors.length).toBe(2);
    expect(errors).toContain('Path appears in both deprecated and added: /api/b');
    expect(errors).toContain('Path appears in both deprecated and added: /api/c');
  });
});

describe('validateMigrationConfig', () => {
  it('should pass for fully valid config', () => {
    const config = {
      version: '1.0.0',
      name: 'Test Migration',
      mappings: {
        paths: { '/old': '/new' },
        patterns: [{ find: '^/api/(.*)', replace: '/v2/$1' }],
        deprecated: ['/legacy'],
        added: ['/modern']
      },
      metadata: {
        source: 'Old',
        target: 'New',
        createdAt: '2024-01-15T10:00:00Z'
      }
    };

    const result = validateMigrationConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect multiple errors', () => {
    const config = {
      // Missing version
      name: 'Test',
      mappings: {
        patterns: [{ find: '[invalid', replace: '/test' }], // Invalid regex
        deprecated: ['/api/test'],
        added: ['/api/test'] // Overlap
      },
      metadata: {
        // Missing source
        target: 'New',
        createdAt: '2024-01-15T10:00:00Z'
      }
    };

    const result = validateMigrationConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(3);
  });
});

describe('applyExplicitMapping', () => {
  it('should return mapped path for exact match', () => {
    const mappings = {
      '/api/v1/users': '/api/v2/users',
      '/api/v1/posts': '/api/v2/posts'
    };

    const result = applyExplicitMapping('/api/v1/users', mappings);
    expect(result).toBe('/api/v2/users');
  });

  it('should return null for no match', () => {
    const mappings = {
      '/api/v1/users': '/api/v2/users'
    };

    const result = applyExplicitMapping('/api/v1/posts', mappings);
    expect(result).toBeNull();
  });

  it('should be case sensitive', () => {
    const mappings = {
      '/api/v1/users': '/api/v2/users'
    };

    const result = applyExplicitMapping('/API/V1/USERS', mappings);
    expect(result).toBeNull();
  });

  it('should handle empty mappings', () => {
    const mappings = {};

    const result = applyExplicitMapping('/api/v1/users', mappings);
    expect(result).toBeNull();
  });
});

describe('applyPatternMapping', () => {
  it('should apply simple regex replacement', () => {
    const patterns = [{ find: '^/api/v1/(.*)', replace: '/api/v2/$1' }];

    const result = applyPatternMapping('/api/v1/users', patterns);
    expect(result).toBe('/api/v2/users');
  });

  it('should support capture groups', () => {
    const patterns = [
      { find: '^/api/v1/([^/]+)/([^/]+)', replace: '/api/v2/$1/resources/$2' }
    ];

    const result = applyPatternMapping('/api/v1/users/123', patterns);
    expect(result).toBe('/api/v2/users/resources/123');
  });

  it('should return null when no pattern matches', () => {
    const patterns = [{ find: '^/api/v1/(.*)', replace: '/api/v2/$1' }];

    const result = applyPatternMapping('/api/v3/users', patterns);
    expect(result).toBeNull();
  });

  it('should use first matching pattern', () => {
    const patterns = [
      { find: '^/api/(.*)', replace: '/v2/$1' },
      { find: '^/api/users/(.*)', replace: '/v3/users/$1' }
    ];

    const result = applyPatternMapping('/api/users/123', patterns);
    expect(result).toBe('/v2/users/123'); // First pattern wins
  });

  it('should skip malformed regex patterns', () => {
    const patterns = [
      { find: '[invalid', replace: '/test' }, // Malformed
      { find: '^/api/(.*)', replace: '/v2/$1' } // Valid
    ];

    const result = applyPatternMapping('/api/users', patterns);
    expect(result).toBe('/v2/users'); // Skips malformed, uses valid
  });

  it('should handle empty patterns array', () => {
    const patterns: Array<{ find: string; replace: string }> = [];

    const result = applyPatternMapping('/api/users', patterns);
    expect(result).toBeNull();
  });
});

describe('applyMappings', () => {
  const config: MigrationMapping = {
    version: '1.0.0',
    name: 'Test',
    mappings: {
      paths: { '/api/upload': '/api/v2/files/upload' },
      patterns: [{ find: '^/api/v1/(.*)', replace: '/api/v2/$1' }]
    },
    metadata: {
      source: 'v1',
      target: 'v2',
      createdAt: '2024-01-15T10:00:00Z'
    }
  };

  it('should prefer explicit mapping over pattern', () => {
    const result = applyMappings('/api/upload', config);

    expect(result.originalPath).toBe('/api/upload');
    expect(result.transformedPath).toBe('/api/v2/files/upload');
    expect(result.confidence).toBe(100);
    expect(result.mappingRule).toBe('explicit');
  });

  it('should use pattern when no explicit mapping exists', () => {
    const result = applyMappings('/api/v1/users', config);

    expect(result.originalPath).toBe('/api/v1/users');
    expect(result.transformedPath).toBe('/api/v2/users');
    expect(result.confidence).toBe(80);
    expect(result.mappingRule).toBe('pattern');
  });

  it('should return unmapped when no rules match', () => {
    const result = applyMappings('/api/v3/users', config);

    expect(result.originalPath).toBe('/api/v3/users');
    expect(result.transformedPath).toBe('/api/v3/users'); // Unchanged
    expect(result.confidence).toBe(0);
    expect(result.mappingRule).toBe('unmapped');
  });

  it('should handle config with only explicit mappings', () => {
    const simpleConfig: MigrationMapping = {
      ...config,
      mappings: {
        paths: { '/old': '/new' }
      }
    };

    const result = applyMappings('/old', simpleConfig);
    expect(result.transformedPath).toBe('/new');
    expect(result.confidence).toBe(100);
  });

  it('should handle config with only patterns', () => {
    const patternConfig: MigrationMapping = {
      ...config,
      mappings: {
        patterns: [{ find: '^/v1/(.*)', replace: '/v2/$1' }]
      }
    };

    const result = applyMappings('/v1/test', patternConfig);
    expect(result.transformedPath).toBe('/v2/test');
    expect(result.confidence).toBe(80);
  });

  it('should handle empty mappings config', () => {
    const emptyConfig: MigrationMapping = {
      ...config,
      mappings: {}
    };

    const result = applyMappings('/api/users', emptyConfig);
    expect(result.transformedPath).toBe('/api/users');
    expect(result.confidence).toBe(0);
    expect(result.mappingRule).toBe('unmapped');
  });
});

/**
 * SEMANTIC PARAMETER MAPPER TESTS (IMP-CORE-040)
 */
import { SemanticParameterMapper, type SemanticParameterMapping } from './migration-mapper.js';

describe('SemanticParameterMapper', () => {
  describe('mapParameter', () => {
    it('should map Flask int parameter to FastAPI int', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('id', '<int:id>', 'flask', 'fastapi');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('id');
      expect(result?.sourceType).toBe('int');
      expect(result?.targetType).toBe('int');
      expect(result?.location).toBe('path');
    });

    it('should map Flask uuid parameter to FastAPI UUID', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('doc_id', '<uuid:doc_id>', 'flask', 'fastapi');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('doc_id');
      expect(result?.sourceType).toBe('uuid');
      expect(result?.targetType).toBe('UUID');
    });

    it('should map Flask string parameter to FastAPI str', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('name', '<string:name>', 'flask', 'fastapi');

      expect(result).not.toBeNull();
      expect(result?.sourceType).toBe('string');
      expect(result?.targetType).toBe('str');
    });

    it('should map Express parameter to NestJS string', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('id', ':id', 'express', 'nestjs');

      expect(result).not.toBeNull();
      expect(result?.sourceType).toBe('string');
      expect(result?.targetType).toBe('string');
      expect(result?.location).toBe('path');
    });

    it('should use explicit mapping when available', () => {
      const mappings: SemanticParameterMapping[] = [
        {
          parameterName: 'user_id',
          location: 'path',
          source: { framework: 'flask', type: 'int', pattern: '<int:user_id>' },
          target: { framework: 'fastapi', type: 'int', pydanticSchema: 'PositiveInt' }
        }
      ];
      const mapper = new SemanticParameterMapper(mappings);
      const result = mapper.mapParameter('user_id', '<int:user_id>', 'flask', 'fastapi');

      expect(result).not.toBeNull();
      expect(result?.pydanticSchema).toBe('PositiveInt');
    });

    it('should return null for unsupported patterns', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('id', 'unknown-pattern', 'flask', 'fastapi');

      expect(result).toBeNull();
    });
  });

  describe('mapValidation', () => {
    it('should map Flask min/max to FastAPI ge/le', () => {
      const mapper = new SemanticParameterMapper();
      const sourceValidation = { min: 1, max: 100 };
      const result = mapper.mapValidation(sourceValidation, 'flask', 'fastapi');

      expect(result.ge).toBe(1);
      expect(result.le).toBe(100);
    });

    it('should map Flask regex to FastAPI pattern', () => {
      const mapper = new SemanticParameterMapper();
      const sourceValidation = { regex: '^[a-z]+$' };
      const result = mapper.mapValidation(sourceValidation, 'flask', 'fastapi');

      expect(result.pattern).toBe('^[a-z]+$');
    });

    it('should map Express min/max to NestJS min/max', () => {
      const mapper = new SemanticParameterMapper();
      const sourceValidation = { min: 0, max: 10 };
      const result = mapper.mapValidation(sourceValidation, 'express', 'nestjs');

      expect(result.min).toBe(0);
      expect(result.max).toBe(10);
    });
  });

  describe('getLocationSyntax', () => {
    it('should return FastAPI Path for path location', () => {
      const mapper = new SemanticParameterMapper();
      expect(mapper.getLocationSyntax('path', 'fastapi')).toBe('Path');
    });

    it('should return FastAPI Query for query location', () => {
      const mapper = new SemanticParameterMapper();
      expect(mapper.getLocationSyntax('query', 'fastapi')).toBe('Query');
    });

    it('should return NestJS @Param for path location', () => {
      const mapper = new SemanticParameterMapper();
      expect(mapper.getLocationSyntax('path', 'nestjs')).toBe('@Param');
    });

    it('should return Express req.params for path location', () => {
      const mapper = new SemanticParameterMapper();
      expect(mapper.getLocationSyntax('path', 'express')).toBe('req.params');
    });
  });

  describe('addMapping and getMappings', () => {
    it('should add and retrieve mappings', () => {
      const mapper = new SemanticParameterMapper();
      const mapping: SemanticParameterMapping = {
        parameterName: 'test_id',
        location: 'path',
        source: { framework: 'flask', type: 'int' },
        target: { framework: 'fastapi', type: 'int' }
      };

      mapper.addMapping(mapping);
      const mappings = mapper.getMappings();

      expect(mappings).toHaveLength(1);
      expect(mappings[0].parameterName).toBe('test_id');
    });

    it('should replace existing mapping for same parameter', () => {
      const mapper = new SemanticParameterMapper();
      const mapping1: SemanticParameterMapping = {
        parameterName: 'id',
        location: 'path',
        source: { framework: 'flask', type: 'int' },
        target: { framework: 'fastapi', type: 'int' }
      };
      const mapping2: SemanticParameterMapping = {
        parameterName: 'id',
        location: 'path',
        source: { framework: 'flask', type: 'string' },
        target: { framework: 'fastapi', type: 'str' }
      };

      mapper.addMapping(mapping1);
      mapper.addMapping(mapping2);
      const mappings = mapper.getMappings();

      expect(mappings).toHaveLength(1);
      expect(mappings[0].source.type).toBe('string');
    });

    it('should clear all mappings', () => {
      const mapper = new SemanticParameterMapper();
      const mapping: SemanticParameterMapping = {
        parameterName: 'test_id',
        location: 'path',
        source: { framework: 'flask', type: 'int' },
        target: { framework: 'fastapi', type: 'int' }
      };

      mapper.addMapping(mapping);
      mapper.clearMappings();

      expect(mapper.getMappings()).toHaveLength(0);
    });
  });

  describe('Pydantic schema inference', () => {
    it('should infer int schema for FastAPI', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('id', '<int:id>', 'flask', 'fastapi');

      expect(result?.pydanticSchema).toBe('int');
    });

    it('should infer str schema for FastAPI', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('name', '<string:name>', 'flask', 'fastapi');

      expect(result?.pydanticSchema).toBe('str');
    });

    it('should not infer schema for non-FastAPI targets', () => {
      const mapper = new SemanticParameterMapper();
      const result = mapper.mapParameter('id', '<int:id>', 'flask', 'nestjs');

      expect(result?.pydanticSchema).toBeUndefined();
    });
  });
});
