#!/usr/bin/env node

/**
 * copilot-live-preview
 *
 * CLI that scaffolds HTML projects optimized for VS Code 1.133's
 * integrated browser auto-reload feature. It:
 *
 * 1. Generates .vscode/settings.json with autoReloadOnFileChange enabled
 * 2. Creates a file watcher that logs agent edits in real time
 * 3. Validates that a project's structure works with the integrated browser
 * 4. Provides a "watch" mode showing a live diff feed of what changed
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, watch } from "fs";
import { join, resolve, relative, extname } from "path";
import { createHash } from "crypto";

const VERSION = "1.0.0";

// ─── Commands ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
copilot-live-preview v${VERSION}
Scaffold and validate live-reload HTML projects for VS Code 1.133 integrated browser.

USAGE:
  copilot-live-preview init [dir]       Create a new project with auto-reload config
  copilot-live-preview validate [dir]   Check if a project is correctly configured
  copilot-live-preview watch [dir]      Monitor file changes in real time (agent edit feed)
  copilot-live-preview status [dir]     Show current config and reload readiness

OPTIONS:
  --help, -h      Show this help
  --version, -v   Show version
`);
}

function initProject(dir) {
  const root = resolve(dir || ".");
  const vscodeDir = join(root, ".vscode");
  const srcDir = join(root, "src");

  if (!existsSync(vscodeDir)) mkdirSync(vscodeDir, { recursive: true });
  if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true });

  // VS Code settings for integrated browser auto-reload
  const settings = {
    "workbench.browser.autoReloadOnFileChange": true,
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 500,
    "editor.formatOnSave": true,
    "chat.agentHost.allowSignedOutWhenUsable": true
  };

  const settingsPath = join(vscodeDir, "settings.json");
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log(`[init] Created ${relative(root, settingsPath)}`);

  // Scaffold index.html
  const indexPath = join(srcDir, "index.html");
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Preview Demo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Live Preview Active</h1>
  <p>Edit this file — VS Code 1.133 integrated browser reloads automatically.</p>
  <div id="app"></div>
  <script src="main.js"></script>
</body>
</html>`);
    console.log(`[init] Created ${relative(root, indexPath)}`);
  }

  // Scaffold style.css
  const cssPath = join(srcDir, "style.css");
  if (!existsSync(cssPath)) {
    writeFileSync(cssPath, `body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  background: #0d1117;
  color: #e6edf3;
}

h1 { color: #58a6ff; }
`);
    console.log(`[init] Created ${relative(root, cssPath)}`);
  }

  // Scaffold main.js
  const jsPath = join(srcDir, "main.js");
  if (!existsSync(jsPath)) {
    writeFileSync(jsPath, `// Agent edits to this file trigger instant browser reload
const app = document.getElementById('app');
app.innerHTML = '<p>Ready for agent-driven development.</p>';
`);
    console.log(`[init] Created ${relative(root, jsPath)}`);
  }

  // Create .copilot-live-preview.json manifest
  const manifest = {
    version: VERSION,
    createdAt: new Date().toISOString(),
    entryPoint: "src/index.html",
    watchExtensions: [".html", ".css", ".js", ".json"],
    autoReloadEnabled: true
  };
  const manifestPath = join(root, ".copilot-live-preview.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[init] Created ${relative(root, manifestPath)}`);

  console.log(`\n[init] Project ready. Open in VS Code 1.133+:`);
  console.log(`  code ${root}`);
  console.log(`  Then: Ctrl+Shift+P → Simple Browser: Show → open src/index.html`);
  console.log(`  Any file save triggers instant reload.\n`);
}

function validateProject(dir) {
  const root = resolve(dir || ".");
  const issues = [];
  const checks = [];

  // Check .vscode/settings.json
  const settingsPath = join(root, ".vscode", "settings.json");
  if (!existsSync(settingsPath)) {
    issues.push("Missing .vscode/settings.json");
  } else {
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    if (settings["workbench.browser.autoReloadOnFileChange"] !== true) {
      issues.push("workbench.browser.autoReloadOnFileChange is not enabled");
    } else {
      checks.push("autoReloadOnFileChange: enabled");
    }
    if (settings["files.autoSave"]) {
      checks.push(`files.autoSave: ${settings["files.autoSave"]}`);
    }
  }

  // Check manifest
  const manifestPath = join(root, ".copilot-live-preview.json");
  if (!existsSync(manifestPath)) {
    issues.push("Missing .copilot-live-preview.json manifest");
  } else {
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    checks.push(`Entry point: ${m.entryPoint}`);
    checks.push(`Watch extensions: ${m.watchExtensions.join(", ")}`);
    // Verify entry point exists
    if (!existsSync(join(root, m.entryPoint))) {
      issues.push(`Entry point ${m.entryPoint} not found`);
    } else {
      checks.push("Entry point file exists");
    }
  }

  console.log(`\n[validate] Project: ${root}`);
  console.log("─".repeat(50));

  if (checks.length) {
    console.log("\n  Checks passed:");
    checks.forEach(c => console.log(`    ✓ ${c}`));
  }

  if (issues.length) {
    console.log("\n  Issues found:");
    issues.forEach(i => console.log(`    ✗ ${i}`));
    console.log(`\n  Run 'copilot-live-preview init' to fix.\n`);
    process.exit(1);
  } else {
    console.log("\n  All checks passed. Project is live-reload ready.\n");
  }
}

function watchProject(dir) {
  const root = resolve(dir || ".");
  const manifestPath = join(root, ".copilot-live-preview.json");

  let extensions = [".html", ".css", ".js", ".json"];
  if (existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    extensions = m.watchExtensions || extensions;
  }

  const hashes = new Map();

  console.log(`[watch] Monitoring ${root}`);
  console.log(`[watch] Extensions: ${extensions.join(", ")}`);
  console.log(`[watch] Press Ctrl+C to stop.\n`);

  // Initial hash of tracked files
  function hashFile(path) {
    try {
      const content = readFileSync(path);
      return createHash("md5").update(content).digest("hex").slice(0, 8);
    } catch { return null; }
  }

  const watcher = watch(root, { recursive: true }, (event, filename) => {
    if (!filename) return;
    const ext = extname(filename);
    if (!extensions.includes(ext)) return;

    const fullPath = join(root, filename);
    const newHash = hashFile(fullPath);
    const oldHash = hashes.get(filename);

    if (newHash && newHash !== oldHash) {
      hashes.set(filename, newHash);
      const now = new Date().toISOString().slice(11, 19);
      const sizeKb = (readFileSync(fullPath).length / 1024).toFixed(1);
      console.log(`  ${now} │ ${event.padEnd(6)} │ ${filename} (${sizeKb}KB) [${newHash}]`);
    }
  });

  process.on("SIGINT", () => { watcher.close(); process.exit(0); });
}

function showStatus(dir) {
  const root = resolve(dir || ".");
  const manifestPath = join(root, ".copilot-live-preview.json");
  const settingsPath = join(root, ".vscode", "settings.json");

  console.log(`\n[status] Project: ${root}`);
  console.log("─".repeat(50));

  if (existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, "utf8"));
    console.log(`  Version: ${m.version}`);
    console.log(`  Entry: ${m.entryPoint}`);
    console.log(`  Auto-reload: ${m.autoReloadEnabled ? "ON" : "OFF"}`);
    console.log(`  Created: ${m.createdAt}`);
  } else {
    console.log("  No manifest found. Run 'copilot-live-preview init'.");
  }

  if (existsSync(settingsPath)) {
    const s = JSON.parse(readFileSync(settingsPath, "utf8"));
    const reload = s["workbench.browser.autoReloadOnFileChange"];
    console.log(`  VS Code auto-reload: ${reload ? "ENABLED" : "DISABLED"}`);
  }
  console.log("");
}

// ─── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === "--help" || cmd === "-h") { printHelp(); process.exit(0); }
if (cmd === "--version" || cmd === "-v") { console.log(VERSION); process.exit(0); }

switch (cmd) {
  case "init":     initProject(args[1]); break;
  case "validate": validateProject(args[1]); break;
  case "watch":    watchProject(args[1]); break;
  case "status":   showStatus(args[1]); break;
  default:
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
}
