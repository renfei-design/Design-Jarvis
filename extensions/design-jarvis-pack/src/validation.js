const fsp = require('fs/promises');
const path = require('path');

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

function assertSkillName(value) {
  const name = String(value || '').trim();
  if (!SKILL_NAME_PATTERN.test(name) || name === '.' || name === '..') {
    throw new Error('Invalid skill name: use letters, numbers, dots, underscores, or hyphens only.');
  }
  return name;
}

function safePackName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128) || 'personal-skills';
}

function safeChildPath(root, name) {
  const childName = assertSkillName(name);
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, childName);
  const relative = path.relative(resolvedRoot, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Skill path must stay inside the skills directory.');
  }
  return candidate;
}

async function assertNoSymbolicLinks(root) {
  const stat = await fsp.lstat(root);
  if (stat.isSymbolicLink()) {
    throw new Error('Skill packs containing symbolic links are not supported.');
  }
  if (!stat.isDirectory()) return;

  const entries = await fsp.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error('Skill packs containing symbolic links are not supported.');
    }
    if (entry.isDirectory()) {
      await assertNoSymbolicLinks(path.join(root, entry.name));
    }
  }
}

module.exports = { assertNoSymbolicLinks, assertSkillName, safeChildPath, safePackName };
