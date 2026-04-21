/**
 * Normalizes a file path for use in Coderef tags
 * Removes 'src/' prefix, replaces backslashes, removes file extension
 */
export declare function normalizeCoderefPath(filePath: string): string;
/**
 * Ensures a directory exists, creating it if necessary
 */
export declare function ensureDir(dirPath: string): void;
/**
 * Reads a file and returns its contents as lines
 */
export declare function readLines(filePath: string): string[];
/**
 * Writes lines back to a file
 */
export declare function writeLines(filePath: string, lines: string[]): void;
/**
 * Safely loads a JSON file with error handling
 */
export declare function loadJsonFile<T>(filePath: string, defaultValue: T): T;
/**
 * Safely saves a JSON file with error handling
 */
export declare function saveJsonFile(filePath: string, data: any): boolean;
/**
 * Recursively collect all files of a given extension in a directory
 */
export declare function collectFiles(root: string, ext?: string | string[], exclude?: string[]): string[];
/**
 * Gets the relative path between two absolute paths
 */
export declare function getRelativePath(from: string, to: string): string;
//# sourceMappingURL=fs.d.ts.map