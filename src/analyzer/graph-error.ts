/**
 * GraphError - Custom error for graph operations
 * Used for validation and error handling in graph loading/saving
 */

export class GraphError extends Error {
  constructor(
    message: string,
    public code: GraphErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GraphError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export enum GraphErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  MISSING_NODES = 'MISSING_NODES',
  MISSING_EDGES = 'MISSING_EDGES',
  INVALID_NODE = 'INVALID_NODE',
  INVALID_EDGE = 'INVALID_EDGE',
  INVALID_REFERENCE = 'INVALID_REFERENCE',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
}
