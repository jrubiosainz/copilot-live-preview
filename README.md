# Copilot Live Preview

CLI to scaffold and validate live-reload HTML projects for VS Code 1.133's integrated browser auto-reload feature.

## What it does

VS Code 1.133 (August 12, 2026) introduced `workbench.browser.autoReloadOnFileChange` — the integrated browser now refreshes automatically when an HTML file changes on disk. This means agent edits appear instantly without manual refresh.

**copilot-live-preview** makes this workflow frictionless:

- **`init`** — Scaffolds a project with correct `.vscode/settings.json`, entry HTML, and a manifest
- **`validate`** — Checks that auto-reload is properly configured
- **`watch`** — Real-time feed of file changes (see agent edits as they happen)
- **`status`** — Dashboard of current config

## Quick Start

```bash
npx copilot-live-preview init my-project
cd my-project
code .
# Ctrl+Shift+P → Simple Browser: Show → open src/index.html
# Any edit (yours or agent) triggers instant reload
```

## Usage

```bash
# Scaffold new project
copilot-live-preview init [directory]

# Validate existing project
copilot-live-preview validate [directory]

# Watch for changes (agent edit feed)
copilot-live-preview watch [directory]

# Show status
copilot-live-preview status [directory]
```

## How it works

1. Sets `workbench.browser.autoReloadOnFileChange: true` in `.vscode/settings.json`
2. Configures `files.autoSave: afterDelay` so agent writes hit disk immediately
3. Creates a `.copilot-live-preview.json` manifest defining the entry point and watched extensions
4. The `watch` command shows a live log of file mutations with hashes — useful for seeing exactly what an agent changed

## Why this matters

Before 1.133, previewing agent-generated HTML required:
- Manual refresh after each edit
- External live-server extensions
- Custom file watchers

Now the integrated browser handles it natively. This CLI ensures your project is set up correctly from the start and gives you visibility into what's changing in real time.

## Requirements

- VS Code 1.133+
- Node.js 18+

## License

MIT
