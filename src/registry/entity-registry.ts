/**
 * @semantic
 * exports: [EntityRegistry]
 * used_by: [src/pipeline/generators/graph-output.ts, src/pipeline/generators/registry-generator.ts, src/pipeline/graph-builder.ts, src/pipeline/orchestrator.ts, src/pipeline/semantic-elements.ts]
 */

import * as crypto from 'crypto';
import { EntityRecord, RegistryState, EntityLookup } from './types';

/**
 * UUID Namespace for CodeRef (Deterministic v5 generation)
 */
const CODEREF_NAMESPACE = Buffer.from('e8e16e6e16e64ed697882947a195f269', 'hex');

export class EntityRegistry {
  private state: RegistryState = {
    entities: {},
    fileMap: {},
    stats: {
      totalEntities: 0,
      distinctFiles: 0,
      typeBreakdown: {}
    }
  };

  /**
   * Generates a deterministic UUID5 for a code entity
   */
  public generateUUID(file: string, name: string, line: number): string {
    const data = `${file}:${name}:${line}`;
    const hash = crypto.createHash('sha1');
    hash.update(CODEREF_NAMESPACE);
    hash.update(data);
    const bytes = hash.digest();

    // Set version to 5 (v5 = 0101xxxx)
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    // Set variant to RFC4122 (10xxxxxx)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString('hex');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');
  }

  /**
   * Registers a code entity in the global state
   */
  public register(record: Omit<EntityRecord, 'uuid'>): string {
    const uuid = this.generateUUID(record.file, record.name, record.line);
    
    if (this.state.entities[uuid]) {
      return uuid; // Already registered
    }

    const entity: EntityRecord = { ...record, uuid };
    this.state.entities[uuid] = entity;

    // Track file mapping
    if (!this.state.fileMap[entity.file]) {
      this.state.fileMap[entity.file] = [];
      this.state.stats.distinctFiles++;
    }
    this.state.fileMap[entity.file].push(uuid);

    // Update stats
    this.state.stats.totalEntities++;
    const type = entity.type || 'unknown';
    this.state.stats.typeBreakdown[type] = (this.state.stats.typeBreakdown[type] || 0) + 1;

    return uuid;
  }

  /**
   * Look up an entity's UUID without registering it
   */
  public lookup(info: EntityLookup): string {
    return this.generateUUID(info.file, info.name, info.line);
  }

  public getEntity(uuid: string): EntityRecord | undefined {
    return this.state.entities[uuid];
  }

  public getEntitiesByFile(file: string): EntityRecord[] {
    const uuids = this.state.fileMap[file] || [];
    return uuids.map(id => this.state.entities[id]);
  }

  public getState(): RegistryState {
    return this.state;
  }

  /**
   * Resets the registry state
   */
  public clear(): void {
    this.state = {
      entities: {},
      fileMap: {},
      stats: {
        totalEntities: 0,
        distinctFiles: 0,
        typeBreakdown: {}
      }
    };
  }
}

// Export singleton instance for scanner access
export const globalRegistry = new EntityRegistry();
