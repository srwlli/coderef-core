# ScanExecutor Test Specification
## Workorder: WO-CODEREF-CLI-IMPLEMENTATION-001

**Location:** `packages/dashboard/src/app/api/scanner/lib/__tests__/scanExecutor.test.ts`

**Purpose:** Test caching and parallel file generation in scanExecutor

---

## Part 2: ScanExecutor Caching Tests

### Test 1: Cache Property Exists
```typescript
it('should have scanResults cache property', () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-1',
  });
  
  expect(executor['scanResults']).toBeDefined();
  expect(executor['scanResults']).toBeInstanceOf(Map);
});
```

### Test 2: Cache Results After Scan
```typescript
it('should cache scan results in runScanForProject()', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-2',
  });
  
  // Mock scanCurrentElements to return test data
  const mockElements: ElementData[] = [/* ... */];
  vi.spyOn(require('@coderef/core'), 'scanCurrentElements')
    .mockResolvedValue(mockElements);
  
  await executor['runScanForProject']('/test/project');
  
  const cached = executor['scanResults'].get('/test/project');
  expect(cached).toBeDefined();
  expect(cached).toEqual(mockElements);
});
```

### Test 3: Use Cached Results on Second Scan
```typescript
it('should use cached results when scanning same project twice', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-3',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  const scanSpy = vi.spyOn(require('@coderef/core'), 'scanCurrentElements')
    .mockResolvedValue(mockElements);
  
  // First scan
  await executor['runScanForProject']('/test/project');
  expect(scanSpy).toHaveBeenCalledTimes(1);
  
  // Second scan (should use cache)
  await executor['runScanForProject']('/test/project');
  expect(scanSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
});
```

### Test 4: Cache Per Project Path
```typescript
it('should cache results per project path', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/project1', '/project2'],
    scanId: 'test-4',
  });
  
  const elements1: ElementData[] = [{ name: 'func1', /* ... */ }];
  const elements2: ElementData[] = [{ name: 'func2', /* ... */ }];
  
  vi.spyOn(require('@coderef/core'), 'scanCurrentElements')
    .mockImplementation((path) => {
      if (path === '/project1') return Promise.resolve(elements1);
      if (path === '/project2') return Promise.resolve(elements2);
      return Promise.resolve([]);
    });
  
  await executor['runScanForProject']('/project1');
  await executor['runScanForProject']('/project2');
  
  expect(executor['scanResults'].get('/project1')).toEqual(elements1);
  expect(executor['scanResults'].get('/project2')).toEqual(elements2);
});
```

---

## Part 3: Parallel File Generation Tests

### Test 5: Replace runPopulateForProject with runGenerateForProject
```typescript
it('should have runGenerateForProject method (not runPopulateForProject)', () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-5',
  });
  
  expect(executor['runGenerateForProject']).toBeDefined();
  expect(typeof executor['runGenerateForProject']).toBe('function');
  expect(executor['runPopulateForProject']).toBeUndefined();
});
```

### Test 6: Parallel Execution of File Generation
```typescript
it('should execute file generation functions in parallel', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-6',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  executor['scanResults'].set('/test/project', mockElements);
  
  const saveIndexSpy = vi.spyOn(require('@coderef/core'), 'saveIndex')
    .mockResolvedValue(undefined);
  const generateContextSpy = vi.spyOn(require('@coderef/core'), 'generateContext')
    .mockResolvedValue(undefined);
  const buildGraphSpy = vi.spyOn(require('@coderef/core'), 'buildDependencyGraph')
    .mockResolvedValue({} as DependencyGraph);
  
  const startTime = Date.now();
  await executor['runGenerateForProject']('/test/project');
  const duration = Date.now() - startTime;
  
  // All three should be called
  expect(saveIndexSpy).toHaveBeenCalledWith('/test/project', mockElements);
  expect(generateContextSpy).toHaveBeenCalledWith('/test/project', mockElements);
  expect(buildGraphSpy).toHaveBeenCalledWith('/test/project', mockElements);
  
  // Should complete faster than sequential (rough check)
  // Parallel should be < 3x sequential time
  expect(duration).toBeLessThan(3000); // Adjust based on mock delays
});
```

### Test 7: Use Cached Elements for Generation
```typescript
it('should use cached elements from scanResults for file generation', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-7',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  executor['scanResults'].set('/test/project', mockElements);
  
  const saveIndexSpy = vi.spyOn(require('@coderef/core'), 'saveIndex');
  
  await executor['runGenerateForProject']('/test/project');
  
  // Should use cached elements, not re-scan
  expect(saveIndexSpy).toHaveBeenCalledWith('/test/project', mockElements);
});
```

### Test 8: Error Handling in Parallel Execution
```typescript
it('should handle errors in parallel file generation gracefully', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-8',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  executor['scanResults'].set('/test/project', mockElements);
  
  vi.spyOn(require('@coderef/core'), 'saveIndex').mockRejectedValue(new Error('Save failed'));
  vi.spyOn(require('@coderef/core'), 'generateContext').mockResolvedValue(undefined);
  vi.spyOn(require('@coderef/core'), 'buildDependencyGraph').mockResolvedValue({} as DependencyGraph);
  
  await expect(executor['runGenerateForProject']('/test/project')).rejects.toThrow();
});
```

### Test 9: Output Messages for File Generation
```typescript
it('should emit output messages for file generation', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-9',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  executor['scanResults'].set('/test/project', mockElements);
  
  const outputSpy = vi.spyOn(executor, 'emitOutput');
  
  vi.spyOn(require('@coderef/core'), 'saveIndex').mockResolvedValue(undefined);
  vi.spyOn(require('@coderef/core'), 'generateContext').mockResolvedValue(undefined);
  vi.spyOn(require('@coderef/core'), 'buildDependencyGraph').mockResolvedValue({} as DependencyGraph);
  
  await executor['runGenerateForProject']('/test/project');
  
  expect(outputSpy).toHaveBeenCalledWith(
    expect.stringContaining('[Generate] Generating coderef files')
  );
  expect(outputSpy).toHaveBeenCalledWith(
    expect.stringContaining('[Generate] Completed')
  );
});
```

---

## Part 4: Integration Tests

### Test 10: Full Workflow with Caching and Generation
```typescript
it('should complete full workflow: scan → cache → generate files', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-10',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  const scanSpy = vi.spyOn(require('@coderef/core'), 'scanCurrentElements')
    .mockResolvedValue(mockElements);
  const saveIndexSpy = vi.spyOn(require('@coderef/core'), 'saveIndex')
    .mockResolvedValue(undefined);
  const generateContextSpy = vi.spyOn(require('@coderef/core'), 'generateContext')
    .mockResolvedValue(undefined);
  const buildGraphSpy = vi.spyOn(require('@coderef/core'), 'buildDependencyGraph')
    .mockResolvedValue({} as DependencyGraph);
  
  // Start scan (will call runScanForProject and runGenerateForProject)
  await executor.startScan();
  
  // Verify scan was called
  expect(scanSpy).toHaveBeenCalledTimes(1);
  
  // Verify cache was populated
  expect(executor['scanResults'].get('/test/project')).toEqual(mockElements);
  
  // Verify all generation functions were called
  expect(saveIndexSpy).toHaveBeenCalledWith('/test/project', mockElements);
  expect(generateContextSpy).toHaveBeenCalledWith('/test/project', mockElements);
  expect(buildGraphSpy).toHaveBeenCalledWith('/test/project', mockElements);
});
```

### Test 11: No Re-scanning on Second Run
```typescript
it('should not re-scan when running same project twice', async () => {
  const executor = new ScanExecutor({
    projectPaths: ['/test/project'],
    scanId: 'test-11',
  });
  
  const mockElements: ElementData[] = [/* ... */];
  const scanSpy = vi.spyOn(require('@coderef/core'), 'scanCurrentElements')
    .mockResolvedValue(mockElements);
  
  // First run
  await executor.startScan();
  expect(scanSpy).toHaveBeenCalledTimes(1);
  
  // Second run (should use cache)
  executor['status'] = 'idle'; // Reset status
  await executor.startScan();
  expect(scanSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
});
```

---

## Expected Test Results

After implementation, all tests should pass:

- ✅ Cache property exists and is a Map
- ✅ Results cached after scan
- ✅ Cached results used on second scan (no re-scanning)
- ✅ Cache per project path (isolated)
- ✅ runGenerateForProject exists (replaces runPopulateForProject)
- ✅ Parallel execution (all 3 functions called)
- ✅ Uses cached elements (not re-scanning)
- ✅ Error handling works
- ✅ Output messages emitted
- ✅ Full workflow works end-to-end
- ✅ No re-scanning on second run

---

## Implementation Notes

1. **Cache Property:** Add `private scanResults = new Map<string, ElementData[]>();` around line 60
2. **Cache in runScanForProject:** Add `this.scanResults.set(projectPath, elements);` after line 261
3. **Replace runPopulateForProject:** Delete lines 314-381, replace with runGenerateForProject (40 lines)
4. **Imports:** Add `saveIndex, generateContext, buildDependencyGraph` to imports from '@coderef/core'
