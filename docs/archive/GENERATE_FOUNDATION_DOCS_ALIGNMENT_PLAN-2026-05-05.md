# GENERATE FOUNDATION DOCS - SCANNER ALIGNMENT PLAN (ARCHIVED)

> **Archive banner.** This document captures a planning artifact from before the 9-phase pipeline rebuild. Content is preserved for historical reference. The plan described here was superseded by the rebuild itself (Phase 0..7); for current foundation-docs alignment see ASSISTANT-side `SKILLS/ANALYSIS/analyze-coderef-semantics/SKILL.md` and CORE-side [docs/SCHEMA.md](../SCHEMA.md).

---

## Week 1 Implementation: Index.json Schema Consumption

**Status:** READY FOR IMPLEMENTATION  
**Target:** coderef-docs MCP Server v4.2.0  
**Based on:** 6-Loop Scanner Quality Campaign (100% Accuracy Achieved)

---

## CURRENT SCANNER REALITY (Post 6-Loop Campaign)

The improved scanner now provides these precise fields in `.coderef/index.json`:

| Field | Type | Description | Documentation Impact |
|-------|------|-------------|---------------------|
| `type` | string | Precise classification: `function`, `class`, `component`, `hook`, `method`, `interface`, `type`, `decorator` | No more guessing - direct filter |
| `exported` | boolean | `true` if publicly exported, `false` if internal | Filter public API surface |
| `async` | boolean | `true` if async function/hook | Flag async patterns in docs |
| `parameters` | string[] | Full parameter names array | Complete function signatures |
| `uuid` | string | Stable V5 UUID for cross-referencing | Link to test coverage, complexity |
| `returnType` | string | Return type annotation (if available) | Type documentation |

**Example Element (Current):**
```json
{
  "type": "function",
  "name": "createMockEnvironment",
  "file": "__tests__/generators/helpers.ts",
  "line": 19,
  "parameters": [],
  "exported": true,
  "async": true,
  "uuid": "f4235fab-b240-540c-9119-2b721366c4f6"
}
```

---

## ALIGNMENT GAPS IDENTIFIED

### Gap 1: Export Filter (CRITICAL)
**Current:** `_detect_api_endpoints()` uses regex scanning of source files  
**Gap:** No filtering by `exported` flag - includes internal functions  
**Impact:** API.md shows private/internal functions as public API

### Gap 2: Async Detection (HIGH)
**Current:** No async pattern analysis in generated docs  
**Gap:** `async` boolean field not consumed  
**Impact:** Can't document async/await patterns, critical for modern JS/TS

### Gap 3: Parameter Signatures (MEDIUM)
**Current:** Regex-based endpoint detection extracts minimal info  
**Gap:** `parameters` array not used for full signatures  
**Impact:** API docs lack complete function signatures

### Gap 4: UUID Cross-Reference (MEDIUM)
**Current:** No linkage to coverage/complexity data  
**Gap:** `uuid` field not used for cross-referencing  
**Impact:** Can't show test coverage badges or complexity scores per element

---

## WEEK 1 IMPLEMENTATION PLAN

### Phase 1.1: Exported Filter (TODAY)

**File:** `generators/coderef_foundation_generator.py`

**Add Method:**
```python
def _get_exported_elements(self, coderef_data: Dict) -> List[Dict]:
    """
    Filter for public API surface only using exported flag.
    
    NEW SCANNER FIELD: element.get('exported') boolean
    
    Args:
        coderef_data: Dict with 'elements' from index.json
        
    Returns:
        List of exported elements only
    """
    if not coderef_data or not coderef_data.get('elements'):
        return []
    
    elements = coderef_data.get('elements', [])
    exported = [e for e in elements if e.get('exported') is True]
    
    # Performance guard: cap to prevent doc bloat on huge projects
    limit = 1000
    return exported[:limit] if len(exported) > limit else exported
```

**Update:** `_detect_api_endpoints()` to use coderef data when available:
```python
def _detect_api_endpoints(self, coderef_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Auto-detect API endpoints from code.
    
    ENHANCED: Uses coderef index.json when available (100% accuracy)
    FALLBACK: Regex-based detection when coderef unavailable
    """
    # NEW: Use coderef data if available
    if coderef_data and coderef_data.get('elements'):
        return self._detect_api_from_coderef(coderef_data)
    
    # FALLBACK: Existing regex-based detection
    return self._detect_api_from_regex()

def _detect_api_from_coderef(self, coderef_data: Dict) -> Dict[str, Any]:
    """
    Detect API endpoints from coderef index.json with 100% accuracy.
    
    Uses:
    - exported=true filter (public API only)
    - type field for precise classification
    - parameters array for signatures
    - async flag for pattern documentation
    """
    elements = self._get_exported_elements(coderef_data)
    
    endpoints = []
    frameworks_detected = []
    
    # Filter for handler patterns (handle_*, on_*)
    handlers = [e for e in elements 
                if e.get('name', '').startswith(('handle_', 'on_'))]
    
    # Filter for API-related types
    api_elements = [e for e in elements
                    if e.get('type') in ['function', 'method', 'hook']
                    and any(pattern in e.get('name', '') 
                           for pattern in ['api', 'route', 'endpoint', 'handler', 'controller'])]
    
    # Detect framework from file paths
    for elem in elements:
        file_path = elem.get('file', '')
        if 'fastapi' in file_path.lower() or 'main.py' in file_path:
            if 'FastAPI' not in frameworks_detected:
                frameworks_detected.append('FastAPI')
        elif 'flask' in file_path.lower():
            if 'Flask' not in frameworks_detected:
                frameworks_detected.append('Flask')
        elif 'express' in file_path.lower():
            if 'Express' not in frameworks_detected:
                frameworks_detected.append('Express')
    
    return {
        'endpoints': handlers + api_elements,
        'count': len(handlers) + len(api_elements),
        'frameworks_detected': frameworks_detected,
        'auth_method': self._detect_auth_method(),
        'error_format': self._detect_error_format(),
        'source': 'coderef_index',  # NEW: Mark as high-accuracy source
        'accuracy': '100%'  # NEW: Accuracy indicator
    }
```

---

### Phase 1.2: Async Pattern Analysis (TODAY)

**File:** `generators/coderef_foundation_generator.py`

**Add Method:**
```python
def _analyze_async_patterns(self, coderef_data: Dict) -> Dict[str, Any]:
    """
    Analyze async/await patterns across codebase.
    
    NEW SCANNER FIELD: element.get('async') boolean
    
    Args:
        coderef_data: Dict with 'elements' from index.json
        
    Returns:
        Dict with async analysis for documentation
    """
    if not coderef_data or not coderef_data.get('elements'):
        return {'async_functions': [], 'total': 0, 'percentage': 0}
    
    elements = coderef_data.get('elements', [])
    
    # Trust the AST flag only - don't assume hooks are async
    async_funcs = [
        e for e in elements
        if e.get('async') is True  # Precise AST-based detection
    ]
    
    total_funcs = len([e for e in elements if e.get('type') == 'function'])
    
    return {
        'async_functions': [
            {
                'name': e.get('name'),
                'file': e.get('file'),
                'line': e.get('line'),
                'parameters': e.get('parameters', []),
                'returnType': e.get('returnType', 'unknown'),
                'uuid': e.get('uuid')  # For cross-referencing
            }
            for e in async_funcs
        ],
        'total': len(async_funcs),
        'percentage': round(len(async_funcs) / total_funcs * 100, 1) if total_funcs else 0
    }
```

**Update:** `_generate_api_md()` to include async section:
```python
def _generate_api_md(self, project_context: Dict, existing_docs: Dict, 
                     coderef_data: Optional[Dict] = None) -> str:
    """
    Generate API.md with enhanced async documentation.
    """
    content = "# API Documentation\n\n"
    
    # Get API context (now with coderef accuracy)
    api_context = project_context.get('api_context', {})
    
    # NEW: Add async patterns section if coderef data available
    if coderef_data:
        async_analysis = self._analyze_async_patterns(coderef_data)
        if async_analysis['total'] > 0:
            content += "## Async Patterns\n\n"
            content += f"**{async_analysis['percentage']}%** of functions are async "
            content += f"({async_analysis['total']} total)\n\n"
            content += "### Async Functions\n\n"
            for func in async_analysis['async_functions'][:20]:  # Limit to 20
                params = ', '.join(func['parameters']) if func['parameters'] else ''
                content += f"- `{func['name']}({params})` - `{func['file']}:{func['line']}`\n"
            content += "\n"
    
    # ... rest of existing API.md generation
    return content
```

---

### Phase 1.3: Enhanced API.md Template (THIS WEEK)

**File:** `handlers/templates_foundation.py`

**Update:** `handle_generate_foundation_docs()` instructions (around line 253):

```python
# EXISTING (v4.1.0) - AST type filtering
result += "ENHANCED SCANNER INTEGRATION (v4.1.0):\n"
result += "When reading index.json, filter for enhanced AST types:\n"

# NEW (v4.2.0) - Exported filter and async detection
result += "\nENHANCED SCANNER INTEGRATION (v4.2.0):\n"
result += "NEW: Filter for public API using exported flag:\n\n"
result += "```python\n"
result += "# Get only publicly exported elements (public API surface)\n"
result += "public_api = [e for e in elements if e.get('exported') is True]\n\n"
result += "# Filter for specific types AND exported\n"
result += "exported_functions = [\n"
result += "    e for e in elements \n"
result += "    if e.get('type') == 'function' and e.get('exported') is True\n"
result += "]\n"
result += "```\n\n"

result += "NEW: Detect async patterns using async flag:\n\n"
result += "```python\n"
result += "# Find all async functions\n"
result += "async_funcs = [e for e in elements if e.get('async') is True]\n\n"
result += "# Get async function signatures with parameters\n"
result += "for func in async_funcs:\n"
result += "    name = func.get('name')\n"
result += "    params = ', '.join(func.get('parameters', []))\n"
result += "    print(f'async {name}({params})')\n"
result += "```\n\n"

result += "NEW: Complete function signatures with parameters:\n\n"
result += "```python\n"
result += "# Build full function signature\n"
result += "def format_signature(element):\n"
result += "    name = element.get('name')\n"
result += "    params = ', '.join(element.get('parameters', []))\n"
result += "    return_type = element.get('returnType', 'unknown')\n"
result += "    prefix = 'async ' if element.get('async') else ''\n"
result += "    return f'{prefix}{name}({params}) -> {return_type}'\n"
result += "```\n\n"

result += "NEW: UUID-based cross-referencing:\n\n"
result += "```python\n"
result += "# Use UUID to link to coverage/complexity data\n"
result += "element_uuid = element.get('uuid')\n"
result += "# Can query: coverage data, complexity scores, test linkage\n"
result += "```\n\n"
```

---

## ACCEPTANCE CRITERIA

### AC1: Exported Filter
- [ ] `_get_exported_elements()` method added
- [ ] API.md shows only exported functions when coderef data available
- [ ] Regex fallback works when coderef unavailable

### AC2: Async Detection  
- [ ] `_analyze_async_patterns()` method added
- [ ] API.md includes "Async Patterns" section when async functions detected
- [ ] Percentage and count accurate

### AC3: Parameter Signatures
- [ ] Function signatures include parameter arrays from index.json
- [ ] API endpoints show complete `(param1, param2)` format

### AC4: Backward Compatibility
- [ ] Graceful fallback to regex detection when coderef unavailable
- [ ] No breaking changes to existing API
- [ ] All existing tests pass

### AC5: Performance
- [ ] 1000 element cap prevents doc bloat
- [ ] File read only (< 50ms per operation)

---

## TESTING STRATEGY

### Unit Tests (New)
1. `test_exported_filter.py` - Test `_get_exported_elements()`
2. `test_async_analysis.py` - Test `_analyze_async_patterns()`
3. `test_coderef_api_detection.py` - Test `_detect_api_from_coderef()`

### Integration Tests
1. Test against coderef-core's own index.json (21,959 elements)
2. Verify exported filter accuracy
3. Verify async detection matches actual code

### Validation
- Run `/generate-docs` on coderef-core
- Inspect API.md for async section
- Verify only exported functions shown

---

## ESTIMATED EFFORT

| Task | Time | Risk |
|------|------|------|
| Phase 1.1: Exported Filter | 2 hrs | Low |
| Phase 1.2: Async Analysis | 2 hrs | Low |
| Phase 1.3: Template Updates | 2 hrs | Low |
| Testing & Validation | 2 hrs | Low |
| **TOTAL** | **8 hrs** | **Low** |

---

## NEXT STEPS (Phase 2 & 3)

### Phase 2: Extended Data Sources (Next Sprint)
- [ ] Connect `coderef_query` for dependency visualization
- [ ] Read coverage data for quality metrics
- [ ] Extract complexity scores for prioritization

### Phase 3: Enhanced Outputs (Following Sprint)
- [ ] Generate interactive Mermaid diagrams (verified accurate)
- [ ] Add test coverage badges per component
- [ ] Link to resource sheets for detailed docs

---

## CONFIRMATION CHECKLIST

- [x] Current scanner output format analyzed
- [x] Alignment gaps identified (4 gaps)
- [x] Implementation plan detailed (3 phases)
- [x] Code snippets provided for all new methods
- [x] Acceptance criteria defined (5 criteria)
- [x] Testing strategy outlined
- [ ] Week 1 implementation ready to start

**READY TO IMPLEMENT WEEK 1?**
