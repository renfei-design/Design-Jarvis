#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  "README.md",
  "AGENTS.md",
  "ARCHITECTURE.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "SECURITY.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  ".github",
  "docs",
  "evals",
  "extensions/design-jarvis-pack",
  "projects/_starters",
];
const skippedDirectories = new Set([".git", ".jarvis", "dist", "node_modules", "runs"]);
const errors = [];

for (const root of roots) scan(resolve(repoRoot, root));

if (errors.length) {
  console.error("Local link check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Local link check passed.");

function scan(path) {
  if (!existsSync(path)) return;
  const entries = readEntries(path);
  if (!entries) {
    const extension = extname(path).toLowerCase();
    if (extension === ".md") checkMarkdown(path);
    if (extension === ".html") checkHtml(path);
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    scan(join(path, entry.name));
  }
}

function readEntries(path) {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return null;
  }
}

function checkMarkdown(path) {
  const text = readFileSync(path, "utf8");
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of text.matchAll(pattern)) checkTarget(path, match[1]);
}

function checkHtml(path) {
  const text = readFileSync(path, "utf8");
  const pattern = /(?:href|src)=["']([^"']+)["']/g;
  for (const match of text.matchAll(pattern)) checkTarget(path, match[1]);
}

function checkTarget(source, rawTarget) {
  const target = decodeURIComponent(rawTarget.split("#", 1)[0]);
  if (!target || shouldSkip(target)) return;
  const resolved = resolve(dirname(source), target);
  if (!existsSync(resolved)) {
    errors.push(`${relative(repoRoot, source)} -> ${rawTarget}`);
  }
}

function shouldSkip(target) {
  return target.startsWith("#")
    || target.startsWith("/")
    || target.startsWith("[")
    || target.includes("<")
    || target.includes(">")
    || /^[a-z][a-z0-9+.-]*:/i.test(target);
}
