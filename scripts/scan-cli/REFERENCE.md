# Scanner CLI Quick Reference

---

## Command Syntax

```bash
node scan.js <project_path>
```

**Placeholders:**
- `<project_path>` - Path to project directory (absolute or `.` for current)

---

## Options

| Flag | Description |
|------|-------------|
| `--help`, `-h` | Show usage instructions |

---

## Output Format

```
Scanning: <absolute_path>

Scan Results:
  Elements found: <count>     # Functions, classes, components, hooks, types
  Files scanned:  <count>     # Source files analyzed (.ts, .tsx, .js, .jsx)
  Duration:       <ms>        # Scan time in milliseconds

✓ Scan completed successfully
```

---

## Common Use Cases

**Scan current directory:**
```bash
node scan.js .
```

**Scan specific project:**
```bash
node scan.js C:\path\to\project
```

**Check help:**
```bash
node scan.js --help
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success - scan completed |
| `1` | Error - invalid path, scan failed, or no arguments provided |
