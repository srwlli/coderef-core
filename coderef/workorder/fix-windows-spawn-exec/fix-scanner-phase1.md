---
name: Fix Windows spawn issue with exec
overview: Replace Node.js spawn() with exec() in scanExecutor.ts to fix Windows cmd.exe ENOENT error. This will unblock Phase 0 (Directories) and Phase 2 (Populate) execution on Windows by using exec's automatic shell resolution instead of manual shell path configuration.
todos:
  - id: update-imports
    content: Add exec and promisify imports to scanExecutor.ts
    status: pending
  - id: refactor-directories
    content: Replace spawn() with execAsync() in runDirectoriesForProject() method
    status: pending
    dependencies:
      - update-imports
  - id: refactor-populate
    content: Replace spawn() with execAsync() in runPopulateForProject() method
    status: pending
    dependencies:
      - update-imports
  - id: test-phase0
    content: Test Phase 0 (Directories) execution on Windows via Scanner UI
    status: pending
    dependencies:
      - refactor-directories
  - id: test-phase2
    content: Test Phase 2 (Populate) execution on Windows (if applicable)
    status: pending
    dependencies:
      - refactor-populate
  - id: verify-output
    content: Verify output streams correctly to SSE/UI and directories are created
    status: pending
    dependencies:
      - test-phase0
  - id: test-error-handling
    content: Test error handling with invalid project paths
    status: pending
    dependencies:
      - refactor-directories
      - refactor-populate
---

# Fix Windows spawn() Issue - Replace with exec()

## Problem Statement

Node.js `spawn()` on Windows cannot find or execute `cmd.exe` when using the `shell` option, causing Phase 0 (Directories) and Phase 2 (Populate) to fail with:

```
[ERROR] Failed to start Python: spawn C:\WINDOWS\system32\cmd.exe ENOENT
```

The Python scripts work correctly from CLI, but Node.js subprocess execution fails due to environment variable inheritance issues in Windows.

## Solution

Replace `spawn()` with `exec()` (promisified) which automatically handles shell resolution on Windows. This is a minimal change that maintains the same functionality while fixing the Windows compatibility issue.

## Files to Modify

### Primary File

- **`packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`**
  - Update imports (add `exec` and `promisify`)
  - Modify `runDirectoriesForProject()` method (~lines 188-201)
  - Modify `runPopulateForProject()` method (~lines 328-340)

## Implementation Steps

### Step 1: Update Imports

**File:** `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`

Add to existing imports:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
```

### Step 2: Refactor `runDirectoriesForProject()`

**File:** `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`

**Location:** ~lines 188-201

**Current implementation uses:**

- `spawn(pythonCmd, [dirsScriptPath, projectPath], spawnOptions)`
- Event-based output handling (`stdout.on('data')`)
- Manual shell configuration for Windows

**Replace with:**

- `execAsync(commandString, options)` where commandString is properly quoted
- Promise-based execution with try/catch
- Line-by-line output emission from buffered stdout/stderr
- Automatic shell resolution (no manual shell config needed)

**Key changes:**

1. Build command string: `"${pythonCmd}" "${dirsScriptPath}" "${projectPath}"`
2. Use `execAsync()` with `cwd` and `maxBuffer` options
3. Split stdout/stderr by newlines and emit each line
4. Handle errors via try/catch (execAsync throws on non-zero exit)

### Step 3: Refactor `runPopulateForProject()`

**File:** `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`

**Location:** ~lines 328-340

Apply the same pattern as Step 2:

- Replace `spawn()` with `execAsync()`
- Use properly quoted command string
- Emit output line-by-line from buffered result
- Update error messages to say "Populate" instead of "Directories"

### Step 4: Handle Process Cancellation (Optional Enhancement)

**File:** `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`

If `cancelScan()` needs to kill running processes:

- Store `exec()` ChildProcess reference in `this.currentProcess`
- Use `childProcess.kill()` for cancellation
- Note: `exec()` returns a ChildProcess that can be killed

## Code Pattern Reference

**Before (spawn):**

```typescript
const childProcess = spawn(pythonCmd, [scriptPath, projectPath], {
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: path.dirname(scriptPath),
  shell: process.env.COMSPEC || 'cmd.exe', // FAILS on Windows
});

childProcess.stdout?.on('data', (data) => {
  this.emitOutput(data.toString());
});
```

**After (exec):**

```typescript
const command = `"${pythonCmd}" "${scriptPath}" "${projectPath}"`;

try {
  const { stdout, stderr } = await execAsync(command, {
    cwd: path.dirname(scriptPath),
    maxBuffer: 10 * 1024 * 1024, // 10MB
  });
  
  if (stdout) {
    stdout.split('\n').forEach(line => {
      if (line.trim()) this.emitOutput(line + '\n');
    });
  }
} catch (error: any) {
  throw new Error(`Failed: ${error.stderr || error.message}`);
}
```

## Testing Checklist

### Manual Testing

- [ ] Phase 0 (Directories) executes successfully on Windows
- [ ] Output appears in SSE stream (may be buffered vs real-time)
- [ ] Error messages display correctly when script fails
- [ ] Phase 2 (Populate) executes successfully (if using same pattern)
- [ ] Process cancellation works (if implemented)

### Verification Steps

1. Start dashboard dev server
2. Navigate to Scanner page
3. Select a project and enable "Directories" phase
4. Start scan and verify:

   - No `spawn cmd.exe ENOENT` errors
   - Directories are created in project path
   - Output streams to UI correctly

5. Test error case: Use invalid project path, verify error handling

## Trade-offs

**Pros:**

- ✅ Works on Windows (exec handles shell automatically)
- ✅ Minimal code changes
- ✅ Simpler error handling (try/catch)
- ✅ No shell path configuration needed

**Cons:**

- ⚠️ Output is buffered (not real-time streaming)
- ⚠️ Less granular control over process lifecycle
- ⚠️ Slightly higher memory usage for large output

**Impact:** Low risk, well-tested Node.js API. Output buffering is acceptable since Python scripts run quickly.

## Success Criteria

- Phase 0 (Directories) executes without `spawn cmd.exe ENOENT` errors
- Directories are created successfully in target project
- Output appears in Scanner UI (may be delayed vs real-time)
- Phase 2 (Populate) works if same pattern applied
- Error handling works correctly for invalid inputs

## Related Files

- `packages/coderef-core/scripts/setup-coderef-dir/setup_coderef_dirs.py` - Python script (no changes needed, works correctly)
- `packages/coderef-core/scripts/setup-coderef-dir/USAGE.md` - Update integration status once fixed

---

## Future Enhancement: Pure TypeScript Port

### Overview

After this fix is complete and verified, consider porting the directory creation functionality to pure TypeScript. This would eliminate the Python dependency entirely and align Phase 0 with Phase 1 (which is already pure TypeScript).

### Benefits

**1. Eliminate Subprocess Overhead**
- No Python runtime required
- No subprocess spawn/exec overhead
- Faster execution (in-process vs subprocess)

**2. Consistency with Phase 1**
- Phase 1 (Scan) is already pure TypeScript
- Phase 0 (Directories) would match the architecture
- Unified codebase, no mixed Python/TypeScript

**3. Better Integration**
- Type-safe directory creation
- Direct access to Node.js fs APIs
- No command-line argument parsing needed
- Better error handling with TypeScript types

**4. Deployment Simplification**
- No Python installation required
- One less dependency to manage
- Works in all environments (Windows, macOS, Linux)

**5. Developer Experience**
- Single language codebase
- Better IDE support (autocomplete, type checking)
- Easier debugging (no subprocess boundaries)

### Implementation Approach

**New File:** `packages/coderef-core/src/utils/directory-setup.ts`

```typescript
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface DirectoryStructure {
  parent: string;
  subdirs: string[];
}

export interface SetupResult {
  success: boolean;
  created: string[];
  skipped: string[];
  errors: string[];
}

const DEFAULT_STRUCTURE: DirectoryStructure[] = [
  {
    parent: '.coderef',
    subdirs: ['reports/complexity', 'diagrams', 'exports']
  },
  {
    parent: 'coderef',
    subdirs: ['workorder', 'archived', 'standards', 'documents', 'resource', 'user', 'notes']
  }
];

export function createCoderefStructure(
  projectPath: string,
  structure: DirectoryStructure[] = DEFAULT_STRUCTURE,
  dryRun: boolean = false
): SetupResult {
  const result: SetupResult = {
    success: true,
    created: [],
    skipped: [],
    errors: []
  };

  for (const { parent, subdirs } of structure) {
    const parentDir = join(projectPath, parent);
    
    // Create parent directory
    if (!dryRun) {
      try {
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
          result.created.push(parentDir);
        } else {
          result.skipped.push(parentDir);
        }
      } catch (error: any) {
        result.errors.push(`Failed to create ${parentDir}: ${error.message}`);
        result.success = false;
        continue;
      }
    }

    // Create subdirectories
    for (const sub of subdirs) {
      const subDir = join(parentDir, sub);
      if (!dryRun) {
        try {
          if (!existsSync(subDir)) {
            mkdirSync(subDir, { recursive: true });
            result.created.push(subDir);
          } else {
            result.skipped.push(subDir);
          }
        } catch (error: any) {
          result.errors.push(`Failed to create ${subDir}: ${error.message}`);
          result.success = false;
        }
      }
    }
  }

  return result;
}
```

**Integration in scanExecutor.ts:**

```typescript
import { createCoderefStructure } from '@coderef-dashboard/core/utils/directory-setup';

private async runDirectoriesForProject(projectPath: string): Promise<void> {
  try {
    this.emitOutput(`[Directories] Creating structure in: ${projectPath}\n`);
    
    const result = createCoderefStructure(projectPath);
    
    // Emit results
    result.created.forEach(dir => {
      this.emitOutput(`[CREATE] ${dir}\n`);
    });
    result.skipped.forEach(dir => {
      this.emitOutput(`[EXISTS] ${dir}\n`);
    });
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        this.emitOutput(`[ERROR] ${error}\n`);
      });
      throw new Error(`Directory creation failed: ${result.errors.join(', ')}`);
    }
    
    this.emitOutput(`[Directories] Successfully created ${result.created.length} directories\n`);
  } catch (error: any) {
    this.emitOutput(`[ERROR] Directory creation failed: ${error.message}\n`);
    throw error;
  }
}
```

### Migration Strategy

**Phase 1: Create TypeScript Implementation**
1. Create `src/utils/directory-setup.ts` with `createCoderefStructure()` function
2. Add unit tests (mirror Python test cases)
3. Export from `src/index.ts`

**Phase 2: Update scanExecutor.ts**
1. Replace `execAsync()` call with direct function call
2. Remove Python command detection logic (no longer needed)
3. Update error handling for TypeScript exceptions

**Phase 3: Deprecate Python Script**
1. Mark Python script as deprecated in USAGE.md
2. Keep Python script for backward compatibility (CLI usage)
3. Update documentation to recommend TypeScript version

**Phase 4: Remove Python Dependency (Future)**
1. Remove Python script entirely
2. Update all documentation
3. Remove Python-related code from scanExecutor

### Testing Requirements

- [ ] Unit tests for `createCoderefStructure()` (idempotency, dry-run, error handling)
- [ ] Integration test in scanExecutor
- [ ] Verify same directory structure as Python script
- [ ] Test on Windows, macOS, Linux
- [ ] Performance comparison (TypeScript vs Python subprocess)

### Estimated Effort

- **Implementation:** 2-3 hours (function + tests)
- **Integration:** 1 hour (update scanExecutor)
- **Testing:** 1-2 hours (manual + automated)
- **Total:** 4-6 hours

### When to Do This

**Good timing:**
- After current fix is verified and stable
- When refactoring scanExecutor for other improvements
- When removing other Python dependencies
- As part of a larger "eliminate subprocess dependencies" initiative

**Priority:** Medium (nice-to-have, not urgent)

The current `exec()` fix solves the immediate problem. The TypeScript port is a quality-of-life improvement that can be done when convenient.
