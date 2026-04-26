# Deploying `coderef-watch` per workspace

Per-OS instructions for running the `coderef-watch` daemon as a long-lived service in a consumer workspace. WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001.

---

## Operational expectation (read this first)

> **`coderef-watch` runs in the CONSUMER WORKSPACE, NOT in the LLOYD process.**
>
> Each consumer machine is responsible for starting one `coderef-watch` per active workspace. LLOYD does not spawn, supervise, or own the lifecycle of these daemons. LLOYD's only contract is to *read* the heartbeat at `{project_dir}/.coderef/last-scan.json` on every pre-prompt assembly. See [LLOYD-INTEGRATION.md](LLOYD-INTEGRATION.md) for the read pattern.

This document covers five start patterns in order of operational maturity:

1. **Manual** (foreground, no service manager) — for development / first-run smoke testing
2. **pm2** — Node-managed process supervisor; cross-platform; lowest setup cost
3. **systemd** (Linux) — system or user unit
4. **launchd** (macOS) — `LaunchAgent` (per-user) or `LaunchDaemon` (system)
5. **Windows Service via NSSM** or `sc.exe` — Windows-native service wrapper

Pick the one that matches the host. All five run the same binary with the same flags; only the supervisor changes.

---

## 1. Manual start (foreground)

Useful for first-run smoke testing and debugging. NOT recommended for long-running workspaces.

```bash
# From the workspace root
npx coderef-watch --project-dir "$(pwd)"

# Or with a non-default debounce window
npx coderef-watch --project-dir "$(pwd)" --debounce-ms 60000

# Debug: log changes only, no pipeline spawn
npx coderef-watch --project-dir "$(pwd)" --no-pipeline --json
```

`Ctrl-C` (SIGINT) stops cleanly. The heartbeat file remains; LLOYD will treat the daemon as stale once `alive_at` ages past its threshold.

---

## 2. pm2 (cross-platform)

[pm2](https://pm2.keymetrics.io/) is the lowest-setup option that works identically on Linux, macOS, and Windows.

### `ecosystem.config.js`

Place at the workspace root (or a central `~/.pm2/` config dir):

```javascript
module.exports = {
  apps: [
    {
      name: 'coderef-watch-{workspace-slug}',
      script: 'npx',
      args: 'coderef-watch --project-dir /abs/path/to/workspace',
      cwd: '/abs/path/to/workspace',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        // Optional: forward session events into LOGS/SESSIONS
        CODEREF_SESSION_ID: 'daily-agent-session-YYYY-MM-DD',
        CODEREF_AGENT_DOMAIN: 'CODEREF-CORE',
      },
      log_file: '/var/log/coderef-watch/{workspace-slug}.log',
      error_file: '/var/log/coderef-watch/{workspace-slug}.err.log',
      time: true,
    },
  ],
};
```

Start, persist across reboots, check status:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # generates a per-OS init snippet to install
pm2 list
pm2 logs coderef-watch-{workspace-slug}
```

---

## 3. systemd (Linux)

Two flavors. **Prefer the user unit** unless multiple users share the workspace.

### 3a. User unit (recommended)

Path: `~/.config/systemd/user/coderef-watch@.service`

```ini
[Unit]
Description=coderef-watch daemon for workspace %i
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/%u/workspaces/%i
ExecStart=/usr/bin/npx coderef-watch --project-dir /home/%u/workspaces/%i
Restart=on-failure
RestartSec=5s
Environment=CODEREF_AGENT_DOMAIN=CODEREF-CORE
# Optional: enable session-event forwarding
# Environment=CODEREF_SESSION_ID=daily-agent-session-YYYY-MM-DD
StandardOutput=append:/var/log/coderef-watch-%i.log
StandardError=append:/var/log/coderef-watch-%i.err.log

[Install]
WantedBy=default.target
```

Enable + start for a workspace named `myproject`:

```bash
systemctl --user daemon-reload
systemctl --user enable --now coderef-watch@myproject.service
loginctl enable-linger $USER     # so the unit survives logout
journalctl --user -u coderef-watch@myproject.service -f
```

### 3b. System unit (multi-user / shared host)

Path: `/etc/systemd/system/coderef-watch@.service`. Same template; replace `%u` with the actual user (e.g., `coderef`) and run `User=coderef` + `Group=coderef`. Enable with `sudo systemctl enable --now coderef-watch@myproject.service`.

---

## 4. launchd (macOS)

### 4a. LaunchAgent (per-user, recommended)

Path: `~/Library/LaunchAgents/dev.coderef.watch.{workspace-slug}.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>dev.coderef.watch.{workspace-slug}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npx</string>
    <string>coderef-watch</string>
    <string>--project-dir</string>
    <string>/Users/USERNAME/workspaces/{workspace-slug}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/USERNAME/workspaces/{workspace-slug}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/USERNAME/Library/Logs/coderef-watch-{workspace-slug}.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/USERNAME/Library/Logs/coderef-watch-{workspace-slug}.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CODEREF_AGENT_DOMAIN</key>
    <string>CODEREF-CORE</string>
  </dict>
</dict>
</plist>
```

Load and verify:

```bash
launchctl load   ~/Library/LaunchAgents/dev.coderef.watch.{workspace-slug}.plist
launchctl list | grep coderef.watch
tail -f ~/Library/Logs/coderef-watch-{workspace-slug}.log
# stop:
launchctl unload ~/Library/LaunchAgents/dev.coderef.watch.{workspace-slug}.plist
```

### 4b. LaunchDaemon (system-wide)

Place under `/Library/LaunchDaemons/` instead. Add `<key>UserName</key><string>coderef</string>` so it doesn't run as root. Enable with `sudo launchctl load`.

---

## 5. Windows Service

Two options. NSSM is more robust; `sc.exe` is built-in.

### 5a. NSSM (recommended)

Install [NSSM](https://nssm.cc/) (`choco install nssm` or download the binary), then:

```powershell
# Install
nssm install CoderefWatch-myproject `
  "C:\Program Files\nodejs\npx.cmd" `
  coderef-watch --project-dir "C:\workspaces\myproject"

nssm set CoderefWatch-myproject AppDirectory "C:\workspaces\myproject"
nssm set CoderefWatch-myproject AppStdout    "C:\ProgramData\coderef-watch\myproject.log"
nssm set CoderefWatch-myproject AppStderr    "C:\ProgramData\coderef-watch\myproject.err.log"
nssm set CoderefWatch-myproject AppEnvironmentExtra `
  "CODEREF_AGENT_DOMAIN=CODEREF-CORE"

# Start
nssm start CoderefWatch-myproject

# Verify
Get-Service CoderefWatch-myproject
Get-Content "C:\ProgramData\coderef-watch\myproject.log" -Wait

# Stop / remove
nssm stop   CoderefWatch-myproject
nssm remove CoderefWatch-myproject confirm
```

### 5b. `sc.exe` (built-in)

`sc.exe` requires the binary to behave as a service (handle SCM events). Since `coderef-watch` is a normal Node process, wrap it with [WinSW](https://github.com/winsw/winsw) or `srvany`. NSSM remains the simpler path; only fall back to `sc.exe` on locked-down hosts that prohibit third-party tooling.

---

## Common operational notes

### Log location convention

Pick one root and stick to it. Suggested defaults:

| OS | Log root |
|---|---|
| Linux | `/var/log/coderef-watch/` (system) or `~/.cache/coderef-watch/` (user) |
| macOS | `~/Library/Logs/` |
| Windows | `C:\ProgramData\coderef-watch\` |

### One daemon per workspace

Do **not** run two `coderef-watch` instances against the same `--project-dir` — they'll race writes to `.coderef/last-scan.json`. The atomic temp+rename prevents *partial* writes, but consecutive overwrites will produce a flapping heartbeat that confuses LLOYD's stale-detection.

### `chokidar` polling fallback (Windows network drives, deep recursion)

On exotic filesystems (CIFS/SMB, very deep symlinked trees, or some virtualized FS), the native FS watcher can miss events. If you observe missed flushes:

```bash
# Future flag (proposed, not yet implemented in v1):
coderef-watch --project-dir <path> --use-polling
```

The v1 surface does not expose `--use-polling`; it can be added in a follow-up minor without breaking the heartbeat schema. Open an improvement entry if you hit this.

### Restart policy

All five patterns above set a restart-on-failure policy. The daemon is intended to survive transient crashes. If a workspace generates restart loops:

1. Run `npx coderef-watch --project-dir <path> --once --no-pipeline --json` once to verify the heartbeat write path works.
2. Run `npx coderef-watch --project-dir <path> --no-pipeline` to verify chokidar starts up and observes events.
3. If those pass, the failure is in `coderef-pipeline` itself — debug there with `npx coderef-pipeline --project-dir <path> --dry-run`.

### Updating the daemon

Replacing the daemon binary requires restarting the supervisor. None of the five patterns auto-reload on `node_modules/` change; that's intentional (avoid mid-flush replacement).

```bash
pm2 restart coderef-watch-{workspace-slug}
systemctl --user restart coderef-watch@myproject.service
launchctl kickstart -k gui/$(id -u)/dev.coderef.watch.{workspace-slug}
nssm restart CoderefWatch-myproject
```

### Disabling temporarily

```bash
pm2 stop coderef-watch-{workspace-slug}
systemctl --user stop coderef-watch@myproject.service
launchctl unload ~/Library/LaunchAgents/dev.coderef.watch.{workspace-slug}.plist
nssm stop CoderefWatch-myproject
```

LLOYD will see the heartbeat go stale within minutes (`alive_at` aging), then degrade to "freshness unknown" per [LLOYD-INTEGRATION.md §7](LLOYD-INTEGRATION.md#7-failure-modes-lloyd-must-handle).

---

## Health check

The simplest readiness probe is a one-shot dry run:

```bash
npx coderef-watch --project-dir /abs/path --once --no-pipeline --json
```

PASS criteria:
- exit code `0`
- single JSON line on stdout with `schema_version: 1`, `status: "skipped"`, `trigger.kind: "once"`
- file `{project-dir}/.coderef/last-scan.json` present and parseable

Use this from your service-supervisor health check, or from CI before bringing a workspace into production.
