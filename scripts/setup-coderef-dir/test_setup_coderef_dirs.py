/**
 * @coderef-semantic: 1.0.0
 * @exports: [TestSetupCoderefDirs]
 */

"""
---
resource_sheet: coderef/reference/Setup-Coderef-Dir-RESOURCE-SHEET.md
related_script: scripts/setup-coderef-dir/setup_coderef_dirs.py
---
"""

import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

# Add the script to the path so we can import it
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from setup_coderef_dirs import create_structure

EXPECTED_DIRS = [
    '.coderef',
    '.coderef/config',
    '.coderef/diagrams',
    '.coderef/discovery',
    '.coderef/exports',
    '.coderef/reports',
    '.coderef/reports/complexity',
    '.coderef/sessions',
    'coderef',
    'coderef/archived',
    'coderef/foundation-docs',
    'coderef/knowledge',
    'coderef/resources-sheets',
    'coderef/schemas',
    'coderef/standards',
    'coderef/working',
    'coderef/workorder',
]


class TestSetupCoderefDirs(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.project_path = Path(self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_create_structure_creates_all_dirs_and_files(self):
        """Test that the canonical directories and placeholder files are created."""
        result = create_structure(str(self.project_path), dry_run=False)

        self.assertTrue(result['success'])

        for rel_path in EXPECTED_DIRS:
            full_path = self.project_path / rel_path
            self.assertTrue(full_path.exists(), f"Expected directory {rel_path} to exist")

        index_path = self.project_path / '.coderef/index.json'
        graph_path = self.project_path / '.coderef/graph.json'
        ignore_path = self.project_path / '.coderefignore'

        self.assertTrue(index_path.exists())
        self.assertTrue(graph_path.exists())
        self.assertTrue(ignore_path.exists())
        self.assertEqual(
            json.loads(index_path.read_text(encoding='utf-8')),
            {
                'version': '2.0.0',
                'generated': '',
                'project': '',
                'elements': [],
            },
        )
        self.assertEqual(
            json.loads(graph_path.read_text(encoding='utf-8')),
            {
                'version': '2.0.0',
                'generated': '',
                'nodes': [],
                'edges': [],
            },
        )
        self.assertIn(
            '# CodeRef project-specific ignore patterns',
            ignore_path.read_text(encoding='utf-8'),
        )

        self.assertGreaterEqual(len(result['created_dirs']), len(EXPECTED_DIRS))
        self.assertEqual(len(result['created_files']), 3)

    def test_dry_run_does_not_create_dirs_or_files(self):
        """Test that dry-run does not create directories or files."""
        result = create_structure(str(self.project_path), dry_run=True)

        self.assertTrue(result['success'])
        self.assertFalse((self.project_path / '.coderef').exists())
        self.assertFalse((self.project_path / 'coderef').exists())
        self.assertFalse((self.project_path / '.coderef/index.json').exists())
        self.assertFalse((self.project_path / '.coderef/graph.json').exists())
        self.assertFalse((self.project_path / '.coderefignore').exists())

    def test_idempotency_skips_existing_dirs_and_files(self):
        """Test that reruns skip existing directories and do not overwrite files."""
        result1 = create_structure(str(self.project_path), dry_run=False)
        self.assertTrue(result1['success'])

        index_path = self.project_path / '.coderef/index.json'
        ignore_path = self.project_path / '.coderefignore'
        index_path.write_text(json.dumps({'custom': True}), encoding='utf-8')
        ignore_path.write_text('# keep me\n', encoding='utf-8')

        result2 = create_structure(str(self.project_path), dry_run=False)
        self.assertTrue(result2['success'])
        self.assertTrue(len(result2['skipped_dirs']) >= len(EXPECTED_DIRS))
        self.assertIn(str(index_path), result2['skipped_files'])
        self.assertIn(str(self.project_path / '.coderef/graph.json'), result2['skipped_files'])
        self.assertIn(str(ignore_path), result2['skipped_files'])
        self.assertEqual(json.loads(index_path.read_text(encoding='utf-8')), {'custom': True})
        self.assertEqual(ignore_path.read_text(encoding='utf-8'), '# keep me\n')


if __name__ == '__main__':
    unittest.main()
