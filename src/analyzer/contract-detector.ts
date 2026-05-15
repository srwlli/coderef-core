/**
 * @coderef-semantic: 1.0.0
 * @exports OpenApiSpec, OpenApiPath, OpenApiComponent, GraphqlSchema, GraphqlType, GraphqlOperation, ProtobufDefinition, ProtobufMessage, ProtobufField, ProtobufService, ProtobufMethod, ProtobufEnum, JsonSchema, ContractAnalysis, ContractDetector, traverse, analyzeContracts
 * @used_by src/cli/coderef-analyze.ts
 */





/**
 * IMP-CORE-020: API Contract Detector
 *
 * Detects and analyzes API contracts:
 * - OpenAPI/Swagger specs (JSON/YAML)
 * - GraphQL schemas and resolvers
 * - Protocol Buffer (.proto) files
 * - gRPC service definitions
 * - JSON Schema files
 */

import * as fs from 'fs';
import * as path from 'path';

export interface OpenApiSpec {
  format: 'openapi';
  version: string;
  title: string;
  file: string;
  paths: OpenApiPath[];
  components: OpenApiComponent[];
  totalEndpoints: number;
  totalSchemas: number;
  hasAuthentication: boolean;
}

export interface OpenApiPath {
  path: string;
  methods: string[];
  summary?: string;
  tags?: string[];
  operationId?: string;
  hasRequestBody: boolean;
  hasParameters: boolean;
}

export interface OpenApiComponent {
  name: string;
  type: 'schema' | 'parameter' | 'response' | 'securityScheme';
  properties?: string[];
}

export interface GraphqlSchema {
  format: 'graphql';
  file: string;
  types: GraphqlType[];
  queries: GraphqlOperation[];
  mutations: GraphqlOperation[];
  subscriptions: GraphqlOperation[];
  totalTypes: number;
  totalOperations: number;
  hasSubscriptions: boolean;
}

export interface GraphqlType {
  name: string;
  kind: 'object' | 'input' | 'enum' | 'interface' | 'union' | 'scalar';
  fields: string[];
  implements?: string[];
}

export interface GraphqlOperation {
  name: string;
  returnType: string;
  arguments: string[];
  description?: string;
}

export interface ProtobufDefinition {
  format: 'protobuf';
  file: string;
  package: string;
  syntax: 'proto2' | 'proto3';
  messages: ProtobufMessage[];
  services: ProtobufService[];
  enums: ProtobufEnum[];
  imports: string[];
  totalMessages: number;
  totalServices: number;
}

export interface ProtobufMessage {
  name: string;
  fields: ProtobufField[];
  nestedTypes: string[];
}

export interface ProtobufField {
  name: string;
  type: string;
  number: number;
  repeated: boolean;
  optional: boolean;
}

export interface ProtobufService {
  name: string;
  methods: ProtobufMethod[];
}

export interface ProtobufMethod {
  name: string;
  inputType: string;
  outputType: string;
  streaming: 'none' | 'client' | 'server' | 'bidirectional';
}

export interface ProtobufEnum {
  name: string;
  values: string[];
}

export interface JsonSchema {
  format: 'json-schema';
  file: string;
  id?: string;
  title?: string;
  type: string;
  properties: string[];
  required: string[];
  hasRefs: boolean;
}

export interface ContractAnalysis {
  openApi: OpenApiSpec[];
  graphql: GraphqlSchema[];
  protobuf: ProtobufDefinition[];
  jsonSchemas: JsonSchema[];
  totalContracts: number;
  totalEndpoints: number;
  totalTypes: number;
  totalServices: number;
  formatBreakdown: Record<string, number>;
}

export class ContractDetector {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Detect all API contracts
   */
  detect(): ContractAnalysis {
    const openApi = this.detectOpenApiSpecs();
    const graphql = this.detectGraphqlSchemas();
    const protobuf = this.detectProtobufDefs();
    const jsonSchemas = this.detectJsonSchemas();

    const totalContracts = openApi.length + graphql.length + protobuf.length + jsonSchemas.length;
    const totalEndpoints = openApi.reduce((sum, s) => sum + s.totalEndpoints, 0);
    const totalTypes = graphql.reduce((sum, s) => sum + s.totalTypes, 0);
    const totalServices = protobuf.reduce((sum, s) => sum + s.totalServices, 0);

    return {
      openApi,
      graphql,
      protobuf,
      jsonSchemas,
      totalContracts,
      totalEndpoints,
      totalTypes,
      totalServices,
      formatBreakdown: {
        openapi: openApi.length,
        graphql: graphql.length,
        protobuf: protobuf.length,
        'json-schema': jsonSchemas.length,
      },
    };
  }

  /**
   * Detect OpenAPI/Swagger specs
   */
  private detectOpenApiSpecs(): OpenApiSpec[] {
    const specs: OpenApiSpec[] = [];
    const patterns = [
      '**/openapi.json',
      '**/openapi.yaml',
      '**/swagger.json',
      '**/swagger.yaml',
      '**/api.yaml',
      '**/api.yml',
      'docs/openapi/*.{json,yaml,yml}',
      'specs/*.{json,yaml,yml}',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const spec = this.parseOpenApi(file);
        if (spec) specs.push(spec);
      }
    }

    return specs;
  }

  /**
   * Parse OpenAPI spec file
   */
  private parseOpenApi(file: string): OpenApiSpec | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const isYaml = file.endsWith('.yaml') || file.endsWith('.yml');
      const spec = isYaml ? this.parseYaml(content) : JSON.parse(content);

      const version = spec.openapi || spec.swagger || 'unknown';
      const info = spec.info || {};
      const paths = spec.paths || {};
      const components = spec.components || spec.definitions || {};

      const parsedPaths: OpenApiPath[] = [];
      for (const [pathStr, methods] of Object.entries(paths)) {
        const methodList = Object.keys(methods as object).filter(m => 
          ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(m.toLowerCase())
        );
        
        const pathData = methods as Record<string, any>;
        parsedPaths.push({
          path: pathStr,
          methods: methodList.map(m => m.toUpperCase()),
          summary: pathData.get?.summary || pathData.post?.summary,
          tags: pathData.get?.tags || pathData.post?.tags,
          operationId: pathData.get?.operationId || pathData.post?.operationId,
          hasRequestBody: !!pathData.post?.requestBody || !!pathData.put?.requestBody || !!pathData.patch?.requestBody,
          hasParameters: !!(pathData.get?.parameters || pathData.post?.parameters),
        });
      }

      const parsedComponents: OpenApiComponent[] = [];
      const schemas = components.schemas || {};
      for (const [name, schema] of Object.entries(schemas)) {
        const s = schema as any;
        parsedComponents.push({
          name,
          type: 'schema',
          properties: s.properties ? Object.keys(s.properties) : undefined,
        });
      }

      return {
        format: 'openapi',
        version,
        title: info.title || 'Untitled API',
        file,
        paths: parsedPaths,
        components: parsedComponents,
        totalEndpoints: parsedPaths.reduce((sum, p) => sum + p.methods.length, 0),
        totalSchemas: parsedComponents.length,
        hasAuthentication: content.includes('security') || content.includes('Authorization'),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect GraphQL schemas
   */
  private detectGraphqlSchemas(): GraphqlSchema[] {
    const schemas: GraphqlSchema[] = [];
    const patterns = [
      '**/schema.graphql',
      '**/schema.gql',
      '**/types.graphql',
      '**/types.gql',
      'src/**/*.graphql',
      'src/**/*.gql',
      'graphql/**/*.graphql',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const schema = this.parseGraphql(file);
        if (schema) schemas.push(schema);
      }
    }

    return schemas;
  }

  /**
   * Parse GraphQL schema file
   */
  private parseGraphql(file: string): GraphqlSchema | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Extract types
      const types: GraphqlType[] = [];
      const typePattern = /type\s+(\w+)(?:\s+implements\s+([^{]+))?\s*\{([^}]+)\}/g;
      let match;
      while ((match = typePattern.exec(content)) !== null) {
        const fields = match[3].split('\n')
          .map(f => f.trim())
          .filter(f => f && !f.startsWith('#'))
          .map(f => f.split(':')[0].trim().replace(/!$/, ''))
          .filter(Boolean);
        
        types.push({
          name: match[1],
          kind: 'object',
          fields,
          implements: match[2] ? match[2].split('&').map(i => i.trim()) : undefined,
        });
      }

      // Extract queries
      const queries: GraphqlOperation[] = [];
      const queryPattern = /type\s+Query\s*\{([^}]+)\}/s;
      const queryMatch = queryPattern.exec(content);
      if (queryMatch) {
        const queryContent = queryMatch[1];
        const opPattern = /(\w+)\s*\(([^)]*)\)\s*:\s*(\w+[!]?)/g;
        let opMatch;
        while ((opMatch = opPattern.exec(queryContent)) !== null) {
          queries.push({
            name: opMatch[1],
            returnType: opMatch[3].replace(/!$/, ''),
            arguments: opMatch[2].split(',').map(a => a.trim()).filter(Boolean),
          });
        }
      }

      // Extract mutations
      const mutations: GraphqlOperation[] = [];
      const mutationPattern = /type\s+Mutation\s*\{([^}]+)\}/s;
      const mutationMatch = mutationPattern.exec(content);
      if (mutationMatch) {
        const mutationContent = mutationMatch[1];
        const opPattern = /(\w+)\s*\(([^)]*)\)\s*:\s*(\w+[!]?)/g;
        let opMatch;
        while ((opMatch = opPattern.exec(mutationContent)) !== null) {
          mutations.push({
            name: opMatch[1],
            returnType: opMatch[3].replace(/!$/, ''),
            arguments: opMatch[2].split(',').map(a => a.trim()).filter(Boolean),
          });
        }
      }

      // Extract subscriptions
      const subscriptions: GraphqlOperation[] = [];
      const subscriptionPattern = /type\s+Subscription\s*\{([^}]+)\}/s;
      const subscriptionMatch = subscriptionPattern.exec(content);
      if (subscriptionMatch) {
        const subscriptionContent = subscriptionMatch[1];
        const opPattern = /(\w+)\s*\(([^)]*)\)\s*:\s*(\w+[!]?)/g;
        let opMatch;
        while ((opMatch = opPattern.exec(subscriptionContent)) !== null) {
          subscriptions.push({
            name: opMatch[1],
            returnType: opMatch[3].replace(/!$/, ''),
            arguments: opMatch[2].split(',').map(a => a.trim()).filter(Boolean),
          });
        }
      }

      return {
        format: 'graphql',
        file,
        types,
        queries,
        mutations,
        subscriptions,
        totalTypes: types.length,
        totalOperations: queries.length + mutations.length + subscriptions.length,
        hasSubscriptions: subscriptions.length > 0,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect Protocol Buffer definitions
   */
  private detectProtobufDefs(): ProtobufDefinition[] {
    const defs: ProtobufDefinition[] = [];
    const patterns = [
      '**/*.proto',
      'proto/**/*.proto',
      'protos/**/*.proto',
      'api/**/*.proto',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const def = this.parseProtobuf(file);
        if (def) defs.push(def);
      }
    }

    return defs;
  }

  /**
   * Parse .proto file
   */
  private parseProtobuf(file: string): ProtobufDefinition | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      const syntaxMatch = content.match(/syntax\s*=\s*"(proto[23])";/);
      const packageMatch = content.match(/package\s+(\w+(?:\.\w+)*);/);
      
      // Extract messages
      const messages: ProtobufMessage[] = [];
      const messagePattern = /message\s+(\w+)\s*\{([^}]+)\}/g;
      let match;
      while ((match = messagePattern.exec(content)) !== null) {
        const messageContent = match[2];
        const fields: ProtobufField[] = [];
        
        const fieldPattern = /\s*(repeated\s+)?(optional\s+)?(\w+)\s+(\w+)\s*=\s*(\d+)/g;
        let fieldMatch;
        while ((fieldMatch = fieldPattern.exec(messageContent)) !== null) {
          fields.push({
            type: fieldMatch[3],
            name: fieldMatch[4],
            number: parseInt(fieldMatch[5], 10),
            repeated: !!fieldMatch[1],
            optional: !!fieldMatch[2] || !fieldMatch[1],
          });
        }
        
        messages.push({
          name: match[1],
          fields,
          nestedTypes: [],
        });
      }

      // Extract services
      const services: ProtobufService[] = [];
      const servicePattern = /service\s+(\w+)\s*\{([^}]+)\}/g;
      let svcMatch;
      while ((svcMatch = servicePattern.exec(content)) !== null) {
        const serviceContent = svcMatch[2];
        const methods: ProtobufMethod[] = [];
        
        const rpcPattern = /rpc\s+(\w+)\s*\(\s*(?:stream\s+)?(\w+)\s*\)\s*returns\s*\(\s*(?:stream\s+)?(\w+)\s*\)/g;
        let rpcMatch;
        while ((rpcMatch = rpcPattern.exec(serviceContent)) !== null) {
          const hasClientStream = serviceContent.substring(rpcMatch.index, rpcMatch.index + rpcMatch[0].indexOf('(')).includes('stream');
          const hasServerStream = rpcMatch[0].includes('returns ( stream');
          
          let streaming: ProtobufMethod['streaming'] = 'none';
          if (hasClientStream && hasServerStream) streaming = 'bidirectional';
          else if (hasClientStream) streaming = 'client';
          else if (hasServerStream) streaming = 'server';
          
          methods.push({
            name: rpcMatch[1],
            inputType: rpcMatch[2],
            outputType: rpcMatch[3],
            streaming,
          });
        }
        
        services.push({
          name: svcMatch[1],
          methods,
        });
      }

      // Extract enums
      const enums: ProtobufEnum[] = [];
      const enumPattern = /enum\s+(\w+)\s*\{([^}]+)\}/g;
      let enumMatch;
      while ((enumMatch = enumPattern.exec(content)) !== null) {
        const enumContent = enumMatch[2];
        const values = enumContent.match(/(\w+)\s*=\s*\d+/g)?.map(v => v.split('=')[0].trim()) || [];
        enums.push({
          name: enumMatch[1],
          values,
        });
      }

      // Extract imports
      const imports: string[] = [];
      const importPattern = /import\s+"([^"]+)";/g;
      let importMatch;
      while ((importMatch = importPattern.exec(content)) !== null) {
        imports.push(importMatch[1]);
      }

      return {
        format: 'protobuf',
        file,
        package: packageMatch?.[1] || 'default',
        syntax: (syntaxMatch?.[1] as 'proto2' | 'proto3') || 'proto3',
        messages,
        services,
        enums,
        imports,
        totalMessages: messages.length,
        totalServices: services.length,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect JSON Schema files
   */
  private detectJsonSchemas(): JsonSchema[] {
    const schemas: JsonSchema[] = [];
    const patterns = [
      '**/*.schema.json',
      '**/schema.json',
      'schemas/**/*.json',
      'json-schemas/**/*.json',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const schema = this.parseJsonSchema(file);
        if (schema) schemas.push(schema);
      }
    }

    return schemas;
  }

  /**
   * Parse JSON Schema file
   */
  private parseJsonSchema(file: string): JsonSchema | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const schema = JSON.parse(content);

      return {
        format: 'json-schema',
        file,
        id: schema.$id,
        title: schema.title,
        type: schema.type || 'object',
        properties: schema.properties ? Object.keys(schema.properties) : [],
        required: schema.required || [],
        hasRefs: content.includes('$ref') || content.includes('"$ref"'),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Simple glob implementation
   */
  private glob(pattern: string): string[] {
    const files: string[] = [];
    const regex = this.globToRegex(pattern);
    
    const traverse = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (regex.test(fullPath.replace(this.projectPath, ''))) {
          files.push(fullPath);
        }
      }
    };

    try {
      traverse(this.projectPath);
    } catch {
      // Ignore traversal errors
    }

    return files;
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');
    return new RegExp(escaped);
  }

  /**
   * Simple YAML parser
   */
  private parseYaml(content: string): any {
    // Basic YAML parsing for simple structures
    const result: any = {};
    const lines = content.split('\n');
    let currentKey: string | null = null;
    let currentObj: any = result;
    const stack: { key: string; obj: any }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      const match = trimmed.match(/^(\w+):\s*(.*)$/);

      if (match) {
        const [, key, value] = match;
        
        // Pop stack to correct level
        while (stack.length > 0 && stack.length * 2 >= indent) {
          stack.pop();
        }

        if (stack.length > 0) {
          currentObj = stack[stack.length - 1].obj;
        } else {
          currentObj = result;
        }

        if (value) {
          // Scalar value
          currentObj[key] = value.replace(/^["']|["']$/g, '');
        } else {
          // Object value
          currentObj[key] = {};
          stack.push({ key, obj: currentObj[key] });
        }
      }
    }

    return result;
  }
}

/**
 * Analyze API contracts in project
 */
export function analyzeContracts(projectPath: string): ContractAnalysis {
  const detector = new ContractDetector(projectPath);
  return detector.detect();
}
