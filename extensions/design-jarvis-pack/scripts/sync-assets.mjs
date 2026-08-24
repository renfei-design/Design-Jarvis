import { access, cp, copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(currentDir, '..');
const repoRoot = path.resolve(extensionRoot, '..', '..');
const assetsRoot = path.join(extensionRoot, 'assets');

await rm(assetsRoot, { recursive: true, force: true });
await rm(path.join(extensionRoot, 'skills'), { recursive: true, force: true });
await rm(path.join(extensionRoot, 'skill-packs'), { recursive: true, force: true });
await mkdir(path.join(assetsRoot, 'user-prompts'), { recursive: true });
await mkdir(path.join(assetsRoot, 'workspace'), { recursive: true });
await mkdir(path.join(extensionRoot, 'skills'), { recursive: true });
await mkdir(path.join(extensionRoot, 'skill-packs'), { recursive: true });
await copyFile(path.join(repoRoot, 'THIRD_PARTY_NOTICES.md'), path.join(extensionRoot, 'THIRD_PARTY_NOTICES.md'));

await cp(path.join(repoRoot, '.github', 'agents'), path.join(assetsRoot, 'user-prompts'), { recursive: true });
await cp(path.join(repoRoot, '.github', 'agents'), path.join(assetsRoot, 'workspace', '.github', 'agents'), { recursive: true });
await renamePackagedJarvisAgent(path.join(assetsRoot, 'user-prompts', 'design-jarvis.agent.md'));
await renamePackagedJarvisAgent(path.join(assetsRoot, 'workspace', '.github', 'agents', 'design-jarvis.agent.md'));

await cp(path.join(repoRoot, '.github', 'skills'), path.join(assetsRoot, 'workspace', '.github', 'skills'), { recursive: true });
await cp(path.join(repoRoot, '.github', 'skills'), path.join(extensionRoot, 'skills'), { recursive: true });
await copyIfExists(path.join(repoRoot, '.github', 'prompts'), path.join(assetsRoot, 'workspace', '.github', 'prompts'));
// Also install prompt files into user-prompts so the "Install agents" flow registers
// them as global slash commands (e.g. /loop-goal), not only in a set-up workspace.
await copyIfExists(path.join(repoRoot, '.github', 'prompts'), path.join(assetsRoot, 'user-prompts'));
// Ship the Jarvis Improvement Loop engine so /loop-goal's `node evals/loop/cli.mjs`
// commands resolve in a set-up workspace. Exclude runs/ (per-invocation working artifacts).
await copyIfExists(path.join(repoRoot, 'evals', 'loop'), path.join(assetsRoot, 'workspace', 'evals', 'loop'), {
  filter: (source) => !source.includes(`${path.sep}runs${path.sep}`) && !source.endsWith(`${path.sep}runs`)
});
await cp(path.join(repoRoot, '.github', 'agent-instructions.md'), path.join(assetsRoot, 'workspace', '.github', 'agent-instructions.md'));
await cp(path.join(repoRoot, 'AGENTS.md'), path.join(assetsRoot, 'workspace', 'AGENTS.md'));
await renamePackagedWorkspaceGuide(path.join(assetsRoot, 'workspace', 'AGENTS.md'));
await cp(path.join(repoRoot, 'projects', '_starters'), path.join(assetsRoot, 'workspace', 'projects', '_starters'), {
  recursive: true,
  filter: (source) => {
    const segments = source.split(path.sep);
    return !segments.includes('workflow-diagram')
      && !segments.includes('node_modules')
      && !segments.includes('dist')
      && !segments.includes('.git');
  }
});
await installCanonicalSlideStarter();

const projectContext = (await readFile(path.join(repoRoot, '.github', 'agent-instructions.md'), 'utf8')).trimEnd();
const userInstructions = `---
description: "Use when working with Design Jarvis, product design, Figma design review, UX specs, prototypes, or design project memory."
---

# Design Jarvis Core Context

These instructions make the user-level Design Jarvis agent useful in any VS Code folder. For the full workspace experience, run **Design Jarvis: Set Up This Workspace** from the Command Palette.

${projectContext}
`;

await writeFile(path.join(assetsRoot, 'user-prompts', 'design-jarvis-core.instructions.md'), userInstructions);
await writeSkillPackManifests(extensionRoot);
await updateExtensionContributions(extensionRoot);

const mcpJson = `{
  // Optional Design Jarvis integration. The core agent system works without it.
  "servers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "type": "http"
    }
  }
}
`;

await mkdir(path.join(assetsRoot, 'workspace', '.vscode'), { recursive: true });
await writeFile(path.join(assetsRoot, 'workspace', '.vscode', 'mcp.json'), mcpJson);

console.log('Design Jarvis extension assets synced.');

async function renamePackagedJarvisAgent(agentPath) {
  const source = await readFile(agentPath, 'utf8');
  const renamed = source.replace('name: Design Jarvis\n', 'name: Design Jarvis (Extension)\n');
  await writeFile(agentPath, renamed);
}

async function copyIfExists(source, target, options = {}) {
  if (!(await exists(source))) {
    return;
  }
  await cp(source, target, { recursive: true, ...options });
}

async function renamePackagedWorkspaceGuide(guidePath) {
  const source = await readFile(guidePath, 'utf8');
  const renamed = source
    .replaceAll('select **Design Jarvis**', 'select **Design Jarvis (Extension)**')
    .replaceAll('select **Design Jarvis** (or a specialist)', 'select **Design Jarvis (Extension)** (or a specialist)');
  await writeFile(guidePath, renamed);
}

async function writeSkillPackManifests(extensionRoot) {
  const allPermissions = ['read-local-context', 'read-public-web', 'write-local-artifacts', 'optional-read-figma', 'optional-write-figma'];
  const packs = [
    {
      name: 'design-jarvis-core',
      displayName: 'Jarvis Core',
      version: '0.1.0',
      owner: 'Design Jarvis contributors',
      status: 'built-in',
      description: 'Core Design Jarvis capabilities for context discovery, canvas reading, memory, Figma execution, Code Connect, and design-system libraries.',
      skills: ['canvas-read', 'figma-use', 'kb-search', 'memory', 'code-connect', 'figma-generate-library', 'loop-goal'],
      designSystems: [],
      requires: [],
      permissions: allPermissions,
      safety: 'read-only by default; verifies local and Figma writes'
    },
    {
      name: 'product-design',
      displayName: 'Product Design',
      version: '0.1.0',
      owner: 'Design Jarvis contributors',
      status: 'built-in',
      description: 'Cross-industry workflows for briefs, specifications, research, content, accessibility, high-fidelity design, and implementation.',
      skills: ['a11y-review', 'competitive-intel', 'content-review', 'data-explore', 'extract-content-strings', 'generate-ux-handoffspec', 'hifi-design', 'implement-design', 'ux-brief'],
      designSystems: [],
      requires: [],
      permissions: allPermissions,
      safety: 'uses public or user-authorized evidence and verifies artifact writes'
    },
    {
      name: 'designer-module',
      displayName: 'Designer Module',
      version: '0.1.0',
      owner: 'Design Jarvis contributors',
      status: 'built-in',
      description: 'Creation workflows for product screens and slide decks using the active project design system.',
      skills: ['product-screen', 'design-jarvis-slides'],
      designSystems: [],
      requires: [],
      permissions: allPermissions,
      safety: 'writes only to project artifact folders and verifies rendered output'
    },
    {
      name: 'research-and-operations',
      displayName: 'Research and Operations',
      version: '0.1.0',
      owner: 'Design Jarvis contributors',
      status: 'built-in',
      description: 'Tracker-neutral issue writing, feedback synthesis, content design, knowledge search, and evidence workflows.',
      skills: ['bugfiler', 'feedbackfinder', 'kb-search', 'stringweaver'],
      designSystems: [],
      requires: [],
      permissions: ['read-local-context', 'read-public-web', 'write-local-artifacts'],
      safety: 'uses only public or user-authorized sources and keeps sensitive data out of artifacts'
    }
  ];

  for (const pack of packs) {
    await writeFile(path.join(extensionRoot, 'skill-packs', `${pack.name}.json`), `${JSON.stringify(pack, null, 2)}\n`);
  }
}

async function updateExtensionContributions(extensionRoot) {
  const activeSkills = await getActiveSkillNames(path.join(extensionRoot, 'skills'));
  const packagePath = path.join(extensionRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.contributes = packageJson.contributes || {};
  packageJson.contributes.chatSkills = activeSkills.map((skillName) => ({ path: `./skills/${skillName}/SKILL.md` }));
  packageJson.contributes.chatInstructions = [
    { path: './assets/user-prompts/design-jarvis-core.instructions.md' }
  ];
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function installCanonicalSlideStarter() {
  const canonicalTemplate = path.join(repoRoot, '.github', 'skills', 'design-jarvis-slides', 'assets', 'template.html');
  const starterDir = path.join(assetsRoot, 'workspace', 'projects', '_starters', 'slide-deck');
  await mkdir(starterDir, { recursive: true });
  await copyFile(canonicalTemplate, path.join(starterDir, 'template.html'));
  await writeFile(path.join(starterDir, 'README.md'), slideStarterReadme());
  const template = await readFile(path.join(starterDir, 'template.html'), 'utf8');
  if (template.includes('Reveal.') || template.includes('reveal.js') || template.includes('class="reveal"') || !template.includes('class="deck-stage"')) {
    throw new Error('Slide starter must use the Design Jarvis deck framework, not Reveal.js.');
  }
}

function slideStarterReadme() {
  return `# Slide Deck Template

Design Jarvis presentation template with a self-contained HTML deck framework, no build step, and no runtime dependency beyond CDN fonts.

## Quick start

Copy \`template.html\` into \`projects/<slug>/slides/<deck-name>/index.html\` and replace the bracketed placeholders.

## Fidelity contract

- Stage: fixed 1920 x 1080 inside \`.deck-shell\` and \`#deck-stage\`.
- Structure: every slide is a top-level \`<section class="slide">\` inside \`#deck-stage\`.
- Cover: dark \`#050505\` stage, subtle masked grid, centered status pill, Silkscreen title, mono subtitle, and blinking cursor.
- Chrome: custom bottom-center rounded pager plus bottom-right keyboard hint.
- Navigation: ArrowLeft, ArrowRight, Space, Home, and End with slide position persisted in localStorage.
- Print: one 1920 x 1080 slide per page.

Do not use Reveal.js for Design Jarvis slide artifacts. Reveal wrappers break per-slide selection in tools that expect top-level slide sections.
`;
}

async function getActiveSkillNames(skillsRoot) {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = path.join(skillsRoot, entry.name, 'SKILL.md');
    try {
      const skill = await readFile(skillPath, 'utf8');
      if (skill.includes('[ARCHIVED]') || skill.includes('Do not use —') || skill.includes('Do not use.')) {
        continue;
      }
      names.push(entry.name);
    } catch {
      // Ignore folders without SKILL.md.
    }
  }
  return names.sort((a, b) => a.localeCompare(b));
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
