const { ASTElementScanner } = require('./dist/src/analyzer/ast-element-scanner.js');
const path = require('path');

const testFile = path.join('C:', 'Users', 'willh', 'Desktop', 'test-ast-malformed.ts');
const basePath = path.join('C:', 'Users', 'willh', 'Desktop');

console.log('Base path:', basePath);
console.log('Test file:', testFile);

const scanner = new ASTElementScanner(basePath);
const result = scanner.scanFile(testFile);

console.log('Elements found:', result.length);
console.log('Elements:', JSON.stringify(result, null, 2));
