// coderef-core/scanner.ts
import * as fs from 'fs';
import * as path from 'path';
/**
 * Pattern configurations by language
 */
export const LANGUAGE_PATTERNS = {
    // TypeScript/JavaScript patterns
    ts: [
        // Function declarations
        { type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        // Arrow functions (const/let/var)
        { type: 'function', pattern: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g, nameGroup: 1 },
        // Class declarations
        { type: 'class', pattern: /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        // React components (function style)
        { type: 'component', pattern: /(?:export\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_$]*)\s*(?:=|\()/g, nameGroup: 1 },
        // React hooks
        { type: 'hook', pattern: /(?:export\s+)?(?:function|const)\s+(use[A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
        // Class methods
        { type: 'method', pattern: /(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, nameGroup: 1 }
    ],
    // Same patterns for JavaScript
    js: [
        { type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'function', pattern: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g, nameGroup: 1 },
        { type: 'class', pattern: /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'component', pattern: /(?:export\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_$]*)\s*(?:=|\()/g, nameGroup: 1 },
        { type: 'hook', pattern: /(?:export\s+)?(?:function|const)\s+(use[A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
        { type: 'method', pattern: /(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, nameGroup: 1 }
    ],
    // Add patterns for .tsx and .jsx
    tsx: [
        { type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'function', pattern: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g, nameGroup: 1 },
        { type: 'class', pattern: /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'component', pattern: /(?:export\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_$]*)\s*(?:=|\()/g, nameGroup: 1 },
        { type: 'hook', pattern: /(?:export\s+)?(?:function|const)\s+(use[A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
        { type: 'method', pattern: /(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, nameGroup: 1 }
    ],
    jsx: [
        { type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'function', pattern: /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g, nameGroup: 1 },
        { type: 'class', pattern: /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'component', pattern: /(?:export\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_$]*)\s*(?:=|\()/g, nameGroup: 1 },
        { type: 'hook', pattern: /(?:export\s+)?(?:function|const)\s+(use[A-Z][a-zA-Z0-9_$]*)/g, nameGroup: 1 },
        { type: 'method', pattern: /(?:public|private|protected|async)?\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, nameGroup: 1 }
    ],
    // Python patterns
    py: [
        { type: 'function', pattern: /def\s+([a-zA-Z0-9_]+)\s*\(/g, nameGroup: 1 },
        { type: 'class', pattern: /class\s+([a-zA-Z0-9_]+)\s*(?:\(|:)/g, nameGroup: 1 },
        { type: 'method', pattern: /\s+def\s+([a-zA-Z0-9_]+)\s*\(self/g, nameGroup: 1 }
    ]
};
// Default supported languages
const DEFAULT_SUPPORTED_LANGS = ['ts', 'js', 'tsx', 'jsx', 'py'];
/**
 * Scanner class to manage state and context
 */
class Scanner {
    constructor() {
        this.elements = [];
        this.currentFile = null;
        this.currentLine = null;
        this.currentPattern = null;
        // Initialize empty scanner
    }
    addElement(element) {
        this.elements.push(element);
    }
    processLine(line, lineNumber, file, pattern, type, nameGroup) {
        this.currentLine = lineNumber;
        this.currentPattern = pattern;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
            const name = match[nameGroup];
            if (name) {
                this.addElement({
                    type,
                    name,
                    file,
                    line: lineNumber
                });
            }
        }
    }
    processFile(file, content, patterns, includeComments) {
        this.currentFile = file;
        const lines = content.split('\n');
        for (const { type, pattern, nameGroup } of patterns) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!includeComments && isLineCommented(line)) {
                    continue;
                }
                this.processLine(line, i + 1, file, pattern, type, nameGroup);
            }
        }
    }
    getElements() {
        return this.elements;
    }
}
// Export the Scanner class
export { Scanner };
/**
 * Scans the current codebase for code elements (functions, classes, components, hooks)
 * @param dir Directory to scan
 * @param lang File extension to scan (or array of extensions)
 * @param options Additional scanning options
 * @returns Array of code elements with their type, name, file and line number
 */
export async function scanCurrentElements(dir, lang = 'ts', options = {}) {
    const scanner = new Scanner();
    const langs = Array.isArray(lang) ? lang : [lang];
    // Default options
    const { include = undefined, exclude = ['**/node_modules/**', '**/dist/**', '**/build/**'], recursive = true, langs: optionLangs = [], customPatterns = [], includeComments = false, verbose = false } = options;
    // Combine langs from args and options
    const allLangs = [...new Set([...langs, ...optionLangs])];
    if (verbose) {
        console.log('Scanner config:', {
            dir,
            langs: allLangs,
            include,
            exclude,
            recursive
        });
    }
    // Resolve the directory path and keep Windows format for fs operations
    const resolvedDir = path.resolve(dir);
    if (verbose) {
        console.log(`Resolved directory: ${resolvedDir}`);
    }
    // Validate languages
    for (const currentLang of allLangs) {
        if (!LANGUAGE_PATTERNS[currentLang] && !DEFAULT_SUPPORTED_LANGS.includes(currentLang)) {
            console.warn(`Warning: Language '${currentLang}' is not officially supported. Using generic patterns.`);
            LANGUAGE_PATTERNS[currentLang] = [
                { type: 'function', pattern: /function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
                { type: 'class', pattern: /class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 }
            ];
        }
    }
    // Add custom patterns
    for (const customPattern of customPatterns) {
        if (!LANGUAGE_PATTERNS[customPattern.lang]) {
            LANGUAGE_PATTERNS[customPattern.lang] = [];
        }
        LANGUAGE_PATTERNS[customPattern.lang].push({
            type: customPattern.type,
            pattern: customPattern.pattern,
            nameGroup: customPattern.nameGroup
        });
    }
    try {
        let files = [];
        if (verbose) {
            console.log(`Scanning directory: ${resolvedDir}`);
        }
        // Get all files in the directory with proper path handling
        const allFiles = fs.readdirSync(resolvedDir, { withFileTypes: true });
        if (verbose) {
            console.log(`Found ${allFiles.length} entries in directory`);
            console.log('Directory entries:', allFiles.map(f => f.name));
            console.log('Supported languages:', allLangs);
        }
        // Process each entry
        for (const entry of allFiles) {
            const fullPath = path.join(resolvedDir, entry.name);
            if (entry.isDirectory()) {
                if (recursive) {
                    if (verbose) {
                        console.log(`Recursively scanning directory: ${fullPath}`);
                    }
                    // Recursively scan subdirectories
                    const subDirElements = await scanCurrentElements(fullPath, allLangs, {
                        ...options,
                        recursive: true
                    });
                    for (const element of subDirElements) {
                        scanner.addElement(element);
                    }
                }
                else if (verbose) {
                    console.log(`Skipping directory (recursive=false): ${fullPath}`);
                }
                continue;
            }
            if (!entry.isFile()) {
                if (verbose) {
                    console.log(`Skipping non-file: ${entry.name}`);
                }
                continue;
            }
            const ext = path.extname(entry.name).substring(1);
            if (verbose) {
                console.log(`Checking file: ${entry.name} with extension: ${ext}`);
            }
            // Handle special cases for TypeScript/JavaScript
            let currentLang = ext;
            if (ext === 'tsx' && allLangs.includes('ts')) {
                currentLang = 'ts';
            }
            else if (ext === 'jsx' && allLangs.includes('js')) {
                currentLang = 'js';
            }
            const shouldInclude = allLangs.includes(currentLang);
            if (shouldInclude) {
                // Only normalize to forward slashes after fs operations
                const normalizedPath = fullPath.replace(/\\/g, '/');
                files.push(normalizedPath);
                if (verbose) {
                    console.log(`Including file: ${normalizedPath} (mapped to language: ${currentLang})`);
                }
            }
            else if (verbose) {
                console.log(`Skipping file with unsupported extension: ${entry.name} (extension: ${ext}, mapped to: ${currentLang})`);
            }
        }
        if (verbose) {
            console.log(`Found ${files.length} files to process:`, files);
        }
        // Process files
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                let currentLang = path.extname(file).substring(1);
                // Map .tsx to .ts patterns
                if (currentLang === 'tsx') {
                    currentLang = 'ts';
                }
                if (verbose) {
                    console.log(`Processing file: ${file} with language: ${currentLang}`);
                }
                const patterns = LANGUAGE_PATTERNS[currentLang] || [];
                if (patterns.length === 0) {
                    if (verbose) {
                        console.log(`No patterns found for language: ${currentLang}`);
                    }
                    continue;
                }
                if (!includeComments && isEntirelyCommented(content)) {
                    if (verbose) {
                        console.log(`Skipping entirely commented file: ${file}`);
                    }
                    continue;
                }
                scanner.processFile(file, content, patterns, includeComments);
            }
            catch (error) {
                if (verbose) {
                    console.error(`Error processing file ${file}:`, error);
                }
            }
        }
    }
    catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
    }
    return scanner.getElements();
}
/**
 * Checks if a line is commented out
 */
export function isLineCommented(line) {
    // Remove leading whitespace
    const trimmed = line.trim();
    // Check for single-line comments
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}
/**
 * Checks if a file appears to be entirely comments or typings
 */
function isEntirelyCommented(content) {
    // Check for .d.ts-like files
    if (content.includes('declare module') || content.includes('declare namespace')) {
        return true;
    }
    const nonEmptyLines = content.split('\n').filter(line => line.trim().length > 0);
    const commentedLines = nonEmptyLines.filter(isLineCommented);
    // Consider a file all comments if >90% of non-empty lines are comments
    return commentedLines.length > nonEmptyLines.length * 0.9;
}
/**
 * Registry to register custom element pattern recognizers
 */
export const ScannerRegistry = {
    /**
     * Register a custom pattern for recognizing elements
     */
    registerPattern(lang, type, pattern, nameGroup = 1) {
        if (!LANGUAGE_PATTERNS[lang]) {
            LANGUAGE_PATTERNS[lang] = [];
        }
        LANGUAGE_PATTERNS[lang].push({
            type,
            pattern,
            nameGroup
        });
    },
    /**
     * Get all registered patterns for a language
     */
    getPatterns(lang) {
        return LANGUAGE_PATTERNS[lang] || [];
    },
    /**
     * Check if a language is supported
     */
    isLanguageSupported(lang) {
        return Boolean(LANGUAGE_PATTERNS[lang]) || DEFAULT_SUPPORTED_LANGS.includes(lang);
    },
    /**
     * Get all supported languages
     */
    getSupportedLanguages() {
        return [...Object.keys(LANGUAGE_PATTERNS), ...DEFAULT_SUPPORTED_LANGS];
    }
};
//# sourceMappingURL=scanner.js.map