#!/usr/bin/env node
/**
 * Validate foundation docs against .coderef data
 * CI Gate Script - Workorder: WO-FOUNDATION-DOCS-001
 * 
 * Usage: node scripts/doc-gen/validate-docs.js [--strict]
 * 
 * Exit codes:
 *   0 - All docs valid and up-to-date
 *   1 - Validation failed (docs stale or missing)
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CODREF_DIR = path.join(PROJECT_ROOT, '.coderef');
const FOUNDATION_DOCS_DIR = path.join(PROJECT_ROOT, 'coderef', 'foundation-docs');

const REQUIRED_DOCS = ['INDEX.md', 'EXPORTS.md', 'HOTSPOTS.md', 'RELATIONSHIPS.md', 'API.md', 'COMPONENTS.md', 'ARCHITECTURE.md', 'SCHEMA.md'];

function getFileMtime(filepath) {
  try {
    return fs.statSync(filepath).mtimeMs;
  } catch {
    return 0;
  }
}

function readJson(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

function validateDocs() {
  const strict = process.argv.includes('--strict');
  const errors = [];
  const warnings = [];
  
  console.log('🔍 Validating foundation docs...\n');
  
  // Check required docs exist
  console.log('Checking required documents...');
  const missingDocs = [];
  REQUIRED_DOCS.forEach(doc => {
    const docPath = path.join(FOUNDATION_DOCS_DIR, doc);
    if (!fs.existsSync(docPath)) {
      missingDocs.push(doc);
    }
  });
  
  if (missingDocs.length > 0) {
    errors.push(`Missing required docs: ${missingDocs.join(', ')}`);
  } else {
    console.log('  ✓ All required docs present');
  }
  
  // Check freshness - .coderef should not be newer than docs
  console.log('\nChecking document freshness...');
  const indexJsonPath = path.join(CODREF_DIR, 'index.json');
  const indexMtime = getFileMtime(indexJsonPath);
  
  if (indexMtime === 0) {
    errors.push('.coderef/index.json not found');
  } else {
    const staleDocs = [];
    REQUIRED_DOCS.forEach(doc => {
      const docPath = path.join(FOUNDATION_DOCS_DIR, doc);
      const docMtime = getFileMtime(docPath);
      if (docMtime < indexMtime - 60000) { // Allow 1 minute tolerance
        staleDocs.push(doc);
      }
    });
    
    if (staleDocs.length > 0) {
      const msg = `Stale docs (older than index.json): ${staleDocs.join(', ')}`;
      if (strict) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    } else {
      console.log('  ✓ All docs are up-to-date');
    }
  }
  
  // Check UUID anchors in docs
  console.log('\nChecking UUID traceability...');
  const indexData = readJson(indexJsonPath);
  if (indexData && indexData.elements) {
    const validUuids = new Set(indexData.elements.map(e => e.uuid).filter(Boolean));
    
    let totalAnchors = 0;
    let validAnchors = 0;
    let invalidAnchors = [];
    
    REQUIRED_DOCS.forEach(doc => {
      const docPath = path.join(FOUNDATION_DOCS_DIR, doc);
      if (!fs.existsSync(docPath)) return;
      
      const content = fs.readFileSync(docPath, 'utf8');
      const uuidMatches = content.match(/<!-- coderef:uuid=([a-f0-9-]+) -->/g) || [];
      
      uuidMatches.forEach(match => {
        const uuid = match.replace('<!-- coderef:uuid=', '').replace(' -->', '');
        totalAnchors++;
        if (validUuids.has(uuid)) {
          validAnchors++;
        } else {
          invalidAnchors.push({ doc, uuid });
        }
      });
    });
    
    console.log(`  Found ${totalAnchors} UUID anchors (${validAnchors} valid)`);
    
    if (invalidAnchors.length > 0) {
      const msg = `${invalidAnchors.length} invalid UUID anchors found`;
      if (strict) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
      invalidAnchors.slice(0, 5).forEach(({ doc, uuid }) => {
        console.log(`    ⚠ ${doc}: ${uuid}`);
      });
    } else {
      console.log('  ✓ All UUID anchors valid');
    }
  }
  
  // Check auto-generation markers
  console.log('\nChecking auto-generation markers...');
  const newDocs = ['INDEX.md', 'EXPORTS.md', 'HOTSPOTS.md', 'RELATIONSHIPS.md'];
  let missingMarkers = 0;
  
  newDocs.forEach(doc => {
    const docPath = path.join(FOUNDATION_DOCS_DIR, doc);
    if (!fs.existsSync(docPath)) return;
    
    const content = fs.readFileSync(docPath, 'utf8');
    if (!content.includes('auto-generated') && !content.includes('Auto-generated')) {
      missingMarkers++;
    }
  });
  
  if (missingMarkers > 0) {
    warnings.push(`${missingMarkers} docs missing auto-generation markers`);
  } else {
    console.log('  ✓ Auto-generation markers present');
  }
  
  // Report results
  console.log('\n' + '='.repeat(50));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All validations passed!');
    return 0;
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('\nValidation failed. Run generation scripts to fix.');
    return 1;
  }
  
  console.log('\n⚠️  Validation completed with warnings');
  return 0;
}

process.exit(validateDocs());
