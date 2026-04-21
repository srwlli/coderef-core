/**
 * LLM Integration Module
 * Exports provider interfaces only (implementations loaded dynamically)
 */

export * from './llm-provider.js';
// Note: Provider implementations (openai-provider, anthropic-provider) must be imported directly
// to avoid loading optional dependencies (openai, @anthropic-ai/sdk) when not needed
