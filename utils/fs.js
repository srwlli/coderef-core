// coderef-core/utils/fs.ts
import fs from 'fs';
import path from 'path';
/**
 * Normalizes a file path for use in Coderef tags
 * Removes 'src/' prefix, replaces backslashes, removes file extension
 */
export function normalizeCoderefPath(filePath) {
    return filePath
        .replace(/^(?:src|app|lib)[\\/]/, '') // Remove common prefixes (src/, app/, lib/)
        .replace(/\\/g, '/') // Windows slashes → POSIX
        .replace(/\.(ts|js|tsx|jsx|py|java)$/, ''); // Drop extension
}
/**
 * Ensures a directory exists, creating it if necessary
 */
export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
/**
 * Reads a file and returns its contents as lines
 */
export function readLines(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split(/\r?\n/);
}
/**
 * Writes lines back to a file
 */
export function writeLines(filePath, lines) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}
/**
 * Safely loads a JSON file with error handling
 */
export function loadJsonFile(filePath, defaultValue) {
    try {
        if (!fs.existsSync(filePath)) {
            return defaultValue;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error loading JSON from ${filePath}:`, error);
        return defaultValue;
    }
}
/**
 * Safely saves a JSON file with error handling
 */
export function saveJsonFile(filePath, data) {
    try {
        ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    }
    catch (error) {
        console.error(`Error saving JSON to ${filePath}:`, error);
        return false;
    }
}
/**
 * Recursively collect all files of a given extension in a directory
 */
export function collectFiles(root, ext = 'ts', exclude = ['node_modules', 'dist', 'build']) {
    const results = [];
    const extensions = Array.isArray(ext) ? ext : [ext];
    function isExcluded(dirPath) {
        return exclude.some(pattern => dirPath.includes(pattern));
    }
    function walk(dir) {
        if (isExcluded(dir))
            return;
        fs.readdirSync(dir).forEach(name => {
            const fullPath = path.join(dir, name);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            }
            else {
                const fileExt = path.extname(fullPath).substring(1); // Remove the '.'
                if (extensions.includes(fileExt)) {
                    results.push(fullPath);
                }
            }
        });
    }
    walk(root);
    return results;
}
/**
 * Gets the relative path between two absolute paths
 */
export function getRelativePath(from, to) {
    // Normalize paths
    const normalizedFrom = path.resolve(from);
    const normalizedTo = path.resolve(to);
    // Get relative path
    let relativePath = path.relative(path.dirname(normalizedFrom), normalizedTo);
    // Ensure forward slashes for consistency
    relativePath = relativePath.replace(/\\/g, '/');
    // Add ./ prefix if needed
    if (!relativePath.startsWith('.')) {
        relativePath = `./${relativePath}`;
    }
    return relativePath;
}
//# sourceMappingURL=fs.js.map