/**
 * Copies the contents of `public/` into Plasmo's build output(s)
 * so that face-api.js model weights and any other static assets
 * are available to the extension at runtime.
 *
 * Plasmo does not automatically copy the `public/` directory.
 * This script is OS-agnostic (Node fs/promises only).
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs/promises");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const BUILD_ROOT = path.join(ROOT, "build");

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".gitkeep") continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isFile()) {
      await fs.copyFile(from, to);
    }
  }
}

async function main() {
  if (!(await exists(PUBLIC_DIR))) {
    console.warn("[copy-public] public/ directory does not exist, skipping.");
    return;
  }

  if (!(await exists(BUILD_ROOT))) {
    console.warn("[copy-public] build/ directory does not exist yet, skipping.");
    return;
  }

  const targets = await fs.readdir(BUILD_ROOT, { withFileTypes: true });
  let copied = 0;

  for (const target of targets) {
    if (!target.isDirectory()) continue;
    const targetDir = path.join(BUILD_ROOT, target.name);
    await copyDir(PUBLIC_DIR, targetDir);
    copied++;
    console.log(`[copy-public] Copied public/ -> build/${target.name}/`);
  }

  if (copied === 0) {
    console.warn("[copy-public] No build targets found inside build/.");
  }
}

main().catch((err) => {
  console.error("[copy-public] Failed:", err);
  process.exit(1);
});
