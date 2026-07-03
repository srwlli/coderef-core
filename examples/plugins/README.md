# Plugins (removed)

The plugin system for custom analyzers/detectors was **removed during the pipeline
rebuild** (P2, commit `3bbd97a`). The former `example-detector/` sample lived here and is
no longer functional against the current single-pass pipeline.

If you need the original example for reference, recover it from git history:

```bash
# List the last commit that still contained the example
git log --oneline -- examples/plugins/example-detector

# Restore the tree at that commit (replace <sha> with the hash above)
git checkout <sha> -- examples/plugins/example-detector
```

Detector/analyzer extension is now handled inside the pipeline itself
(`src/analyzer/` detectors + `src/pipeline/`), not via an external plugin contract.
