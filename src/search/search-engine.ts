/**
 * Advanced Search Engine
 *
 * Provides enhanced search capabilities for document content:
 * - Cross-document search
 * - Full-text search with ranking
 * - Metadata search
 * - Section-specific search
 * - Tag-based filtering
 * - Relevance scoring
 */

/**
 * Search index entry
 */
export interface SearchIndexEntry {
  documentKey: string;
  documentName: string;
  projectId: number;
  content: string;
  sections: {
    title: string;
    content: string;
  }[];
  metadata: Record<string, any>;
  tags: string[];
  lastUpdated: string;
  wordCount: number;
}

/**
 * Search result
 */
export interface SearchResult {
  documentKey: string;
  documentName: string;
  projectId: number;
  score: number;
  matches: {
    field: string;
    excerpts: string[];
  }[];
  matchCount: number;
  metadata: Record<string, any>;
  tags: string[];
  lastUpdated: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  projectId?: number;
  includeSections?: boolean;
  includeMetadata?: boolean;
  matchWholeWords?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
  sortBy?: 'relevance' | 'lastUpdated' | 'wordCount';
  tags?: string[];
  requiredFields?: string[];
  filterMetadata?: Record<string, any>;
  minScore?: number;
}

/**
 * Search index
 */
export class SearchIndex {
  private documents: Map<string, SearchIndexEntry> = new Map();

  /**
   * Adds a document to the search index
   * @param document Document to add
   */
  addDocument(document: SearchIndexEntry): void {
    this.documents.set(this.getDocumentId(document), document);
  }

  /**
   * Removes a document from the search index
   * @param documentKey Document key
   * @param projectId Project ID
   * @returns True if document was removed
   */
  removeDocument(documentKey: string, projectId: number): boolean {
    const documentId = this.getDocumentIdFromKeys(documentKey, projectId);
    return this.documents.delete(documentId);
  }

  /**
   * Updates a document in the search index
   * @param document Document to update
   * @returns True if document was updated
   */
  updateDocument(document: SearchIndexEntry): boolean {
    const documentId = this.getDocumentId(document);
    const exists = this.documents.has(documentId);

    if (exists) {
      this.documents.set(documentId, document);
    }

    return exists;
  }

  /**
   * Gets a document from the search index
   * @param documentKey Document key
   * @param projectId Project ID
   * @returns Document or undefined if not found
   */
  getDocument(documentKey: string, projectId: number): SearchIndexEntry | undefined {
    const documentId = this.getDocumentIdFromKeys(documentKey, projectId);
    return this.documents.get(documentId);
  }

  /**
   * Gets all documents in the search index
   * @returns Array of all documents
   */
  getAllDocuments(): SearchIndexEntry[] {
    return Array.from(this.documents.values());
  }

  /**
   * Gets document count in the search index
   * @returns Number of documents
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Gets unique document ID
   * @param document Document
   * @returns Document ID
   */
  private getDocumentId(document: SearchIndexEntry): string {
    return `${document.projectId}:${document.documentKey}`;
  }

  /**
   * Gets unique document ID from keys
   * @param documentKey Document key
   * @param projectId Project ID
   * @returns Document ID
   */
  private getDocumentIdFromKeys(documentKey: string, projectId: number): string {
    return `${projectId}:${documentKey}`;
  }

  /**
   * Performs a search across indexed documents
   * @param query Search query
   * @param options Search options
   * @returns Search results
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    // Default options
    const {
      projectId,
      includeSections = true,
      includeMetadata = true,
      matchWholeWords = false,
      caseSensitive = false,
      maxResults = 50,
      sortBy = 'relevance',
      tags = [],
      requiredFields = [],
      filterMetadata = {},
      minScore = 0.1
    } = options;

    // Prepare query
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const queryWords = this.tokenizeQuery(searchQuery);

    // Maintain a map of scores to avoid duplicated calculation
    const documentScores = new Map<string, number>();
    const documentMatches = new Map<string, { field: string; excerpts: string[] }[]>();
    const documentMatchCounts = new Map<string, number>();

    // Find matching documents
    const matchingDocuments: SearchIndexEntry[] = [];

    for (const document of this.documents.values()) {
      // Filter by project ID
      if (projectId !== undefined && document.projectId !== projectId) {
        continue;
      }

      // Filter by tags
      if (tags.length > 0 && !tags.every(tag => document.tags.includes(tag))) {
        continue;
      }

      // Filter by metadata
      if (Object.keys(filterMetadata).length > 0) {
        let metadataMatch = true;

        for (const [key, value] of Object.entries(filterMetadata)) {
          if (document.metadata[key] !== value) {
            metadataMatch = false;
            break;
          }
        }

        if (!metadataMatch) {
          continue;
        }
      }

      // Initialize matches for this document
      const matches: { field: string; excerpts: string[] }[] = [];
      let matchCount = 0;
      let score = 0;

      // Search in document content
      const contentMatches = this.findMatches(
        document.content,
        searchQuery,
        queryWords,
        matchWholeWords,
        caseSensitive
      );

      if (contentMatches.count > 0) {
        matches.push({
          field: 'content',
          excerpts: contentMatches.excerpts
        });

        matchCount += contentMatches.count;

        // Calculate content score (highest weight)
        score += contentMatches.count * 1.0;
      }

      // Search in sections
      if (includeSections) {
        for (const section of document.sections) {
          const sectionMatches = this.findMatches(
            section.content,
            searchQuery,
            queryWords,
            matchWholeWords,
            caseSensitive
          );

          if (sectionMatches.count > 0) {
            matches.push({
              field: `section:${section.title}`,
              excerpts: sectionMatches.excerpts
            });

            matchCount += sectionMatches.count;

            // Calculate section score (medium weight)
            score += sectionMatches.count * 0.8;
          }
        }
      }

      // Search in metadata
      if (includeMetadata) {
        for (const [key, value] of Object.entries(document.metadata)) {
          if (typeof value === 'string') {
            const metadataMatches = this.findMatches(
              value,
              searchQuery,
              queryWords,
              matchWholeWords,
              caseSensitive
            );

            if (metadataMatches.count > 0) {
              matches.push({
                field: `metadata:${key}`,
                excerpts: metadataMatches.excerpts
              });

              matchCount += metadataMatches.count;

              // Calculate metadata score (low weight)
              score += metadataMatches.count * 0.5;
            }
          }
        }
      }

      // Search in tags
      for (const tag of document.tags) {
        const tagMatches = this.findMatches(
          tag,
          searchQuery,
          queryWords,
          matchWholeWords,
          caseSensitive
        );

        if (tagMatches.count > 0) {
          matches.push({
            field: 'tag',
            excerpts: [tag]
          });

          matchCount += tagMatches.count;

          // Calculate tag score (high weight)
          score += tagMatches.count * 1.2;
        }
      }

      // Search in document name
      const nameMatches = this.findMatches(
        document.documentName,
        searchQuery,
        queryWords,
        matchWholeWords,
        caseSensitive
      );

      if (nameMatches.count > 0) {
        matches.push({
          field: 'name',
          excerpts: [document.documentName]
        });

        matchCount += nameMatches.count;

        // Calculate name score (highest weight)
        score += nameMatches.count * 1.5;
      }

      // Calculate final score
      score = score / (queryWords.length * 5); // Normalize to 0-1 range

      // Check if required fields have matches
      if (requiredFields.length > 0) {
        const matchedFields = matches.map(m => m.field);

        if (!requiredFields.every(field => matchedFields.includes(field))) {
          continue;
        }
      }

      // Only include documents with matches
      if (matchCount > 0 && score >= minScore) {
        matchingDocuments.push(document);
        documentScores.set(this.getDocumentId(document), score);
        documentMatches.set(this.getDocumentId(document), matches);
        documentMatchCounts.set(this.getDocumentId(document), matchCount);
      }
    }

    // Sort matching documents
    const sortedDocuments = [...matchingDocuments].sort((a, b) => {
      if (sortBy === 'lastUpdated') {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      } else if (sortBy === 'wordCount') {
        return b.wordCount - a.wordCount;
      } else {
        // Sort by relevance (score)
        const scoreA = documentScores.get(this.getDocumentId(a)) || 0;
        const scoreB = documentScores.get(this.getDocumentId(b)) || 0;

        return scoreB - scoreA;
      }
    });

    // Limit results
    const limitedDocuments = sortedDocuments.slice(0, maxResults);

    // Create search results
    const results = limitedDocuments.map(document => {
      const documentId = this.getDocumentId(document);

      return {
        documentKey: document.documentKey,
        documentName: document.documentName,
        projectId: document.projectId,
        score: documentScores.get(documentId) || 0,
        matches: documentMatches.get(documentId) || [],
        matchCount: documentMatchCounts.get(documentId) || 0,
        metadata: document.metadata,
        tags: document.tags,
        lastUpdated: document.lastUpdated
      };
    });

    return results;
  }

  /**
   * Tokenizes a search query into words
   * @param query Search query
   * @returns Array of query words
   */
  private tokenizeQuery(query: string): string[] {
    // Remove special characters and split into words
    return query
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Finds matches in text
   * @param text Text to search in
   * @param query Full search query
   * @param queryWords Individual query words
   * @param matchWholeWords Whether to match whole words
   * @param caseSensitive Whether search is case sensitive
   * @returns Match results
   */
  private findMatches(
    text: string,
    query: string,
    queryWords: string[],
    matchWholeWords: boolean,
    caseSensitive: boolean
  ): { count: number; excerpts: string[] } {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const maxExcerpts = 3;
    const excerptLength = 40;
    const excerpts: string[] = [];
    let count = 0;

    // Check for exact phrase match
    const phraseCount = this.countOccurrences(searchText, query, matchWholeWords);
    count += phraseCount;

    // Check for individual word matches
    for (const word of queryWords) {
      count += this.countOccurrences(searchText, word, matchWholeWords);
    }

    // Generate excerpts
    if (count > 0) {
      // Find positions of the matching words or phrase
      const positions: number[] = [];

      // Check for exact phrase match positions
      let phrasePos = searchText.indexOf(query);
      while (phrasePos !== -1) {
        positions.push(phrasePos);
        phrasePos = searchText.indexOf(query, phrasePos + 1);
      }

      // Check for individual word match positions
      for (const word of queryWords) {
        let wordPos = searchText.indexOf(word);
        while (wordPos !== -1) {
          positions.push(wordPos);
          wordPos = searchText.indexOf(word, wordPos + 1);
        }
      }

      // Sort positions
      positions.sort((a, b) => a - b);

      // Generate excerpts for unique positions
      const uniquePositions = Array.from(new Set(positions)).slice(0, maxExcerpts);

      for (const position of uniquePositions) {
        // Determine excerpt start and end
        let start = Math.max(0, position - excerptLength / 2);
        let end = Math.min(searchText.length, position + excerptLength / 2);

        // Adjust to word boundaries
        while (start > 0 && !/\s/.test(searchText[start])) {
          start--;
        }

        while (end < searchText.length && !/\s/.test(searchText[end])) {
          end++;
        }

        // Extract excerpt
        let excerpt = text.substring(start, end).trim();

        // Add ellipsis if needed
        if (start > 0) {
          excerpt = '...' + excerpt;
        }

        if (end < text.length) {
          excerpt = excerpt + '...';
        }

        excerpts.push(excerpt);
      }
    }

    return { count, excerpts };
  }

  /**
   * Counts occurrences of a substring in text
   * @param text Text to search in
   * @param substring Substring to search for
   * @param matchWholeWords Whether to match whole words
   * @returns Number of occurrences
   */
  private countOccurrences(text: string, substring: string, matchWholeWords: boolean): number {
    if (matchWholeWords) {
      const regex = new RegExp(`\\b${this.escapeRegExp(substring)}\\b`, 'g');
      const matches = text.match(regex);
      return matches ? matches.length : 0;
    } else {
      let count = 0;
      let pos = text.indexOf(substring);

      while (pos !== -1) {
        count++;
        pos = text.indexOf(substring, pos + 1);
      }

      return count;
    }
  }

  /**
   * Escapes special characters in a string for use in a regular expression
   * @param string String to escape
   * @returns Escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Tag cloud entry
 */
export interface TagCloudEntry {
  tag: string;
  count: number;
  weight: number; // 0-1 normalized weight for display
}

/**
 * Search statistics
 */
export interface SearchStatistics {
  totalDocuments: number;
  averageWordCount: number;
  topTags: TagCloudEntry[];
  documentCountByProject: Record<number, number>;
  mostRecentDocument: {
    key: string;
    name: string;
    lastUpdated: string;
  } | null;
}

/**
 * Search engine class
 */
export class SearchEngine {
  private index = new SearchIndex();

  /**
   * Gets the search index
   * @returns Search index
   */
  getIndex(): SearchIndex {
    return this.index;
  }

  /**
   * Performs a search
   * @param query Search query
   * @param options Search options
   * @returns Search results
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    return this.index.search(query, options);
  }

  /**
   * Indexes a document
   * @param document Document to index
   */
  indexDocument(document: SearchIndexEntry): void {
    this.index.addDocument(document);
  }

  /**
   * Removes a document from the index
   * @param documentKey Document key
   * @param projectId Project ID
   * @returns True if document was removed
   */
  removeDocument(documentKey: string, projectId: number): boolean {
    return this.index.removeDocument(documentKey, projectId);
  }

  /**
   * Updates a document in the index
   * @param document Document to update
   * @returns True if document was updated
   */
  updateDocument(document: SearchIndexEntry): boolean {
    return this.index.updateDocument(document);
  }

  /**
   * Gets document count in the search index
   * @returns Number of documents
   */
  getDocumentCount(): number {
    return this.index.getDocumentCount();
  }

  /**
   * Gets search statistics
   * @returns Search statistics
   */
  getStatistics(): SearchStatistics {
    const documents = this.index.getAllDocuments();

    // Calculate total documents
    const totalDocuments = documents.length;

    // Calculate average word count
    const totalWordCount = documents.reduce((sum, doc) => sum + doc.wordCount, 0);
    const averageWordCount = totalDocuments > 0 ? totalWordCount / totalDocuments : 0;

    // Calculate top tags
    const tagCounts: Record<string, number> = {};

    for (const document of documents) {
      for (const tag of document.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const tagEntries = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Calculate tag weights
    const maxTagCount = Math.max(...tagEntries.map(entry => entry.count));

    const topTags: TagCloudEntry[] = tagEntries.map(entry => ({
      tag: entry.tag,
      count: entry.count,
      weight: maxTagCount > 0 ? entry.count / maxTagCount : 0
    }));

    // Calculate document count by project
    const documentCountByProject: Record<number, number> = {};

    for (const document of documents) {
      documentCountByProject[document.projectId] = (documentCountByProject[document.projectId] || 0) + 1;
    }

    // Find most recent document
    let mostRecentDocument: { key: string; name: string; lastUpdated: string } | null = null;

    if (totalDocuments > 0) {
      const mostRecent = documents.reduce((latest, current) => {
        return new Date(latest.lastUpdated) > new Date(current.lastUpdated) ? latest : current;
      });

      mostRecentDocument = {
        key: mostRecent.documentKey,
        name: mostRecent.documentName,
        lastUpdated: mostRecent.lastUpdated
      };
    }

    return {
      totalDocuments,
      averageWordCount,
      topTags,
      documentCountByProject,
      mostRecentDocument
    };
  }

  /**
   * Creates a search index entry from document content
   * @param documentKey Document key
   * @param documentName Document name
   * @param projectId Project ID
   * @param content Document content
   * @param metadata Document metadata
   * @param tags Document tags
   * @returns Search index entry
   */
  createIndexEntry(
    documentKey: string,
    documentName: string,
    projectId: number,
    content: string,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ): SearchIndexEntry {
    // Extract sections from content
    const sections = this.extractSections(content);

    // Count words
    const wordCount = this.countWords(content);

    return {
      documentKey,
      documentName,
      projectId,
      content,
      sections,
      metadata,
      tags,
      lastUpdated: new Date().toISOString(),
      wordCount
    };
  }

  /**
   * Extracts sections from content
   * @param content Document content
   * @returns Array of sections
   */
  private extractSections(content: string): { title: string; content: string }[] {
    const sections: { title: string; content: string }[] = [];
    const sectionRegex = /^##\s+(.*?)$([\s\S]*?)(?=^##\s+|\s*$)/gm;
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      sections.push({
        title: match[1].trim(),
        content: match[2].trim()
      });
    }

    return sections;
  }

  /**
   * Counts words in text
   * @param text Text to count words in
   * @returns Word count
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Clears the search index
   */
  clearIndex(): void {
    this.index = new SearchIndex();
  }
}

// Create a singleton instance
export const searchEngine = new SearchEngine();
