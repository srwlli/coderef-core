/**
 * @coderef-semantic: 1.0.0
 * @exports load_prefs, save_prefs, CodeRefUI, main
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports load_prefs, save_prefs, CodeRefUI, main
 */

"""
CodeRef Control Panel — tkinter GUI wrapping all 15 coderef-core CLI bins.
Run: python tools/coderef_ui.py
"""
import json
import os
import subprocess
import threading
import tkinter as tk
from tkinter import filedialog, font, scrolledtext, ttk

PREFS_FILE = os.path.join(os.path.dirname(__file__), ".coderef-ui-prefs.json")

# ---------------------------------------------------------------------------
# Command definitions — grouped by category
# ---------------------------------------------------------------------------
COMMANDS = {
    "Pipeline": [
        ("pipeline", "coderef-pipeline"),
        ("watch", "coderef-watch"),
    ],
    "Scan / Populate": [
        ("scan", "coderef-scan"),
        ("populate", "populate-coderef"),
        ("detect-languages", "coderef-detect-languages"),
    ],
    "RAG": [
        ("rag-index", "rag-index"),
        ("rag-search", "rag-search"),
        ("rag-status", "rag-status"),
        ("rag-server", "coderef-rag-server"),
    ],
    "Query / Analyze": [
        ("query", "coderef-query"),
        ("analyze", "coderef-analyze"),
        ("search", "coderef-search"),
    ],
    "Utilities": [
        ("semantic-integration", "coderef-semantic-integration"),
        ("validate-routes", "validate-routes"),
        ("scan-frontend-calls", "scan-frontend-calls"),
    ],
}

# Flat ordered list of (label, bin) pairs for the radio-button grid
ALL_COMMANDS = []
for _cat, _cmds in COMMANDS.items():
    ALL_COMMANDS.extend(_cmds)

# ---------------------------------------------------------------------------
# Per-command options panel specification
# ---------------------------------------------------------------------------
# Each entry is a list of widget descriptors:
#   ("checkbox", flag, label)
#   ("entry",    flag, label, default)
#   ("dropdown", flag, label, [choices], default)
#   ("entry_positional", name, label, default)  — positional arg (first non-flag)
#
# Where flag=None for positional slots.

CMD_OPTIONS = {
    "coderef-pipeline": [
        ("entry",    "--only",            "--only (scan|populate|docs|rag csv)", ""),
        ("entry",    "--skip",            "--skip (scan|populate|docs|rag csv)", ""),
        ("checkbox", "--dry-run",         "--dry-run"),
        ("checkbox", "--rag-reset",       "--rag-reset"),
        ("entry",    "--ollama-base-url", "--ollama-base-url",                  ""),
        ("entry",    "--ollama-model",    "--ollama-model",                     ""),
        ("checkbox", "--verbose",         "--verbose / -v"),
    ],
    "coderef-scan": [
        ("entry",    "--languages",  "--languages (csv)",  ""),
        ("entry",    "--plugins",    "--plugins (csv)",    ""),
        ("checkbox", "--no-plugins", "--no-plugins"),
        ("checkbox", "--useAST",     "--useAST"),
        ("checkbox", "--incremental","--incremental"),
    ],
    "populate-coderef": [
        ("entry",    "--lang",       "--lang / -l (csv)",                          ""),
        ("entry",    "--output",     "--output / -o (path)",                       ""),
        ("checkbox", "--verbose",    "--verbose / -v"),
        ("checkbox", "--json",       "--json / -j"),
        ("entry",    "--skip",       "--skip / -s (generators csv)",               ""),
        ("checkbox", "--parallel",   "--parallel / -p"),
        ("dropdown", "--mode",       "--mode / -m",
         ["full", "minimal", "context"],                                           "full"),
        ("entry",    "--select",     "--select (generators csv)",                  ""),
        ("checkbox", "--semantic-registry",    "--semantic-registry"),
        ("checkbox", "--no-semantic-registry", "--no-semantic-registry"),
        ("checkbox", "--source-headers",       "--source-headers"),
        ("checkbox", "--llm-enrich",           "--llm-enrich"),
        ("checkbox", "--strict-headers",       "--strict-headers"),
    ],
    "rag-index": [
        ("entry",    "--provider",  "--provider (openai|anthropic|ollama|…)",  ""),
        ("dropdown", "--store",     "--store",
         ["sqlite", "pinecone", "chroma"],                                     "sqlite"),
        ("checkbox", "--reset",     "--reset"),
        ("entry",    "--lang",      "--lang / -l (csv)",                       ""),
        ("checkbox", "--verbose",   "--verbose / -v"),
        ("checkbox", "--json",      "--json / -j"),
    ],
    "rag-search": [
        ("entry_positional", "query", "Query (positional)",                    ""),
        ("entry",    "--provider",    "--provider",                             ""),
        ("dropdown", "--store",       "--store",
         ["sqlite", "pinecone", "chroma"],                                     "sqlite"),
        ("entry",    "--top-k",       "--top-k / -k",                          "10"),
        ("entry",    "--min-score",   "--min-score",                           "0.0"),
        ("entry",    "--lang",        "--lang / -l",                           ""),
        ("entry",    "--type",        "--type / -t",                           ""),
        ("entry",    "--file",        "--file / -f (pattern)",                 ""),
        ("checkbox", "--exported",    "--exported"),
        ("entry",    "--layer",       "--layer",                               ""),
        ("entry",    "--capability",  "--capability",                          ""),
        ("checkbox", "--json",        "--json / -j"),
    ],
    "rag-status": [
        ("entry",    "--project-dir", "--project-dir / -p",                    ""),
        ("checkbox", "--json",        "--json / -j"),
    ],
    "coderef-rag-server": [
        ("entry",    "--port",  "--port / -p (default 52849)",                 ""),
    ],
    "coderef-watch": [
        ("entry",    "--project-dir",  "--project-dir / -p",                   ""),
        ("entry",    "--debounce-ms",  "--debounce-ms (default 30000)",        ""),
        ("entry",    "--languages",    "--languages / -l (csv)",               ""),
        ("entry",    "--exclude",      "--exclude (csv)",                      ""),
        ("checkbox", "--include-rag",  "--include-rag"),
        ("checkbox", "--once",         "--once"),
        ("checkbox", "--no-pipeline",  "--no-pipeline"),
        ("checkbox", "--json",         "--json / -j"),
        ("checkbox", "--verbose",      "--verbose / -v"),
    ],
    "coderef-analyze": [
        ("dropdown", "--type",    "--type (REQUIRED)",
         ["config", "contract", "db", "dependency", "pattern", "docs",
          "middleware", "graph", "complexity", "impact", "multi-hop",
          "breaking-changes"],                                                  "complexity"),
        ("dropdown", "--output",  "--output",
         ["json", "text"],                                                      "text"),
        ("entry",    "--element", "--element (for impact / multi-hop)",         ""),
        ("entry",    "--depth",   "--depth",                                    ""),
        ("entry",    "--from",    "--from (for breaking-changes)",              ""),
        ("entry",    "--to",      "--to (for breaking-changes)",                ""),
    ],
    "coderef-query": [
        ("dropdown", "--type",   "--type (REQUIRED)",
         ["what-calls", "what-calls-me", "what-imports", "what-imports-me",
          "what-depends-on", "what-depends-on-me", "shortest-path",
          "all-paths"],                                                         "what-calls"),
        ("entry",    "--target", "--target (REQUIRED)",                         ""),
        ("entry",    "--source", "--source (for shortest-path / all-paths)",    ""),
        ("entry",    "--depth",  "--depth",                                     ""),
        ("dropdown", "--format", "--format",
         ["raw", "summary", "full"],                                            "summary"),
    ],
    "coderef-search": [
        ("entry",    "--query",     "--query (REQUIRED)",                       ""),
        ("entry",    "--tags",      "--tags (csv)",                             ""),
        ("dropdown", "--sort",      "--sort",
         ["relevance", "lastUpdated", "wordCount"],                             "relevance"),
        ("entry",    "--min-score", "--min-score",                              ""),
        ("entry",    "--limit",     "--limit",                                  ""),
    ],
    "coderef-detect-languages": [
        ("entry",    "--ignore-file", "--ignore-file (path)",                   ""),
        ("checkbox", "--json",        "--json"),
    ],
    "coderef-semantic-integration": [
        ("entry",    "--output",              "--output (path)",                ""),
        ("entry",    "--registry",            "--registry (path)",              ""),
        ("checkbox", "--dry-run",             "--dry-run"),
        ("checkbox", "--no-headers",          "--no-headers"),
        ("checkbox", "--no-enrich",           "--no-enrich"),
        ("checkbox", "--no-sync-registry",    "--no-sync-registry"),
        ("entry",    "--file",                "--file (single file path)",      ""),
        ("checkbox", "--validate-idempotency","--validate-idempotency"),
    ],
    "validate-routes": [
        ("entry",    "--frontend-calls",  "--frontend-calls / -f (path)",       ""),
        ("entry",    "--server-routes",   "--server-routes / -s (path)",        ""),
        ("checkbox", "--fail-on-critical","--fail-on-critical / -c"),
        ("entry",    "--output",          "--output / -o (path)",               ""),
    ],
    "scan-frontend-calls": [
        ("entry",    "--output",     "--output / -o (path)",                    ""),
        ("entry",    "--extensions", "--extensions / -e (csv)",                ""),
    ],
}

# Commands whose primary positional arg is the project dir (added automatically from the
# Project Dir field at the top of the UI).  Commands NOT in this set receive --project-dir
# or --project as a named flag (or use their own positional slot in CMD_OPTIONS).
POSITIONAL_PROJECT_DIR_CMDS = {
    "coderef-pipeline",
    "coderef-scan",
    "populate-coderef",
    "rag-index",
    "rag-status",
    "scan-frontend-calls",
}

# Commands that use --project instead of --project-dir (parseArgs style).
PROJECT_FLAG_CMDS = {
    "coderef-analyze",
    "coderef-query",
    "coderef-search",
    "coderef-detect-languages",
    "coderef-semantic-integration",
}

# Commands that use --project-dir (yargs style, NOT positional).
PROJECT_DIR_FLAG_CMDS = {
    "rag-search",
    "coderef-watch",
    "validate-routes",
}

# coderef-rag-server uses no project arg at all.

STATUS_COLORS = {
    "Idle":    ("#888888", "#f0f0f0"),
    "Running": ("#1565C0", "#BBDEFB"),
    "Done":    ("#1B5E20", "#C8E6C9"),
    "Error":   ("#B71C1C", "#FFCDD2"),
}


# ---------------------------------------------------------------------------
# Prefs helpers
# ---------------------------------------------------------------------------

def load_prefs():
    if os.path.exists(PREFS_FILE):
        try:
            with open(PREFS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_prefs(prefs):
    try:
        with open(PREFS_FILE, "w", encoding="utf-8") as f:
            json.dump(prefs, f, indent=2)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Main application
# ---------------------------------------------------------------------------

class CodeRefUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("CodeRef Control Panel")
        self.root.resizable(True, True)
        self.root.minsize(780, 640)

        self._process: subprocess.Popen | None = None
        self._thread: threading.Thread | None = None

        self.prefs = load_prefs()

        # Current selected bin name (key into CMD_OPTIONS)
        self.selected_bin = tk.StringVar(value="coderef-pipeline")

        self._build_ui()
        self._switch_options_panel()

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------

    def _build_ui(self):
        pad = {"padx": 6, "pady": 4}

        # ---- Top bar: project dir ----
        top = tk.Frame(self.root, bd=1, relief=tk.GROOVE)
        top.pack(fill=tk.X, **pad)

        tk.Label(top, text="Project Dir:").pack(side=tk.LEFT, padx=(4, 2))
        self.project_dir_var = tk.StringVar(
            value=self.prefs.get("last_project_dir", "")
        )
        proj_entry = tk.Entry(top, textvariable=self.project_dir_var, width=55)
        proj_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        tk.Button(top, text="Browse", command=self._browse_dir).pack(
            side=tk.LEFT, padx=4
        )

        # ---- Command selector ----
        cmd_outer = tk.LabelFrame(self.root, text="Command", bd=1, relief=tk.GROOVE)
        cmd_outer.pack(fill=tk.X, **pad)

        self._build_command_selector(cmd_outer)

        # ---- Options panel (dynamic) ----
        self.opts_frame = tk.LabelFrame(
            self.root, text="Options", bd=1, relief=tk.GROOVE
        )
        self.opts_frame.pack(fill=tk.X, **pad)

        # ---- Status + buttons ----
        ctrl = tk.Frame(self.root)
        ctrl.pack(fill=tk.X, **pad)

        self.status_badge = tk.Label(
            ctrl, text=" Idle ", relief=tk.RAISED, font=("", 10, "bold"),
            padx=8, pady=2
        )
        self.status_badge.pack(side=tk.LEFT, padx=(0, 10))
        self._set_status("Idle")

        tk.Button(ctrl, text="  Run  ", width=8, command=self._run).pack(
            side=tk.LEFT, padx=4
        )
        tk.Button(ctrl, text="  Stop  ", width=8, command=self._stop).pack(
            side=tk.LEFT, padx=4
        )
        tk.Button(ctrl, text="  Clear  ", width=8, command=self._clear).pack(
            side=tk.LEFT, padx=4
        )

        # Command preview label
        self.cmd_preview_var = tk.StringVar(value="")
        tk.Label(
            ctrl, textvariable=self.cmd_preview_var, fg="#555",
            font=("Courier", 8), anchor="w"
        ).pack(side=tk.LEFT, padx=8, fill=tk.X, expand=True)

        # ---- Output pane ----
        out_frame = tk.LabelFrame(self.root, text="Output", bd=1, relief=tk.GROOVE)
        out_frame.pack(fill=tk.BOTH, expand=True, **pad)

        mono = font.Font(family="Courier New", size=10)
        self.output_text = scrolledtext.ScrolledText(
            out_frame, wrap=tk.WORD, font=mono, state=tk.DISABLED,
            bg="#1e1e1e", fg="#d4d4d4", insertbackground="white"
        )
        self.output_text.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

    def _build_command_selector(self, parent: tk.Frame):
        """Build radio buttons grouped by category."""
        row = 0
        for cat, cmds in COMMANDS.items():
            sep = tk.Label(
                parent, text=f"— {cat} —",
                fg="#555", font=("", 9, "italic")
            )
            sep.grid(row=row, column=0, columnspan=6, sticky="w", padx=6, pady=(4, 0))
            row += 1
            col = 0
            for label, bin_name in cmds:
                rb = tk.Radiobutton(
                    parent,
                    text=label,
                    variable=self.selected_bin,
                    value=bin_name,
                    command=self._switch_options_panel,
                )
                rb.grid(row=row, column=col, sticky="w", padx=8, pady=1)
                col += 1
                if col >= 4:
                    col = 0
                    row += 1
            if col != 0:
                row += 1

    # ------------------------------------------------------------------
    # Dynamic options panel
    # ------------------------------------------------------------------

    def _switch_options_panel(self):
        """Destroy old widgets, build new ones for the selected command."""
        for w in self.opts_frame.winfo_children():
            w.destroy()

        bin_name = self.selected_bin.get()
        specs = CMD_OPTIONS.get(bin_name, [])

        self._option_widgets = {}  # flag -> widget or (var, widget)

        row = 0
        for spec in specs:
            kind = spec[0]

            if kind == "checkbox":
                _, flag, label = spec
                var = tk.BooleanVar(value=False)
                cb = tk.Checkbutton(
                    self.opts_frame, text=label, variable=var,
                    command=self._update_preview
                )
                cb.grid(row=row, column=0, columnspan=2, sticky="w", padx=8, pady=1)
                self._option_widgets[flag] = ("checkbox", var)

            elif kind == "entry":
                _, flag, label, default = spec
                tk.Label(self.opts_frame, text=label).grid(
                    row=row, column=0, sticky="e", padx=(8, 2), pady=1
                )
                var = tk.StringVar(value=default)
                e = tk.Entry(self.opts_frame, textvariable=var, width=38)
                e.grid(row=row, column=1, sticky="w", pady=1)
                var.trace_add("write", lambda *_: self._update_preview())
                self._option_widgets[flag] = ("entry", var)

            elif kind == "entry_positional":
                _, name, label, default = spec
                tk.Label(self.opts_frame, text=label).grid(
                    row=row, column=0, sticky="e", padx=(8, 2), pady=1
                )
                var = tk.StringVar(value=default)
                e = tk.Entry(self.opts_frame, textvariable=var, width=38)
                e.grid(row=row, column=1, sticky="w", pady=1)
                var.trace_add("write", lambda *_: self._update_preview())
                self._option_widgets[f"__positional__{name}"] = ("entry", var)

            elif kind == "dropdown":
                _, flag, label, choices, default = spec
                tk.Label(self.opts_frame, text=label).grid(
                    row=row, column=0, sticky="e", padx=(8, 2), pady=1
                )
                var = tk.StringVar(value=default)
                dd = ttk.Combobox(
                    self.opts_frame, textvariable=var,
                    values=choices, state="readonly", width=22
                )
                dd.grid(row=row, column=1, sticky="w", pady=1)
                var.trace_add("write", lambda *_: self._update_preview())
                self._option_widgets[flag] = ("dropdown", var)

            row += 1

        self._update_preview()

    # ------------------------------------------------------------------
    # Command-line builder
    # ------------------------------------------------------------------

    def _build_args(self):
        """Return the argv list for the selected command."""
        bin_name = self.selected_bin.get()
        project_dir = self.project_dir_var.get().strip()
        args = [bin_name]

        # Positional project-dir commands: project dir is the first arg
        if bin_name in POSITIONAL_PROJECT_DIR_CMDS:
            if project_dir:
                args.append(project_dir)
        elif bin_name in PROJECT_FLAG_CMDS:
            if project_dir:
                args.extend(["--project", project_dir])
        elif bin_name in PROJECT_DIR_FLAG_CMDS:
            if project_dir:
                args.extend(["--project-dir", project_dir])
        # coderef-rag-server: no project arg

        # Positional option slots come first (e.g. rag-search query)
        for key, (kind, var) in self._option_widgets.items():
            if not key.startswith("__positional__"):
                continue
            val = var.get().strip()
            if val:
                args.append(val)

        # Named flags
        for key, (kind, var) in self._option_widgets.items():
            if key.startswith("__positional__"):
                continue
            if kind == "checkbox":
                if var.get():
                    args.append(key)
            else:
                val = var.get().strip()
                if val:
                    args.extend([key, val])

        return args

    def _update_preview(self):
        try:
            args = self._build_args()
            self.cmd_preview_var.set(" ".join(args))
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Browse
    # ------------------------------------------------------------------

    def _browse_dir(self):
        d = filedialog.askdirectory(
            initialdir=self.project_dir_var.get() or os.getcwd()
        )
        if d:
            self.project_dir_var.set(d)
            self.prefs["last_project_dir"] = d
            save_prefs(self.prefs)
            self._update_preview()

    # ------------------------------------------------------------------
    # Run / Stop / Clear
    # ------------------------------------------------------------------

    def _run(self):
        if self._process and self._process.poll() is None:
            return  # already running
        self._clear()
        args = self._build_args()
        self._append_output(f"> {' '.join(args)}\n", tag="cmd")
        self._set_status("Running")
        self._thread = threading.Thread(
            target=self._stream_process, args=(args,), daemon=True
        )
        self._thread.start()

    def _stream_process(self, args: list[str]):
        try:
            self._process = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
            )
            for line in self._process.stdout:
                self._append_output(line)
            self._process.wait()
            rc = self._process.returncode
            self.root.after(
                0,
                lambda: self._set_status("Done" if rc == 0 else "Error")
            )
        except FileNotFoundError:
            self._append_output(
                f"ERROR: command not found: {args[0]}\n"
                "Make sure coderef-core is installed and the bin is on PATH.\n"
            )
            self.root.after(0, lambda: self._set_status("Error"))
        except Exception as exc:
            self._append_output(f"ERROR: {exc}\n")
            self.root.after(0, lambda: self._set_status("Error"))

    def _stop(self):
        if self._process and self._process.poll() is None:
            self._process.terminate()
            self._append_output("\n[Stopped by user]\n")
            self._set_status("Idle")

    def _clear(self):
        self.output_text.configure(state=tk.NORMAL)
        self.output_text.delete("1.0", tk.END)
        self.output_text.configure(state=tk.DISABLED)

    # ------------------------------------------------------------------
    # Output helpers
    # ------------------------------------------------------------------

    def _append_output(self, text: str, tag: str = ""):
        def _do():
            self.output_text.configure(state=tk.NORMAL)
            if tag:
                self.output_text.insert(tk.END, text, tag)
            else:
                self.output_text.insert(tk.END, text)
            self.output_text.see(tk.END)
            self.output_text.configure(state=tk.DISABLED)

        self.root.after(0, _do)

    def _set_status(self, status: str):
        fg, bg = STATUS_COLORS.get(status, ("#333", "#eee"))
        self.status_badge.configure(text=f" {status} ", fg=fg, bg=bg)

    # ------------------------------------------------------------------
    # Tag configuration for output pane
    # ------------------------------------------------------------------

    def _configure_tags(self):
        self.output_text.tag_configure("cmd", foreground="#569cd6")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    root = tk.Tk()
    app = CodeRefUI(root)
    app._configure_tags()
    root.mainloop()


if __name__ == "__main__":
    main()
