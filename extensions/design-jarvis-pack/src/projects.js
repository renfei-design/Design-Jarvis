const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ACTIVE_PROJECT_KEY = 'designJarvis.activeProjectSlug';
const REGISTRY_PATH = path.join('.jarvis', 'projects.json');

function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function discoverProjects(context) {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return [];
  const registry = await readProjectRegistry(workspaceRoot);
  const slugs = new Set();
  const projectsDir = path.join(workspaceRoot, 'projects');
  const memoryProjectsDir = path.join(workspaceRoot, '.jarvis', 'memory', 'projects');

  for (const entry of await readDirs(projectsDir)) if (!entry.startsWith('_')) slugs.add(entry);
  for (const entry of await readDirs(memoryProjectsDir)) if (!entry.startsWith('_')) slugs.add(entry);
  if (slugs.size === 0 && await hasWorkspaceRootProject(workspaceRoot)) slugs.add(safeSlug(path.basename(workspaceRoot)));

  const activeSlug = context.workspaceState.get(ACTIVE_PROJECT_KEY, '');
  const projects = [];
  for (const slug of [...slugs].sort((a, b) => a.localeCompare(b))) projects.push(await projectSummary(workspaceRoot, registry, slug, activeSlug));
  return projects;
}

async function projectSummary(workspaceRoot, registry, slug, activeSlug) {
  const record = registry.projects?.find((project) => project.slug === slug) || {};
  const projectPath = path.join(workspaceRoot, 'projects', slug);
  const workspaceRootProject = !(await exists(projectPath)) && safeSlug(path.basename(workspaceRoot)) === slug;
  const resolvedProjectPath = workspaceRootProject ? workspaceRoot : projectPath;
  const memoryPath = workspaceRootProject ? path.join(workspaceRoot, '.jarvis', 'memory') : path.join(workspaceRoot, '.jarvis', 'memory', 'projects', slug);
  const briefPath = path.join(resolvedProjectPath, 'specs', 'project-brief.md');
  const artifactsPath = path.join(memoryPath, 'artifacts.json');
  const manifestPath = path.join(memoryPath, 'manifest.json');
  const memoryFilePath = path.join(memoryPath, 'memory.md');
  const decisionsPath = path.join(memoryPath, 'decisions.md');
  const brief = await readBrief(briefPath);
  const artifacts = await readJson(artifactsPath, {});
  const figmaLinks = Array.isArray(record.figmaLinks) ? record.figmaLinks : Array.isArray(artifacts.figma) ? artifacts.figma : [];
  const name = record.name || brief.name || titleFromSlug(slug);
  const goal = record.goal || brief.goal || '';
  const status = record.status || brief.status || 'Exploring';

  return {
    slug,
    name,
    goal,
    status,
    figmaLinks,
    active: activeSlug === slug,
    workspaceRoot,
    projectPath: resolvedProjectPath,
    memoryPath,
    briefPath,
    artifactsPath,
    manifestPath,
    memoryFilePath,
    decisionsPath,
    hasBrief: await exists(briefPath),
    hasMemory: await exists(memoryFilePath),
    prototypesCount: await countFiles(path.join(resolvedProjectPath, 'prototypes')),
    slidesCount: await countFiles(path.join(resolvedProjectPath, 'slides')),
    specsCount: await countFiles(path.join(resolvedProjectPath, 'specs')),
    updatedAt: await latestMtime([resolvedProjectPath, memoryPath]),
  };
}

async function createProject(context) {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    notify('Open a folder first, then create a project.');
    return undefined;
  }

  const name = await vscode.window.showInputBox({ title: 'New Project', prompt: 'Name the design project.', placeHolder: 'Account settings' });
  if (!name) return undefined;
  const suggestedSlug = safeSlug(name);
  const slugInput = await vscode.window.showInputBox({ title: 'Project Slug', prompt: 'Use a short lowercase project id.', value: suggestedSlug, placeHolder: suggestedSlug, validateInput: (value) => safeSlug(value) === value ? undefined : 'Use lowercase letters, numbers, and hyphens only.' });
  if (!slugInput) return undefined;
  const goal = await vscode.window.showInputBox({ title: 'Project Goal', prompt: 'What are you designing?', placeHolder: 'Design an accessible account-settings experience.' });
  if (goal === undefined) return undefined;
  const figmaLink = await vscode.window.showInputBox({ title: 'Figma Link', prompt: 'Optional: paste a Figma file or frame link.', placeHolder: 'https://www.figma.com/design/...' });
  if (figmaLink === undefined) return undefined;

  const project = await initializeProject(context, { slug: safeSlug(slugInput), name, goal, figmaLinks: figmaLink ? [figmaLink] : [] });
  await setActiveProject(context, project.slug);
  await openProjectBrief(project);
  notify('Created working project: ' + project.name, 6000);
  return project;
}

async function createProjectFromInput(context, input = {}) {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) throw new Error('Open a folder first, then create a project.');
  const name = String(input.name || 'Untitled project').trim() || 'Untitled project';
  const slug = await uniqueProjectSlug(workspaceRoot, safeSlug(input.slug || name));
  const project = await initializeProject(context, {
    slug,
    name,
    goal: String(input.goal || '').trim(),
    figmaLinks: Array.isArray(input.figmaLinks) ? input.figmaLinks.filter(Boolean) : [],
  });
  await setActiveProject(context, project.slug);
  notify('Created working project: ' + project.name, 5000);
  return project;
}

async function uniqueProjectSlug(workspaceRoot, baseSlug) {
  const base = safeSlug(baseSlug || 'project');
  for (let index = 0; index < 200; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const projectPath = path.join(workspaceRoot, 'projects', slug);
    const memoryPath = path.join(workspaceRoot, '.jarvis', 'memory', 'projects', slug);
    if (!(await exists(projectPath)) && !(await exists(memoryPath))) return slug;
  }
  return `${base}-${Date.now()}`;
}

async function initializeProject(context, input) {
  const workspaceRoot = getWorkspaceRoot();
  const slug = safeSlug(input.slug || input.name || 'project');
  const name = input.name || titleFromSlug(slug);
  const goal = input.goal || '';
  const status = input.status || 'Exploring';
  const figmaLinks = input.figmaLinks || [];
  const projectPath = path.join(workspaceRoot, 'projects', slug);
  const specsPath = path.join(projectPath, 'specs');
  const memoryPath = path.join(workspaceRoot, '.jarvis', 'memory', 'projects', slug);
  await fsp.mkdir(specsPath, { recursive: true });
  await fsp.mkdir(path.join(memoryPath, 'sessions'), { recursive: true });
  await fsp.mkdir(path.join(memoryPath, 'archive'), { recursive: true });

  const project = await projectSummary(workspaceRoot, await readProjectRegistry(workspaceRoot), slug, context.workspaceState.get(ACTIVE_PROJECT_KEY, ''));
  const nextProject = { ...project, name, goal, status, figmaLinks };
  await writeIfMissing(nextProject.briefPath, projectBriefTemplate(nextProject));
  await writeIfMissing(nextProject.memoryFilePath, memoryTemplate(nextProject));
  await writeIfMissing(nextProject.decisionsPath, '# Decisions\n\n');
  await writeIfMissing(nextProject.manifestPath, JSON.stringify({ schemaVersion: 1, slug, name, updated: new Date().toISOString(), topics: [], activeDecisionIds: [], importantFiles: ['memory.md', 'decisions.md', 'artifacts.json'], artifactFile: 'artifacts.json' }, null, 2) + '\n');
  await writeIfMissing(nextProject.artifactsPath, JSON.stringify({ schemaVersion: 1, updated: new Date().toISOString(), figma: figmaLinks, prototypes: [], slides: [], specs: [] }, null, 2) + '\n');
  await upsertProjectRegistry(workspaceRoot, { slug, name, status, goal, projectPath: relativePath(workspaceRoot, projectPath), memoryPath: relativePath(workspaceRoot, memoryPath), briefPath: relativePath(workspaceRoot, nextProject.briefPath), figmaLinks, updatedAt: new Date().toISOString() });
  return projectSummary(workspaceRoot, await readProjectRegistry(workspaceRoot), slug, context.workspaceState.get(ACTIVE_PROJECT_KEY, ''));
}

async function ensureProjectMemory(context, payload) {
  const project = await resolveProject(context, payload, { allowCreate: true });
  if (!project) return undefined;
  const initialized = await initializeProject(context, project);
  notify('Project memory is ready for ' + initialized.name + '.', 5000);
  return initialized;
}

async function setActiveProject(context, payload) {
  const project = typeof payload === 'string' ? { slug: payload } : getProjectFromPayload(payload);
  if (!project?.slug) return undefined;
  await context.workspaceState.update(ACTIVE_PROJECT_KEY, project.slug);
  notify('Working project: ' + (project.name || project.slug), 5000);
  return project.slug;
}

async function removeProject(context, payload, options = {}) {
  const project = await resolveProject(context, payload, { prompt: false });
  if (!project?.slug) return false;
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return false;
  if (options.confirm !== false) {
    const confirmed = await vscode.window.showWarningMessage(
      `Delete project "${project.name || project.slug}" and its local files?`,
      { modal: true, detail: 'This removes the project folder, project memory, and Design Jarvis project registry entry from this workspace.' },
      'Delete Project'
    );
    if (confirmed !== 'Delete Project') return false;
  }

  const projectRoot = path.join(workspaceRoot, 'projects');
  const memoryRoot = path.join(workspaceRoot, '.jarvis', 'memory', 'projects');
  const expectedProjectPath = path.join(projectRoot, project.slug);
  const expectedMemoryPath = path.join(memoryRoot, project.slug);

  if (isPathInside(projectRoot, expectedProjectPath) && !path.basename(expectedProjectPath).startsWith('_')) {
    await fsp.rm(expectedProjectPath, { recursive: true, force: true });
  }
  if (isPathInside(memoryRoot, expectedMemoryPath)) {
    await fsp.rm(expectedMemoryPath, { recursive: true, force: true });
  }

  await removeProjectRegistryRecord(workspaceRoot, project.slug);
  if (context.workspaceState.get(ACTIVE_PROJECT_KEY, '') === project.slug) {
    await context.workspaceState.update(ACTIVE_PROJECT_KEY, undefined);
  }
  notify('Deleted project: ' + (project.name || project.slug), 5000);
  return true;
}

async function removeProjectFile(context, payload) {
  const filePath = payload?.filePath || payload?.resourcePath;
  if (!filePath) return false;
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return false;
  const project = getProjectFromPayload(payload) || payload?.project;
  const groupRoot = payload?.groupRoot;
  const allowedRoots = [groupRoot, project?.projectPath, project?.memoryPath]
    .filter(Boolean)
    .map((root) => path.resolve(root));
  const resolvedFile = path.resolve(filePath);
  if (!allowedRoots.some((root) => isPathInside(root, resolvedFile))) {
    vscode.window.showErrorMessage('Design Jarvis refused to delete a file outside the selected project.');
    return false;
  }

  const label = path.basename(filePath);
  const confirmed = await vscode.window.showWarningMessage(
    `Delete "${label}"?`,
    { modal: true, detail: relativePath(workspaceRoot, filePath) },
    'Delete File'
  );
  if (confirmed !== 'Delete File') return false;

  await fsp.rm(resolvedFile, { recursive: false, force: true });
  await pruneEmptyParents(path.dirname(resolvedFile), allowedRoots);
  notify('Deleted file: ' + label, 4000);
  return true;
}

async function getActiveProject(context) {
  const slug = context.workspaceState.get(ACTIVE_PROJECT_KEY, '');
  if (!slug) return undefined;
  const projects = await discoverProjects(context);
  return projects.find((project) => project.slug === slug);
}

async function chooseProject(context, options = {}) {
  const projects = await discoverProjects(context);
  const items = [];
  const activeProject = await getActiveProject(context);
  if (activeProject) items.push({ label: '$(check) ' + activeProject.name, description: 'Working project', project: activeProject });
  for (const project of projects) if (project.slug !== activeProject?.slug) items.push({ label: project.name, description: project.slug, detail: project.goal, project });
  items.push({ label: '$(add) New project', createProject: true });
  if (options.allowNone) items.push({ label: 'Continue without project', noProject: true });
  const selected = await vscode.window.showQuickPick(items, { title: options.title || 'Choose project', placeHolder: options.placeHolder || 'Choose a working project' });
  if (!selected) return undefined;
  if (selected.noProject) return null;
  if (selected.createProject) return createProject(context);
  await setActiveProject(context, selected.project);
  return selected.project;
}

async function resolveProject(context, payload, options = {}) {
  const project = getProjectFromPayload(payload);
  if (project?.slug && project?.projectPath) return project;
  if (project?.slug) {
    const projects = await discoverProjects(context);
    const discovered = projects.find((item) => item.slug === project.slug);
    if (discovered) return discovered;
  }
  const activeProject = await getActiveProject(context);
  if (activeProject) return activeProject;
  if (options.prompt !== false) return chooseProject(context, { allowNone: options.allowNone, title: options.title });
  return undefined;
}

async function openProjectBrief(projectOrPayload) {
  const project = getProjectFromPayload(projectOrPayload);
  if (!project?.briefPath) return;
  await fsp.mkdir(path.dirname(project.briefPath), { recursive: true });
  await writeIfMissing(project.briefPath, projectBriefTemplate(project));
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(project.briefPath));
  await vscode.window.showTextDocument(document, { preview: false });
}

async function addFigmaLink(context, payload) {
  const project = await resolveProject(context, payload);
  if (!project) return undefined;
  const link = await vscode.window.showInputBox({ title: 'Add Figma Link', prompt: 'Paste a Figma file or frame link for this project.', placeHolder: 'https://www.figma.com/design/...' });
  if (!link) return undefined;
  const figmaLinks = Array.from(new Set([...(project.figmaLinks || []), link]));
  await updateProjectFields(context, project.slug, { figmaLinks });
  await appendBriefLine(project.briefPath, '## Figma Links', '- ' + link);
  const artifacts = await readJson(project.artifactsPath, {});
  artifacts.schemaVersion = artifacts.schemaVersion || 1;
  artifacts.updated = new Date().toISOString();
  artifacts.figma = figmaLinks;
  await fsp.mkdir(path.dirname(project.artifactsPath), { recursive: true });
  await fsp.writeFile(project.artifactsPath, JSON.stringify(artifacts, null, 2) + '\n');
  notify('Added Figma link to ' + project.name + '.', 5000);
  return resolveProject(context, { slug: project.slug }, { prompt: false });
}

async function updateProjectFields(context, slug, fields) {
  const workspaceRoot = getWorkspaceRoot();
  const registry = await readProjectRegistry(workspaceRoot);
  const projects = registry.projects || [];
  const index = projects.findIndex((project) => project.slug === slug);
  const current = index >= 0 ? projects[index] : { slug };
  const next = { ...current, ...fields, updatedAt: new Date().toISOString() };
  if (index >= 0) projects[index] = next;
  else projects.push(next);
  registry.projects = projects.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeProjectRegistry(workspaceRoot, registry);
}

function buildProjectContextBlock(project) {
  if (!project) return '';
  return [
    'Use the working Design Jarvis project "' + project.name + '" as context.',
    '',
    'Project context:',
    '- Slug: ' + project.slug,
    project.goal ? '- Goal: ' + project.goal : '',
    project.status ? '- Status: ' + project.status : '',
    '- Brief: ' + relativePath(project.workspaceRoot, project.briefPath),
    '- Specs: ' + relativePath(project.workspaceRoot, path.join(project.projectPath, 'specs')),
    '- Prototypes: ' + relativePath(project.workspaceRoot, path.join(project.projectPath, 'prototypes')),
    '- Slides: ' + relativePath(project.workspaceRoot, path.join(project.projectPath, 'slides')),
    '- Memory: ' + relativePath(project.workspaceRoot, project.memoryFilePath),
    ...(project.figmaLinks || []).map((link) => '- Figma: ' + link),
  ].filter(Boolean).join('\n');
}

async function withProjectContext(context, prompt, options = {}) {
  let project = options.project || await getActiveProject(context);
  if (!project && options.promptForProject) {
    project = await chooseProject(context, { allowNone: true, title: 'Choose project for this task' });
    if (project === undefined) return undefined;
  }
  if (!project) return prompt;
  return prompt + '\n\n' + buildProjectContextBlock(project);
}

function getProjectFromPayload(payload) {
  if (!payload) return undefined;
  if (payload.project) return payload.project;
  if (payload.slug) return payload;
  return undefined;
}

function safeSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function titleFromSlug(slug) {
  return String(slug || 'Project').split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

async function readProjectRegistry(workspaceRoot) {
  const registry = await readJson(path.join(workspaceRoot, REGISTRY_PATH), { schemaVersion: 1, projects: [] });
  registry.schemaVersion = registry.schemaVersion || 1;
  registry.projects = Array.isArray(registry.projects) ? registry.projects : [];
  return registry;
}

async function writeProjectRegistry(workspaceRoot, registry) {
  const registryPath = path.join(workspaceRoot, REGISTRY_PATH);
  await fsp.mkdir(path.dirname(registryPath), { recursive: true });
  await fsp.writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
}

async function removeProjectRegistryRecord(workspaceRoot, slug) {
  const registry = await readProjectRegistry(workspaceRoot);
  registry.projects = registry.projects.filter((project) => project.slug !== slug);
  await writeProjectRegistry(workspaceRoot, registry);
}

async function upsertProjectRegistry(workspaceRoot, record) {
  const registry = await readProjectRegistry(workspaceRoot);
  const index = registry.projects.findIndex((project) => project.slug === record.slug);
  if (index >= 0) registry.projects[index] = { ...registry.projects[index], ...record };
  else registry.projects.push(record);
  registry.projects.sort((a, b) => a.slug.localeCompare(b.slug));
  await writeProjectRegistry(workspaceRoot, registry);
}

async function readBrief(briefPath) {
  const text = await readText(briefPath);
  if (!text) return {};
  return { name: firstHeading(text), goal: sectionText(text, 'Goal'), status: sectionText(text, 'Status') };
}

function projectBriefTemplate(project) {
  const figma = (project.figmaLinks || []).map((link) => '- ' + link).join('\n') || '- None yet';
  return ['# ' + (project.name || titleFromSlug(project.slug)), '', '## Goal', project.goal || '', '', '## Audience', '', '## Status', project.status || 'Exploring', '', '## Current Direction', '', '## Figma Links', figma, '', '## Key Decisions', '', '## Next Step', '', ''].join('\n');
}

function memoryTemplate(project) {
  return ['# ' + (project.name || titleFromSlug(project.slug)) + ' Memory', '', '- Current focus: ' + (project.goal || 'Not set yet'), '- Status: ' + (project.status || 'Exploring'), '- Brief: ' + relativePath(project.workspaceRoot, project.briefPath), '- Next step: Define the project brief and first artifact.', '', '## Constraints', '', '## Active Decisions', '', '## Pointers', '', ''].join('\n');
}

function firstHeading(text) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function sectionText(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## ' + heading);
  if (start === -1) return '';
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
}

async function appendBriefLine(briefPath, heading, line) {
  await fsp.mkdir(path.dirname(briefPath), { recursive: true });
  let text = await readText(briefPath);
  if (!text) text = '# Project Brief\n\n' + heading + '\n';
  if (!text.includes(heading)) text += '\n' + heading + '\n';
  if (text.includes(line)) return;
  const index = text.indexOf(heading) + heading.length;
  const nextBreak = text.indexOf('\n## ', index);
  if (nextBreak === -1) text = text.trimEnd() + '\n' + line + '\n';
  else text = text.slice(0, nextBreak).trimEnd() + '\n' + line + '\n' + text.slice(nextBreak);
  await fsp.writeFile(briefPath, text);
}

async function hasWorkspaceRootProject(workspaceRoot) {
  return exists(path.join(workspaceRoot, 'specs')) || exists(path.join(workspaceRoot, 'prototypes')) || exists(path.join(workspaceRoot, '.jarvis', 'memory'));
}

async function countFiles(folderPath) {
  if (!await exists(folderPath)) return 0;
  let count = 0;
  for (const entry of await fsp.readdir(folderPath, { withFileTypes: true })) if (entry.isFile()) count += 1;
  return count;
}

async function latestMtime(paths) {
  let latest = 0;
  for (const filePath of paths) {
    try { latest = Math.max(latest, (await fsp.stat(filePath)).mtimeMs); } catch {}
  }
  return latest ? new Date(latest).toISOString() : '';
}

async function readDirs(folderPath) {
  if (!await exists(folderPath)) return [];
  return (await fsp.readdir(folderPath, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function readText(filePath) {
  try { return await fsp.readFile(filePath, 'utf8'); } catch { return ''; }
}

async function readJson(filePath, fallback) {
  try { return JSON.parse(await fsp.readFile(filePath, 'utf8')); } catch { return fallback; }
}

async function writeIfMissing(filePath, contents) {
  if (await exists(filePath)) return;
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, contents);
}

function relativePath(workspaceRoot, filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join('/');
}

function isPathInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

async function pruneEmptyParents(startDir, allowedRoots) {
  let current = path.resolve(startDir);
  const roots = allowedRoots.map((root) => path.resolve(root));
  while (roots.some((root) => isPathInside(root, current)) && !roots.includes(current)) {
    let entries = [];
    try { entries = await fsp.readdir(current); } catch { return; }
    if (entries.length > 0) return;
    await fsp.rmdir(current).catch(() => {});
    current = path.dirname(current);
  }
}

function notify(message, timeout = 5000) {
  vscode.window.setStatusBarMessage(message, timeout);
}

async function exists(filePath) {
  try { await fsp.access(filePath, fs.constants.F_OK); return true; } catch { return false; }
}

module.exports = { ACTIVE_PROJECT_KEY, addFigmaLink, buildProjectContextBlock, chooseProject, createProject, createProjectFromInput, discoverProjects, ensureProjectMemory, getActiveProject, getProjectFromPayload, getWorkspaceRoot, openProjectBrief, removeProject, removeProjectFile, resolveProject, setActiveProject, withProjectContext };
