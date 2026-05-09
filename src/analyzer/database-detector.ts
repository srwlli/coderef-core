/**
 * IMP-CORE-021: Database Schema and ORM Detector
 *
 * Detects and analyzes:
 * - Prisma schemas
 * - TypeORM entities and configurations
 * - Sequelize models
 * - Mongoose schemas
 * - Database configurations
 */

/**
 * @semantic
 * exports: [PrismaModel, PrismaField, PrismaRelation, PrismaSchema, TypeormEntity, TypeormColumn, TypeormRelation, SequelizeModel, SequelizeColumn, SequelizeAssociation, MongooseSchema, MongooseField, DatabaseAnalysis, DatabaseDetection, DatabaseDetector, traverse, analyzeDatabase]
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PrismaModel {
  name: string;
  fields: PrismaField[];
  relations: PrismaRelation[];
  isEnum: boolean;
  dbTable?: string;
}

export interface PrismaField {
  name: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  isUpdatedAt: boolean;
  defaultValue?: string;
  relation?: string;
}

export interface PrismaRelation {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  from: string;
  to: string;
  fields?: string[];
  references?: string[];
}

export interface PrismaSchema {
  orm: 'prisma';
  file: string;
  datasource: {
    provider: string;
    url?: string;
  };
  models: PrismaModel[];
  enums: string[];
  totalTables: number;
  totalRelations: number;
}

export interface TypeormEntity {
  orm: 'typeorm';
  name: string;
  file: string;
  tableName?: string;
  columns: TypeormColumn[];
  relations: TypeormRelation[];
  indices: string[];
}

export interface TypeormColumn {
  name: string;
  type: string;
  isPrimary: boolean;
  isGenerated: boolean;
  isNullable: boolean;
  isUnique: boolean;
  default?: string;
}

export interface TypeormRelation {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  target: string;
  property: string;
  inverse?: string;
}

export interface SequelizeModel {
  orm: 'sequelize';
  name: string;
  file: string;
  tableName?: string;
  columns: SequelizeColumn[];
  associations: SequelizeAssociation[];
}

export interface SequelizeColumn {
  name: string;
  type: string;
  isPrimary: boolean;
  isAutoIncrement: boolean;
  allowNull: boolean;
  defaultValue?: string;
}

export interface SequelizeAssociation {
  type: 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany';
  target: string;
  as?: string;
  through?: string;
}

export interface MongooseSchema {
  orm: 'mongoose';
  name: string;
  file: string;
  collection?: string;
  fields: MongooseField[];
  hasTimestamps: boolean;
  hasIndexes: boolean;
}

export interface MongooseField {
  name: string;
  type: string;
  isRequired: boolean;
  isIndex: boolean;
  isUnique: boolean;
  ref?: string;
}

export interface DatabaseAnalysis {
  orm: 'prisma' | 'typeorm' | 'sequelize' | 'mongoose' | 'unknown';
  database: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'unknown';
  connectionString?: string;
  hasMigrations: boolean;
  hasSeeders: boolean;
}

export interface DatabaseDetection {
  prisma?: PrismaSchema;
  typeorm: TypeormEntity[];
  sequelize: SequelizeModel[];
  mongoose: MongooseSchema[];
  totalOrms: number;
  totalModels: number;
  totalRelations: number;
  detectedDatabases: string[];
}

export class DatabaseDetector {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Detect all database schemas and ORM configurations
   */
  detect(): DatabaseDetection {
    const prisma = this.detectPrisma();
    const typeorm = this.detectTypeorm();
    const sequelize = this.detectSequelize();
    const mongoose = this.detectMongoose();

    const ormCount = (prisma ? 1 : 0) + (typeorm.length > 0 ? 1 : 0) + 
                     (sequelize.length > 0 ? 1 : 0) + (mongoose.length > 0 ? 1 : 0);

    const totalModels = (prisma?.models.length || 0) + typeorm.length + sequelize.length + mongoose.length;
    
    const totalRelations = (prisma?.totalRelations || 0) + 
                           typeorm.reduce((sum, e) => sum + e.relations.length, 0) +
                           sequelize.reduce((sum, m) => sum + m.associations.length, 0);

    const detectedDatabases = this.detectDatabases(prisma, typeorm, sequelize, mongoose);

    return {
      prisma,
      typeorm,
      sequelize,
      mongoose,
      totalOrms: ormCount,
      totalModels,
      totalRelations,
      detectedDatabases,
    };
  }

  /**
   * Detect Prisma schema
   */
  private detectPrisma(): PrismaSchema | undefined {
    const schemaPath = path.join(this.projectPath, 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) return undefined;

    try {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      
      // Parse datasource
      const datasourceMatch = content.match(/datasource\s+\w+\s*\{([^}]+)\}/s);
      const providerMatch = datasourceMatch?.[1]?.match(/provider\s*=\s*"([^"]+)"/);
      const urlMatch = datasourceMatch?.[1]?.match(/url\s*=\s*(?:env\()?"([^"]+)"/);

      // Parse models
      const models: PrismaModel[] = [];
      const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/gs;
      let match;

      while ((match = modelPattern.exec(content)) !== null) {
        const modelName = match[1];
        const modelContent = match[2];

        const fields: PrismaField[] = [];
        const relations: PrismaRelation[] = [];

        // Parse fields
        const fieldPattern = /(\w+)\s+(\w+(?:\?)?)(?:\s*(@[^\n]+))?/g;
        let fieldMatch;

        while ((fieldMatch = fieldPattern.exec(modelContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2].replace('?', '');
          const fieldAttrs = fieldMatch[3] || '';

          const field: PrismaField = {
            name: fieldName,
            type: fieldType,
            isRequired: !fieldMatch[2].endsWith('?'),
            isList: fieldType.includes('[]'),
            isId: fieldAttrs.includes('@id'),
            isUnique: fieldAttrs.includes('@unique'),
            isUpdatedAt: fieldAttrs.includes('@updatedAt'),
            defaultValue: fieldAttrs.match(/@default\(([^)]+)\)/)?.[1],
          };

          // Check for relations
          if (fieldAttrs.includes('@relation')) {
            const relationMatch = fieldAttrs.match(/@relation\(([^)]+)\)/);
            field.relation = relationMatch?.[1];

            const relationFields = fieldAttrs.match(/fields:\s*\[([^\]]+)\]/)?.[1]?.split(',').map(s => s.trim());
            const references = fieldAttrs.match(/references:\s*\[([^\]]+)\]/)?.[1]?.split(',').map(s => s.trim());

            if (references) {
              relations.push({
                name: fieldName,
                type: field.isList ? 'one-to-many' : 'many-to-one',
                from: modelName,
                to: fieldType.replace('[]', ''),
                fields: relationFields,
                references,
              });
            }
          }

          fields.push(field);
        }

        models.push({
          name: modelName,
          fields,
          relations,
          isEnum: false,
        });
      }

      // Parse enums
      const enumPattern = /enum\s+(\w+)\s*\{([^}]+)\}/g;
      let enumMatch;
      const enums: string[] = [];

      while ((enumMatch = enumPattern.exec(content)) !== null) {
        enums.push(enumMatch[1]);
      }

      // Add enums as models
      enums.forEach(enumName => {
        models.push({
          name: enumName,
          fields: [],
          relations: [],
          isEnum: true,
        });
      });

      const totalRelations = models.reduce((sum, m) => sum + m.relations.length, 0);

      return {
        orm: 'prisma',
        file: schemaPath,
        datasource: {
          provider: providerMatch?.[1] || 'unknown',
          url: urlMatch?.[1],
        },
        models,
        enums,
        totalTables: models.filter(m => !m.isEnum).length,
        totalRelations,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect TypeORM entities
   */
  private detectTypeorm(): TypeormEntity[] {
    const entities: TypeormEntity[] = [];
    const patterns = [
      'src/**/*.entity.ts',
      'src/**/entities/*.ts',
      'entities/**/*.ts',
      'src/models/**/*.ts',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const entity = this.parseTypeormEntity(file);
        if (entity) entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Parse TypeORM entity file
   */
  private parseTypeormEntity(file: string): TypeormEntity | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Check if it's an entity file
      if (!content.includes('@Entity')) return undefined;

      const classMatch = content.match(/class\s+(\w+)/);
      const name = classMatch?.[1] || 'Unknown';

      const tableMatch = content.match(/@Entity\(['"]([^'"]+)['"]/);
      const tableName = tableMatch?.[1];

      // Parse columns
      const columns: TypeormColumn[] = [];
      const columnPattern = /@Column\([^)]*\)\s*\n?\s*(\w+)\??\s*:\s*(\w+)/g;
      let colMatch;

      while ((colMatch = columnPattern.exec(content)) !== null) {
        const fieldName = colMatch[1];
        const fieldType = colMatch[2];
        const section = content.substring(Math.max(0, colMatch.index - 200), colMatch.index);

        columns.push({
          name: fieldName,
          type: fieldType,
          isPrimary: section.includes('@PrimaryColumn') || section.includes('@PrimaryGeneratedColumn'),
          isGenerated: section.includes('@PrimaryGeneratedColumn') || section.includes('@Generated'),
          isNullable: section.includes('nullable: true') || colMatch[0].includes('?'),
          isUnique: section.includes('@Index({ unique: true })') || section.includes('@Unique'),
        });
      }

      // Parse relations
      const relations: TypeormRelation[] = [];
      const relationPattern = /@(OneToOne|OneToMany|ManyToOne|ManyToMany)\([^)]*\)\s*\n?\s*(\w+)\??\s*:\s*(\w+)/g;
      let relMatch;

      while ((relMatch = relationPattern.exec(content)) !== null) {
        const relType = relMatch[1].toLowerCase().replace(/to/, '-to-') as TypeormRelation['type'];
        const propertyName = relMatch[2];
        const targetName = relMatch[3];

        relations.push({
          type: relType,
          target: targetName,
          property: propertyName,
        });
      }

      // Parse indices
      const indices: string[] = [];
      const indexPattern = /@Index\(['"]([^'"]+)['"]/g;
      let idxMatch;

      while ((idxMatch = indexPattern.exec(content)) !== null) {
        indices.push(idxMatch[1]);
      }

      return {
        orm: 'typeorm',
        name,
        file,
        tableName,
        columns,
        relations,
        indices,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect Sequelize models
   */
  private detectSequelize(): SequelizeModel[] {
    const models: SequelizeModel[] = [];
    const patterns = [
      'src/**/*.model.ts',
      'src/**/models/*.ts',
      'models/**/*.ts',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const model = this.parseSequelizeModel(file);
        if (model) models.push(model);
      }
    }

    return models;
  }

  /**
   * Parse Sequelize model file
   */
  private parseSequelizeModel(file: string): SequelizeModel | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for Sequelize model patterns
      if (!content.includes('sequelize') && !content.includes('Sequelize')) return undefined;

      const classMatch = content.match(/class\s+(\w+)\s+extends\s+Model/);
      const name = classMatch?.[1];

      if (!name) return undefined;

      const tableMatch = content.match(/tableName:\s*['"]([^'"]+)['"]/);
      const tableName = tableMatch?.[1];

      // Parse columns from init/define
      const columns: SequelizeColumn[] = [];
      const definePattern = /\w+\.init\(\{([^}]+)\}/s;
      const defineMatch = definePattern.exec(content);

      if (defineMatch) {
        const colsContent = defineMatch[1];
        const colPattern = /(\w+):\s*\{([^}]+)\}/g;
        let colMatch;

        while ((colMatch = colPattern.exec(colsContent)) !== null) {
          const colName = colMatch[1];
          const colConfig = colMatch[2];

          const typeMatch = colConfig.match(/type:\s*DataTypes\.(\w+)/);

          columns.push({
            name: colName,
            type: typeMatch?.[1] || 'STRING',
            isPrimary: colConfig.includes('primaryKey: true'),
            isAutoIncrement: colConfig.includes('autoIncrement: true'),
            allowNull: !colConfig.includes('allowNull: false'),
            defaultValue: colConfig.match(/defaultValue:\s*([^,\n]+)/)?.[1],
          });
        }
      }

      // Parse associations
      const associations: SequelizeAssociation[] = [];
      const assocPattern = /(\w+)\.(belongsTo|hasOne|hasMany|belongsToMany)\s*\(\s*(\w+)/g;
      let assocMatch;

      while ((assocMatch = assocPattern.exec(content)) !== null) {
        associations.push({
          type: assocMatch[2] as SequelizeAssociation['type'],
          target: assocMatch[3],
        });
      }

      return {
        orm: 'sequelize',
        name,
        file,
        tableName,
        columns,
        associations,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect Mongoose schemas
   */
  private detectMongoose(): MongooseSchema[] {
    const schemas: MongooseSchema[] = [];
    const patterns = [
      'src/**/*.schema.ts',
      'src/**/schemas/*.ts',
      'models/**/*.ts',
      'src/models/**/*.ts',
    ];

    for (const pattern of patterns) {
      const files = this.glob(pattern);
      for (const file of files) {
        const schema = this.parseMongooseSchema(file);
        if (schema) schemas.push(schema);
      }
    }

    return schemas;
  }

  /**
   * Parse Mongoose schema file
   */
  private parseMongooseSchema(file: string): MongooseSchema | undefined {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for mongoose patterns
      if (!content.includes('mongoose') && !content.includes('Schema')) return undefined;

      const schemaMatch = content.match(/const\s+(\w+)Schema\s*=\s*new\s+Schema/);
      const name = schemaMatch?.[1] || 'Unknown';

      const collectionMatch = content.match(/collection:\s*['"]([^'"]+)['"]/);
      const collection = collectionMatch?.[1];

      // Parse fields
      const fields: MongooseField[] = [];
      const fieldPattern = /(\w+):\s*\{[^}]*type:\s*([\w[\]]+)(?:[^}]*)\}/g;
      let fieldMatch;

      while ((fieldMatch = fieldPattern.exec(content)) !== null) {
        const fieldSection = content.substring(fieldMatch.index, fieldMatch.index + fieldMatch[0].length);

        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          isRequired: fieldSection.includes('required: true'),
          isIndex: fieldSection.includes('index: true'),
          isUnique: fieldSection.includes('unique: true'),
          ref: fieldSection.match(/ref:\s*['"]([^'"]+)['"]/)?.[1],
        });
      }

      return {
        orm: 'mongoose',
        name,
        file,
        collection,
        fields,
        hasTimestamps: content.includes('timestamps: true'),
        hasIndexes: content.includes('.index(') || fields.some(f => f.isIndex),
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Detect which databases are used
   */
  private detectDatabases(
    prisma: PrismaSchema | undefined,
    typeorm: TypeormEntity[],
    sequelize: SequelizeModel[],
    mongoose: MongooseSchema[]
  ): string[] {
    const databases = new Set<string>();

    // From Prisma
    if (prisma) {
      databases.add(prisma.datasource.provider);
    }

    // From TypeORM
    if (typeorm.length > 0) {
      // Check for MongoDB in TypeORM
      if (typeorm.some(e => e.columns.some(c => c.type.toLowerCase().includes('objectid')))) {
        databases.add('mongodb');
      } else {
        databases.add('sql'); // Generic SQL database
      }
    }

    // From Sequelize
    if (sequelize.length > 0) {
      databases.add('sql');
    }

    // From Mongoose
    if (mongoose.length > 0) {
      databases.add('mongodb');
    }

    return [...databases];
  }

  /**
   * Simple glob implementation
   */
  private glob(pattern: string): string[] {
    const files: string[] = [];
    const regex = this.globToRegex(pattern);

    const traverse = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!entry.name.includes('node_modules') && !entry.name.includes('.git')) {
              traverse(fullPath);
            }
          } else if (regex.test(fullPath.replace(this.projectPath, ''))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    traverse(this.projectPath);
    return files;
  }

  /**
   * Convert glob to regex
   */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');
    return new RegExp(escaped);
  }
}

/**
 * Analyze database schemas and ORMs in project
 */
export function analyzeDatabase(projectPath: string): DatabaseDetection {
  const detector = new DatabaseDetector(projectPath);
  return detector.detect();
}
