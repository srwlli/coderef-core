/**
 * @coderef-semantic: 1.0.0
 * @exports EntityRecord, RegistryState, EntityLookup
 * @used_by src/registry/entity-registry.ts
 */

/**
 * Represents a unique code entity (function, class, component, etc.)
 */

export interface EntityRecord {
  /** Deterministic UUID5 based on file, name, and line */
  uuid: string;
  name: string;
  type: string;
  file: string;
  line: number;
  /** Optional end line for scope tracking */
  endLine?: number;
  /** Language-specific parameters or signatures */
  parameters?: any[];
  /** Return type or exported name */
  returns?: string;
  /** Raw metadata extracted by the scanner */
  metadata?: Record<string, any>;
}

/**
 * The full state of the project entity registry
 */
export interface RegistryState {
  /** Mapping of UUID to its canonical record */
  entities: Record<string, EntityRecord>;
  /** Mapping of file paths to the list of entity UUIDs they contain */
  fileMap: Record<string, string[]>;
  /** Statistics for reporting */
  stats: {
    totalEntities: number;
    distinctFiles: number;
    typeBreakdown: Record<string, number>;
  };
}

/**
 * Input for creating or finding an entity
 */
export interface EntityLookup {
  name: string;
  file: string;
  line: number;
  type?: EntityRecord['type'];
}
