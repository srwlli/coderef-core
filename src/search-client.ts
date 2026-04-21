/**
 * Client-safe search exports (types only + singleton instance)
 * This file can be imported in browser/client components
 */

export type {
  SearchIndexEntry,
  SearchResult,
  SearchOptions,
  TagCloudEntry,
  SearchStatistics
} from './search/search-engine';

export { SearchEngine, searchEngine } from './search/search-engine';
