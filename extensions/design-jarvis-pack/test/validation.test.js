const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { assertNoSymbolicLinks, assertSkillName, safeChildPath, safePackName } = require('../src/validation');

test('accepts ordinary skill names', () => {
  assert.equal(assertSkillName('figma-use'), 'figma-use');
  assert.equal(assertSkillName('research_v2.1'), 'research_v2.1');
});

test('rejects traversal and path separators in skill names', () => {
  for (const value of ['../escape', '..', '.', '/tmp/escape', 'nested/skill', 'nested\\skill', '']) {
    assert.throws(() => assertSkillName(value), /Invalid skill name/);
  }
});

test('keeps skill destinations beneath the intended root', () => {
  const root = path.join(os.tmpdir(), 'design-jarvis-skills');
  assert.equal(safeChildPath(root, 'research-plan'), path.join(root, 'research-plan'));
  assert.throws(() => safeChildPath(root, '../../escape'), /Invalid skill name/);
});

test('normalizes pack metadata filenames', () => {
  assert.equal(safePackName('../../My Pack'), 'my-pack');
  assert.equal(safePackName(''), 'personal-skills');
});

test('rejects symbolic links in a selected skill tree', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'design-jarvis-validation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'skill'));
  await fs.writeFile(path.join(root, 'skill', 'SKILL.md'), '# Skill\n');
  await assert.doesNotReject(() => assertNoSymbolicLinks(root));
  await fs.symlink(path.join(root, 'skill', 'SKILL.md'), path.join(root, 'linked-skill.md'));
  await assert.rejects(() => assertNoSymbolicLinks(root), /symbolic links/);
});
