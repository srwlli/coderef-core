/**
 * IMP-CORE-035: JavaScript Module Analyzer
 * Extracts imports and exports from AST
 */

import { ModuleImport, ModuleExport } from './types.js';

/**
 * Extract imports from AST
 */
export function extractImportsFromAST(ast: any, imports: ModuleImport[]): void {
  if (!ast || typeof ast !== 'object') return;

  // ESM import: import { foo } from './bar'
  if (ast.type === 'ImportDeclaration') {
    const specifiers: string[] = [];
    let isDefault = false;

    for (const spec of ast.specifiers || []) {
      if (spec.type === 'ImportDefaultSpecifier') {
        specifiers.push('default');
        isDefault = true;
      } else if (spec.type === 'ImportSpecifier' && spec.imported) {
        specifiers.push(spec.imported.name);
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        specifiers.push('*');
      }
    }

    imports.push({
      source: ast.source.value,
      importType: 'esm',
      specifiers,
      line: ast.loc?.start.line || 0,
      isDefault,
    });
  }

  // CommonJS require: const foo = require('./bar')
  if (ast.type === 'CallExpression' &&
      ast.callee?.type === 'Identifier' &&
      ast.callee.name === 'require' &&
      ast.arguments[0]?.type === 'Literal') {

    imports.push({
      source: ast.arguments[0].value,
      importType: 'commonjs',
      specifiers: ['*'],
      line: ast.loc?.start.line || 0,
      isDefault: false,
    });
  }

  // Dynamic import: import('./module') or await import('./module')
  if (ast.type === 'CallExpression' &&
      ast.callee?.type === 'Import' &&
      ast.arguments[0]) {

    let source = '<dynamic>';

    // Try to extract the module path
    if (ast.arguments[0].type === 'Literal') {
      source = ast.arguments[0].value;
    } else if (ast.arguments[0].type === 'TemplateLiteral') {
      const quasis = ast.arguments[0].quasis || [];
      if (quasis.length > 0 && quasis[0].value?.cooked) {
        source = quasis[0].value.cooked + '...';
      }
    }

    imports.push({
      source,
      importType: 'esm',
      specifiers: ['*'],
      line: ast.loc?.start.line || 0,
      isDefault: false,
      dynamic: true,
    });
  }

  // Recursively traverse
  for (const key in ast) {
    const child = ast[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        extractImportsFromAST(item, imports);
      }
    } else if (child && typeof child === 'object') {
      extractImportsFromAST(child, imports);
    }
  }
}

/**
 * Extract exports from AST
 */
export function extractExportsFromAST(ast: any, exports: ModuleExport[]): void {
  if (!ast || typeof ast !== 'object') return;

  // ESM export: export { foo, bar }
  if (ast.type === 'ExportNamedDeclaration') {
    const specifiers: string[] = [];

    for (const spec of ast.specifiers || []) {
      if (spec.exported?.name) {
        specifiers.push(spec.exported.name);
      }
    }

    // export const foo = ...
    if (ast.declaration) {
      if (ast.declaration.type === 'VariableDeclaration') {
        for (const decl of ast.declaration.declarations) {
          if (decl.id?.name) {
            specifiers.push(decl.id.name);
          }
        }
      } else if (ast.declaration.id?.name) {
        specifiers.push(ast.declaration.id.name);
      }
    }

    if (specifiers.length > 0) {
      exports.push({
        exportType: 'esm',
        specifiers,
        line: ast.loc?.start.line || 0,
        isDefault: false,
      });
    }
  }

  // ESM default export: export default foo
  if (ast.type === 'ExportDefaultDeclaration') {
    const specifier = ast.declaration?.id?.name || ast.declaration?.name || 'default';

    exports.push({
      exportType: 'esm',
      specifiers: [specifier],
      line: ast.loc?.start.line || 0,
      isDefault: true,
    });
  }

  // CommonJS: module.exports = {...}
  if (ast.type === 'AssignmentExpression' &&
      ast.left?.type === 'MemberExpression' &&
      ast.left.object?.name === 'module' &&
      ast.left.property?.name === 'exports') {

    const specifiers: string[] = [];

    if (ast.right?.type === 'ObjectExpression') {
      for (const prop of ast.right.properties || []) {
        if (prop.key?.name) {
          specifiers.push(prop.key.name);
        }
      }
    } else {
      specifiers.push('default');
    }

    exports.push({
      exportType: 'commonjs',
      specifiers,
      line: ast.loc?.start.line || 0,
      isDefault: specifiers.includes('default'),
    });
  }

  // CommonJS: exports.foo = ...
  if (ast.type === 'AssignmentExpression' &&
      ast.left?.type === 'MemberExpression' &&
      ast.left.object?.name === 'exports' &&
      ast.left.property?.name) {

    exports.push({
      exportType: 'commonjs',
      specifiers: [ast.left.property.name],
      line: ast.loc?.start.line || 0,
      isDefault: false,
    });
  }

  // Recursively traverse
  for (const key in ast) {
    const child = ast[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        extractExportsFromAST(item, exports);
      }
    } else if (child && typeof child === 'object') {
      extractExportsFromAST(child, exports);
    }
  }
}
