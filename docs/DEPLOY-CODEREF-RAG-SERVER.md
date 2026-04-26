# Deploying `coderef-rag-server` as a system service

Per-OS instructions for running `coderef-rag-server` as a long-lived service. WO-RAG-HTTP-SERVER-V1-001.

> **Always-on posture.** This server is the cross-runtime RAG endpoint that LLOYD's router (WO-ROUTER-V1-001 Phase 5) calls during pre-prompt assembly. It is NOT spawned per-request. Pick a service-supervisor pattern and let it run.
>
> **Localhost-only.** Server binds `127.0.0.1:52849`. Do NOT expose externally without adding TLS + auth (out of scope for v1).
>
> **Local Ollama dependency.** Server stays up if Ollama is unreachable, but query/index endpoints will return `503 {degraded:true}`. Run Ollama as a sibling service (also documented below).

---

## Patterns covered

1. **Manual** (foreground, dev/smoke) — quickest, no service manager
2. **pm2** (cross-platform, lowest setup) — works on Linux/macOS/Windows
3. **systemd** (Linux) — system or user unit
4. **launchd** (macOS) — `LaunchAgent` (per-user) or `LaunchDaemon` (system)
5. **Windows Service via NSSM** — Windows-native wrapper

All five run the same binary with the same flags; only the supervisor differs.

---

## 0. Pre-flight: Ollama must be reachable

`coderef-rag-server` does NOT manage Ollama. Run Ollama as its own service per [Ollama's docs](https://github.com/ollama/ollama#install). Confirm it is listening before starting `coderef-rag-server`:

```bash
curl -fsS http://localhost:11434/api/tags > /dev/null && echo "ollama OK"
ollama pull nomic-embed-text     # one-time: pull the default embedding model
```

If Ollama is down at start time, `coderef-rag-server` still starts; `/api/rag/status` will report `ollama.reachable=false` and `/api/rag/query` will return 503 until Ollama comes up.

---

## 1. Manual start (foreground)

```bash
# From anywhere
node /abs/path/to/CODEREF-CORE/dist/src/cli/coderef-rag-server.js

# Or via npx (after npm install -g @coderef/CODEREF-CORE)
npx coderef-rag-server

# Custom port
npx coderef-rag-server --port 52850

# Health probe from another shell
curl -fsS http://localhost:52849/api/health
```

`Ctrl-C` (SIGINT) shuts down cleanly with a 5 s grace for in-flight requests.

---

## 2. pm2 (cross-platform)

[pm2](https://pm2.keymetrics.io/) is the lowest-setup option that works identically on Linux/macOS/Windows.

### `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'coderef-rag-server',
      script: '/abs/path/to/CODEREF-CORE/dist/src/cli/coderef-rag-server.js',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        CODEREF_RAG_HTTP_PORT: '52849',
        CODEREF_LLM_BASE_URL:  'http://localhost:11434',
        CODEREF_LLM_MODEL:     'nomic-embed-text',
      },
      log_file:   '/var/log/coderef-rag-server.log',
      error_file: '/var/log/coderef-rag-server.err.log',
      time: true,
    },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup           # generates per-OS init snippet
pm2 logs coderef-rag-server
```

---

## 3. systemd (Linux)

### 3a. User unit (recommended for dev workstations)

Path: `~/.config/systemd/user/coderef-rag-server.service`

```ini
[Unit]
Description=CodeRef Core HTTP RAG server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /abs/path/to/CODEREF-CORE/dist/src/cli/coderef-rag-server.js
Restart=on-failure
RestartSec=5s
Environment=CODEREF_RAG_HTTP_PORT=52849
Environment=CODEREF_LLM_BASE_URL=http://localhost:11434
Environment=CODEREF_LLM_MODEL=nomic-embed-text
StandardOutput=append:/var/log/coderef-rag-server.log
StandardError=append:/var/log/coderef-rag-server.err.log

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now coderef-rag-server.service
loginctl enable-linger $USER     # survive logout
journalctl --user -u coderef-rag-server.service -f

# Health check from systemd unit
ExecStartPost=/usr/bin/curl -fsS http://localhost:52849/api/health
```

### 3b. System unit (multi-user / shared host)

Same template under `/etc/systemd/system/coderef-rag-server.service`; add `User=coderef` and `Group=coderef` so it doesn't run as root. Enable with `sudo systemctl enable --now coderef-rag-server.service`.

---

## 4. launchd (macOS)

### 4a. LaunchAgent (per-user, recommended)

Path: `~/Library/LaunchAgents/dev.coderef.rag-server.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>dev.coderef.rag-server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/abs/path/to/CODEREF-CORE/dist/src/cli/coderef-rag-server.js</string>
  </array>
  <key>RunAtLoad</key>     <true/>
  <key>KeepAlive</key>     <true/>
  <key>StandardOutPath</key>  <string>/Users/USERNAME/Library/Logs/coderef-rag-server.log</string>
  <key>StandardErrorPath</key><string>/Users/USERNAME/Library/Logs/coderef-rag-server.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CODEREF_RAG_HTTP_PORT</key> <string>52849</string>
    <key>CODEREF_LLM_BASE_URL</key>  <string>http://localhost:11434</string>
    <key>CODEREF_LLM_MODEL</key>     <string>nomic-embed-text</string>
  </dict>
</dict>
</plist>
```

```bash
launchctl load   ~/Library/LaunchAgents/dev.coderef.rag-server.plist
launchctl list | grep coderef.rag-server
tail -f ~/Library/Logs/coderef-rag-server.log
launchctl unload ~/Library/LaunchAgents/dev.coderef.rag-server.plist
```

### 4b. LaunchDaemon (system-wide)

Place under `/Library/LaunchDaemons/`. Add `<key>UserName</key><string>coderef</string>` so it doesn't run as root. Enable with `sudo launchctl load`.

---

## 5. Windows Service via NSSM

```powershell
# Install
nssm install CoderefRagServer `
  "C:\Program Files\nodejs\node.exe" `
  "C:\Users\willh\Desktop\CODEREF\CODEREF-CORE\dist\src\cli\coderef-rag-server.js"

nssm set CoderefRagServer AppStdout "C:\ProgramData\coderef-rag-server\out.log"
nssm set CoderefRagServer AppStderr "C:\ProgramData\coderef-rag-server\err.log"
nssm set CoderefRagServer AppEnvironmentExtra `
  "CODEREF_RAG_HTTP_PORT=52849" `
  "CODEREF_LLM_BASE_URL=http://localhost:11434" `
  "CODEREF_LLM_MODEL=nomic-embed-text"

# Start
nssm start CoderefRagServer
Get-Service CoderefRagServer

# Verify
curl -UseBasicParsing http://localhost:52849/api/health

# Stop / remove
nssm stop   CoderefRagServer
nssm remove CoderefRagServer confirm
```

---

## Health-check probe (any pattern)

```bash
curl -fsS http://localhost:52849/api/health > /dev/null && echo OK || echo DEAD
```

Use from systemd `ExecStartPost`, container readiness probes, NSSM hooks, or fast-start runbook smoke step.

For a richer check that includes Ollama reachability:

```bash
curl -fsS http://localhost:52849/api/rag/status | jq -e '.ollama.reachable == true'
```

---

## Common operational notes

### One server per machine

Run a single `coderef-rag-server` per host, listening on `52849`. The server is per-project-stateless (every request carries `project_dir`); a single instance handles all consumers (LLOYD, ASSISTANT skills, surfaces).

### Restart policy

All five patterns above set `restart-on-failure`. The server is intended to survive transient crashes. If you hit restart loops, check:

1. Is the port already taken? `coderef-rag-server` exits 2 with `EADDRINUSE` when something else is on `52849`.
2. Is Node available at the configured `ExecStart` path?
3. Is the `dist/src/cli/coderef-rag-server.js` file present? Run `npm run build:cli` if not.

The server itself does NOT exit on Ollama-down; if it's looping, the issue is elsewhere.

### Updating the server

Replacing the binary requires restarting the supervisor:

```bash
pm2 restart coderef-rag-server
systemctl --user restart coderef-rag-server.service
launchctl kickstart -k gui/$(id -u)/dev.coderef.rag-server
nssm restart CoderefRagServer
```

### Log rotation

The server logs to stdout/stderr only; rotation is the supervisor's responsibility. systemd journals rotate by default; pm2 has `pm2-logrotate`; NSSM has built-in rotation flags.

### Disabling temporarily

Stop with the supervisor's stop command. LLOYD's degrade policy treats a missing server the same as Ollama-down → `503 {degraded:true}` → router falls back to non-RAG context per LLOYD-FEEDBACK D3.

---

## Pre-built health probe (one-liner for runbooks)

```bash
{ curl -fsS http://localhost:52849/api/health > /dev/null \
  && curl -fsS http://localhost:52849/api/rag/status \
       | jq -e '.ollama.reachable == true' > /dev/null \
  && echo "coderef-rag-server: HEALTHY (Ollama OK)"; } \
|| echo "coderef-rag-server: DEGRADED or DEAD (check supervisor + ollama)"
```

Drop this into your fast-start runbook or system status board.
