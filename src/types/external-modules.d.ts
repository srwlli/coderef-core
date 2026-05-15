/**
 * @coderef-semantic: 1.0.0
 * @exports OpenAI, Anthropic, ChromaClient, Collection, Pinecone
 */





/**
 * Type declarations for optional external dependencies
 * These modules are loaded dynamically and may not be installed
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'openai' {
  export default class OpenAI {
    constructor(config: any);
    embeddings: { create(params: any): Promise<any> };
    chat: { completions: { create(params: any): Promise<any> } };
  }
}

declare module '@anthropic-ai/sdk' {
  export default class Anthropic {
    constructor(config: any);
    messages: { create(params: any): Promise<any> };
  }
}

declare module 'tiktoken' {
  export function encoding_for_model(model: string): {
    encode(text: string): number[];
    free(): void;
  };
}

declare module 'chromadb' {
  export class ChromaClient {
    constructor(config: any);
    getOrCreateCollection(params: any): Promise<any>;
    deleteCollection(params: any): Promise<void>;
  }
  export class Collection {
    add(params: any): Promise<any>;
    upsert(params: any): Promise<any>;
    query(params: any): Promise<any>;
    count(): Promise<number>;
    get(params?: any): Promise<any>;
    delete(params: any): Promise<void>;
  }
}

declare module '@pinecone-database/pinecone' {
  export class Pinecone {
    constructor(config: any);
    listIndexes(): Promise<{ indexes?: Array<{ name: string }> }>;
    createIndex(params: any): Promise<void>;
    index(name: string): any;
    describeIndex(name: string): Promise<any>;
  }
}
