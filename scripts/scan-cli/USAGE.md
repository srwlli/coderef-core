# Scan CodeRef Elements

Scan a project directory and get code element statistics from the command line.

---

## Usage

**1. Navigate to your project:**
```bash
cd C:\path\to\your\project
```

**2. Run the scanner (use current directory):**
```bash
node C:\Users\willh\Desktop\coderef-dashboard\packages\coderef-core\scripts\scan-cli\scan.js .
```

**Or specify full path:**
```bash
node C:\Users\willh\Desktop\coderef-dashboard\packages\coderef-core\scripts\scan-cli\scan.js "C:\path\to\your\project"
```

**Show help:**
```bash
node C:\Users\willh\Desktop\coderef-dashboard\packages\coderef-core\scripts\scan-cli\scan.js --help
```

---

## What Gets Returned

The scanner analyzes your codebase and reports:

- **Elements found** - Functions, classes, components, hooks, interfaces, types
- **Files scanned** - Number of source files analyzed
- **Duration** - Scan time in milliseconds

**Example output:**
```
Scanning: C:\Users\willh\Desktop\coderef-dashboard

Scan Results:
  Elements found: 4761
  Files scanned:  335
  Duration:       1185ms

✓ Scan completed successfully
```

---

## Notes

- Fast in-memory scanning (no files written to disk)
- Supports TypeScript, JavaScript, TSX, JSX
- Uses AST parsing for accurate element detection
- Results are ephemeral (not saved unless .coderef/ exists)
