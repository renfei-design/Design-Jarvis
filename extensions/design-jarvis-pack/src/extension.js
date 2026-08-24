const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { DesignJarvisHomeProvider } = require('./homeView');
const { DesignJarvisProjectsProvider } = require('./projectTree');
const { DesignJarvisAgentsProvider } = require('./agentsView');
const { DesignJarvisConnectorsProvider, DesignJarvisSkillPacksProvider, hideSkillPack, searchSkills, showHiddenSkillPack } = require('./skillPacks');
const { DesignJarvisPromptLibraryProvider, readPromptLibrary, safePromptCommandName } = require('./promptLibrary');
const { addFigmaLink, chooseProject, createProject, ensureProjectMemory, getActiveProject, getProjectFromPayload, openProjectBrief, removeProject, removeProjectFile, setActiveProject } = require('./projects');
const { assertNoSymbolicLinks, assertSkillName, safeChildPath, safePackName } = require('./validation');

const MANIFEST_NAME = 'install-manifest.json';

function activate(context) {
  const homeProvider = new DesignJarvisHomeProvider(context);
  const projectsProvider = new DesignJarvisProjectsProvider(context);
  const agentsProvider = new DesignJarvisAgentsProvider(context);
  const skillPacksProvider = new DesignJarvisSkillPacksProvider(context);
  const connectorsProvider = new DesignJarvisConnectorsProvider(context);
  const promptLibraryProvider = new DesignJarvisPromptLibraryProvider(context);

  registerDesignJarvisMcpServers(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DesignJarvisHomeProvider.viewType, homeProvider),
    vscode.window.registerTreeDataProvider('designJarvis.projects', projectsProvider),
    vscode.window.registerTreeDataProvider('designJarvis.agents', agentsProvider),
    vscode.window.registerTreeDataProvider('designJarvis.skillPacks', skillPacksProvider),
    vscode.window.registerTreeDataProvider('designJarvis.connectors', connectorsProvider),
    vscode.window.registerTreeDataProvider('designJarvis.promptLibrary', promptLibraryProvider),
    vscode.commands.registerCommand('designJarvis.installForMe', async () => {
      await installForMe(context);
      await homeProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.setupWorkspace', async () => {
      await setupWorkspace(context);
      await homeProvider.refresh();
      projectsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.checkSetup', async () => {
      await checkSetup(context);
      await homeProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.openGuide', () => openGuide(context)),
    vscode.commands.registerCommand('designJarvis.openChat', () => openAgentChat()),
    vscode.commands.registerCommand('designJarvis.startWork', () => startWork(context)),
    vscode.commands.registerCommand('designJarvis.refreshProjects', () => projectsProvider.refresh()),
    vscode.commands.registerCommand('designJarvis.newProject', async () => {
      await createProject(context);
      projectsProvider.refresh();
      await homeProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.setActiveProject', async (payload) => {
      await setActiveProject(context, payload);
      projectsProvider.refresh();
      await homeProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.startProject', async (payload) => {
      await setActiveProject(context, payload);
      projectsProvider.refresh();
      const project = getProjectFromPayload(payload) || await getActiveProject(context) || await chooseProject(context, { title: 'Choose project' });
      if (!project) return;
      const readyProject = await ensureProjectMemory(context, project) || project;
      await openAgentChatWithPrompt(projectChatHandoffPrompt(readyProject));
    }),
    vscode.commands.registerCommand('designJarvis.openProjectBrief', async (payload) => openProjectBrief(getProjectFromPayload(payload))),
    vscode.commands.registerCommand('designJarvis.editProjectBrief', async (payload) => openProjectBrief(getProjectFromPayload(payload))),
    vscode.commands.registerCommand('designJarvis.addProjectFigmaLink', async (payload) => {
      await addFigmaLink(context, payload);
      projectsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.initializeProjectMemory', async (payload) => {
      await ensureProjectMemory(context, payload);
      projectsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.revealProjectFiles', async (payload) => revealProjectFiles(payload)),
    vscode.commands.registerCommand('designJarvis.removeProject', async (payload) => {
      const removed = await removeProject(context, payload);
      if (!removed) return;
      projectsProvider.refresh();
      await homeProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.removeProjectFile', async (payload) => {
      const removed = await removeProjectFile(context, payload);
      if (!removed) return;
      projectsProvider.refresh();
      await homeProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.askAboutProject', async (payload) => askAboutProject(context, payload)),
    vscode.commands.registerCommand('designJarvis.refreshAgents', () => agentsProvider.refresh()),
    vscode.commands.registerCommand('designJarvis.openAgents', () => openView('designJarvis.agents', 'Open the Design Jarvis sidebar, then expand Agents.')),
    vscode.commands.registerCommand('designJarvis.openProjects', () => openView('designJarvis.projects', 'Open the Design Jarvis sidebar, then expand Projects.')),
    vscode.commands.registerCommand('designJarvis.refreshSkillPacks', async () => {
      await syncInstalledSkillPacks(context);
      skillPacksProvider.refresh();
      connectorsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.refreshPromptLibrary', () => promptLibraryProvider.refresh()),
    vscode.commands.registerCommand('designJarvis.openSkillPacks', () => openView('designJarvis.skillPacks', 'Open the Design Jarvis sidebar, then expand Skill Packs.')),
    vscode.commands.registerCommand('designJarvis.openConnectors', () => openView('designJarvis.connectors', 'Open the Design Jarvis sidebar, then expand Connectors.')),
    vscode.commands.registerCommand('designJarvis.openPromptLibrary', () => openView('designJarvis.promptLibrary', 'Open the Design Jarvis sidebar, then expand Prompt Library.')),
    vscode.commands.registerCommand('designJarvis.installSkillPackFromFolder', async () => {
      await installSkillPackFromFolder(context);
      skillPacksProvider.refresh();
      connectorsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.showSkillPackDetails', async (payload) => showSkillPackDetails(payload)),
    vscode.commands.registerCommand('designJarvis.hideSkillPack', async (payload) => {
      const changed = await hideSkillPack(context, payload);
      if (changed) skillPacksProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.showHiddenSkillPack', async () => {
      const changed = await showHiddenSkillPack(context);
      if (changed) skillPacksProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.searchSkills', async () => {
      await searchSkills(context);
    }),
    vscode.commands.registerCommand('designJarvis.removeSkillPack', async (payload) => {
      await removeSkillPack(context, payload);
      skillPacksProvider.refresh();
      connectorsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.syncSkillPack', async (payload) => {
      await syncInstalledSkillPacks(context, payload?.pack);
      skillPacksProvider.refresh();
      connectorsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.syncAllSkillPacks', async () => {
      await syncInstalledSkillPacks(context);
      skillPacksProvider.refresh();
      connectorsProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.newPrompt', async () => {
      await createPrompt(context);
      promptLibraryProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.editPrompt', async (payload) => {
      await editPrompt(context, payload);
      promptLibraryProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.removePrompt', async (payload) => {
      await removePrompt(context, payload);
      promptLibraryProvider.refresh();
    }),
    vscode.commands.registerCommand('designJarvis.useSkillInChat', async (payload) => useSkillInChat(context, payload)),
    vscode.commands.registerCommand('designJarvis.usePromptInChat', async (payload) => usePromptInChat(context, payload)),
    vscode.commands.registerCommand('designJarvis.useAgentInChat', async (payload) => useAgentInChat(context, payload)),
    vscode.commands.registerCommand('designJarvis.showAgentDetails', async (payload) => showAgentDetails(payload)),
    vscode.commands.registerCommand('designJarvis.openAgentFile', async (payload) => openAgentFile(payload))
  );

}

function deactivate() {}

function notify(message, timeout = 5000) {
  vscode.window.setStatusBarMessage(message, timeout);
}

function registerDesignJarvisMcpServers(context) {
  if (!vscode.lm?.registerMcpServerDefinitionProvider || !vscode.McpHttpServerDefinition) {
    return;
  }

  const changeEmitter = new vscode.EventEmitter();
  context.subscriptions.push(changeEmitter);

  context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('designJarvisMcp', {
    onDidChangeMcpServerDefinitions: changeEmitter.event,
    provideMcpServerDefinitions: () => createDesignJarvisMcpDefinitions(),
    resolveMcpServerDefinition: (server) => server
  }));
}

function createDesignJarvisMcpDefinitions() {
  return [
    new vscode.McpHttpServerDefinition('figma', vscode.Uri.parse('https://mcp.figma.com/mcp'))
  ];
}

async function installForMe(context) {
  const sourceDir = path.join(context.extensionPath, 'assets', 'user-prompts');
  const targetDir = getUserPromptsDir(context);

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Installing Design Jarvis',
      cancellable: false
    },
    async () => {
      await ensureAssets(sourceDir);
      await fsp.mkdir(targetDir, { recursive: true });
      const manifest = await loadManifest(context);
      const summary = await copyTree(sourceDir, targetDir, manifest);
      await saveManifest(context, manifest);
      await installLoopEngine(context);
      return summary;
    }
  );

  const changed = result.written + result.backedUp;
  notify(`Design Jarvis is installed. Added or updated ${changed} files. Open agent chat and choose Design Jarvis (Extension).`, 8000);
}

// Install the Jarvis Improvement Loop engine to a stable global path so /loop-goal
// works in ANY workspace once the extension is installed — without requiring a
// per-workspace "Set Up This Workspace" run. The loop-goal prompt locates the CLI
// at $HOME/.design-jarvis/loop/cli.mjs and targets the active workspace via --repo-root.
async function installLoopEngine(context) {
  const source = path.join(context.extensionPath, 'assets', 'workspace', 'evals', 'loop');
  if (!fs.existsSync(source)) return;
  const target = path.join(os.homedir(), '.design-jarvis', 'loop');
  try {
    await fsp.rm(target, { recursive: true, force: true });
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.cp(source, target, {
      recursive: true,
      filter: (src) => !src.includes(`${path.sep}runs${path.sep}`) && !src.endsWith(`${path.sep}runs`)
    });
  } catch {
    // Non-fatal: /loop-goal still works in workspaces that ran "Set Up This Workspace".
  }
}

async function setupWorkspace(context) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    notify('Open a folder first, then run Design Jarvis: Set Up This Workspace.');
    return;
  }

  const sourceDir = path.join(context.extensionPath, 'assets', 'workspace');
  const targetDir = folder.uri.fsPath;

  const choice = await vscode.window.showQuickPick(
    [{ label: 'Prepare this project', detail: 'Adds Design Jarvis skills, starter templates, and workspace connector settings.' }],
    { title: 'Design Jarvis project setup', placeHolder: 'Choose whether to prepare this project' }
  );

  if (!choice) return;

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Setting up this folder for Design Jarvis',
      cancellable: false
    },
    async () => {
      await ensureAssets(sourceDir);
      const manifest = await loadManifest(context);
      const summary = await copyTree(sourceDir, targetDir, manifest);
      await saveManifest(context, manifest);
      return summary;
    }
  );

  const changed = result.written + result.backedUp;
  notify(`This folder is ready for Design Jarvis. Added or updated ${changed} files.`, 8000);
}

async function checkSetup(context) {
  const promptsDir = getUserPromptsDir(context);
  const userAgent = path.join(promptsDir, 'design-jarvis.agent.md');
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const checks = [];
  checks.push(await exists(userAgent) ? 'Design Jarvis is installed for you.' : 'Design Jarvis is not installed for you yet.');

  if (workspace) {
    checks.push(await exists(path.join(workspace, '.github', 'skills')) ? 'This folder has the full skills.' : 'This folder does not have the full skills yet.');
    checks.push(await exists(path.join(workspace, '.vscode', 'mcp.json')) ? 'This folder has optional workspace connector setup.' : 'Figma is available as an optional extension integration. Workspace connector setup is optional.');
  } else {
    checks.push('No folder is open right now.');
  }

  notify(checks.join(' '), 10000);
}

async function useSkillInChat(context, payload) {
  const skillName = getSkillNameFromPayload(payload);
  if (!skillName) {
    notify('No skill command is available for this item.');
    return;
  }

  await openAgentChatWithPrompt('/' + skillName);
}

function getSkillNameFromPayload(payload) {
  if (!payload) return undefined;
  if (typeof payload === 'string') return payload;
  if (payload.value) return String(payload.value);
  if (payload.skillName) return String(payload.skillName);
  if (typeof payload.label === 'string') return payload.label;
  if (payload.label?.label) return String(payload.label.label);
  return undefined;
}
async function usePromptInChat(context, payload) {
  const prompt = await resolvePromptPayload(context, payload);
  const commandName = getPromptCommandNameFromPayload(prompt || payload);
  if (!commandName) {
    notify('No prompt command is available for this item.');
    return;
  }

  await openAgentChatWithPrompt('/' + commandName);
}

async function createPrompt(context) {
  const nameInput = await vscode.window.showInputBox({
    title: 'New Prompt',
    prompt: 'Name the slash command for this reusable prompt.',
    placeHolder: 'weekly-design-review or /weekly-design-review'
  });
  if (!nameInput) {
    return;
  }

  const commandName = safePromptCommandName(nameInput);
  const description = await vscode.window.showInputBox({
    title: 'Prompt Description',
    prompt: 'Add a short description shown in the Prompt Library.',
    placeHolder: 'Summarize design feedback and next steps.'
  });

  const promptsDir = getUserPromptsDir(context);
  await fsp.mkdir(promptsDir, { recursive: true });
  const promptPath = path.join(promptsDir, commandName + '.prompt.md');

  if (await exists(promptPath)) {
    await openPromptFile(promptPath);
    notify('/' + commandName + ' already exists. Opened it for editing.', 6000);
    return;
  }

  await fsp.writeFile(promptPath, promptTemplate(commandName, description || ''));
  await openPromptFile(promptPath);
  notify('Created /' + commandName + '. Edit the template, then use it from Prompt Library or agent chat.', 8000);
}

async function editPrompt(context, payload) {
  const prompt = await resolvePromptPayload(context, payload);
  if (!prompt?.filePath) {
    notify('No prompt file is available for this item.');
    return;
  }

  await openPromptFile(prompt.filePath);
}

async function removePrompt(context, payload) {
  const prompt = await resolvePromptPayload(context, payload);
  if (!prompt?.filePath) {
    notify('No prompt file is available for this item.');
    return;
  }

  const commandName = getPromptCommandNameFromPayload(prompt);
  const selected = await vscode.window.showQuickPick(
    [{ label: 'Delete prompt', description: '/' + commandName }],
    { title: 'Remove /' + commandName + '?', placeHolder: 'This deletes the prompt file from your user prompt library.' }
  );
  if (!selected) {
    return;
  }

  await fsp.rm(prompt.filePath, { force: true });
  notify('Removed /' + commandName + '.', 5000);
}

async function resolvePromptPayload(context, payload) {
  const commandName = getPromptCommandNameFromPayload(payload?.prompt || payload);
  const prompts = await readPromptLibrary(context);
  if (commandName) {
    return prompts.find((prompt) => prompt.commandName === commandName);
  }

  if (prompts.length === 0) {
    return undefined;
  }

  const selected = await vscode.window.showQuickPick(
    prompts.map((prompt) => ({ label: '/' + prompt.commandName, description: prompt.description, prompt })),
    { title: 'Prompt Library', placeHolder: 'Choose a prompt' }
  );
  return selected?.prompt;
}

function getPromptCommandNameFromPayload(payload) {
  if (!payload) return undefined;
  if (typeof payload === 'string') return normalizePromptCommandName(payload);
  if (payload.commandName) return normalizePromptCommandName(payload.commandName);
  if (payload.promptName) return normalizePromptCommandName(payload.promptName);
  if (payload.name) return normalizePromptCommandName(payload.name);
  if (payload.value) return normalizePromptCommandName(payload.value);
  if (typeof payload.label === 'string') return normalizePromptCommandName(payload.label);
  if (payload.label?.label) return normalizePromptCommandName(payload.label.label);
  return undefined;
}

function normalizePromptCommandName(value) {
  const commandName = String(value || '').trim().replace(/^\/+/, '').split(/\s+/)[0];
  return commandName ? safePromptCommandName(commandName) : undefined;
}

async function openPromptFile(filePath) {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  await vscode.window.showTextDocument(document, { preview: false });
}

function promptTemplate(commandName, description) {
  return [
    '---',
    'name: ' + commandName,
    'description: "' + escapeYamlValue(description) + '"',
    '---',
    ''
  ].join('\n');
}
function escapeYamlValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
async function useAgentInChat(context, payload) {
  const agent = getAgentFromPayload(payload);
  if (!agent?.name) {
    notify('No agent role is available for this item.');
    return;
  }

  await openAgentChatWithPrompt('Use the ' + agent.name + ' specialist to ');
}

async function showAgentDetails(payload) {
  const agent = getAgentFromPayload(payload);
  if (!agent?.name) {
    notify('No agent details are available for this item.');
    return;
  }

  notify(agent.name + ': ' + (agent.bestFor || agent.description || 'Specialist role routed through Design Jarvis.'), 8000);
}

async function openAgentFile(payload) {
  const agent = getAgentFromPayload(payload);
  if (!agent?.filePath) {
    notify('No agent file is available for this item.');
    return;
  }

  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(agent.filePath));
  await vscode.window.showTextDocument(document, { preview: true });
}

function getAgentFromPayload(payload) {
  if (!payload) return undefined;
  if (payload.agent) return payload.agent;
  if (payload.name) return payload;
  if (payload.label?.label) return { name: String(payload.label.label), filePath: payload.filePath, bestFor: payload.bestFor, description: payload.description };
  if (typeof payload.label === 'string') return { name: payload.label, filePath: payload.filePath, bestFor: payload.bestFor, description: payload.description };
  return undefined;
}

async function revealProjectFiles(payload) {
  const project = getProjectFromPayload(payload);
  if (!project?.projectPath) {
    notify('No project folder is available for this item.');
    return;
  }
  await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(project.projectPath));
}

async function askAboutProject(context, payload) {
  const project = getProjectFromPayload(payload) || await chooseProject(context, { title: 'Choose project to ask about' });
  if (!project) return;
  await setActiveProject(context, project);
  await openAgentChatWithPrompt(projectChatHandoffPrompt(project));
}

function projectChatHandoffPrompt(project) {
  return [
    'Set the active Design Jarvis project to: ' + (project.name || project.slug) + '.',
    'Project slug: ' + project.slug + '.',
    '',
    'Inspect the active project files, artifacts, and memory before proposing work. Do not ask me to paste context that is already available locally.',
    'Acknowledge this project in one short sentence, then wait for my next instruction.'
  ].join('\n');
}
async function syncInstalledSkillPacks(context, targetPack) {
  const packs = targetPack ? [targetPack] : await readInstalledSkillPackManifests(context);
  const installedPacks = packs.filter((pack) => pack?.status === 'installed');
  if (installedPacks.length === 0) {
    notify('No installed local skill packs to sync.');
    return;
  }

  const userSkillsDir = path.join(os.homedir(), '.agent', 'skills');
  let syncedCount = 0;
  const skipped = [];

  for (const pack of installedPacks) {
    let sourceFolder = pack.sourceFolder;
    if ((!sourceFolder || !(await exists(sourceFolder))) && targetPack) {
      sourceFolder = await chooseSkillSourceFolder(pack);
    }

    if (!sourceFolder || !(await exists(sourceFolder))) {
      skipped.push(pack.displayName || pack.name || 'Unnamed pack');
      continue;
    }

    const installPlan = await createSkillInstallPlan(sourceFolder);
    if (!installPlan) {
      skipped.push(pack.displayName || pack.name || pack.sourceFolder);
      continue;
    }

    await fsp.mkdir(userSkillsDir, { recursive: true });
    for (const skillName of installPlan.skills) {
      const source = await findSkillSource(installPlan.folder, skillName);
      if (!source) continue;
      await assertNoSymbolicLinks(source);
      const target = safeChildPath(userSkillsDir, skillName);
      await backupExistingTarget(target);
      await fsp.cp(source, target, { recursive: true });
      syncedCount += 1;
    }

    const manifest = { ...installPlan.manifest, name: safePackName(installPlan.manifest.name), status: 'installed', installedAt: pack.installedAt || new Date().toISOString(), syncedAt: new Date().toISOString(), installLocation: userSkillsDir, sourceFolder: installPlan.folder };
    await fsp.mkdir(path.join(context.globalStorageUri.fsPath, 'installed-skill-packs'), { recursive: true });
    await fsp.writeFile(path.join(context.globalStorageUri.fsPath, 'installed-skill-packs', manifest.name + '.json'), JSON.stringify(manifest, null, 2) + '\n');
  }

  const skippedText = skipped.length > 0 ? ' Skipped: ' + skipped.join(', ') + '.' : '';
  notify('Synced ' + syncedCount + ' skill' + (syncedCount === 1 ? '' : 's') + '.' + skippedText + ' Reload VS Code if changes do not appear.', 8000);
}

async function chooseSkillSourceFolder(pack) {
  const selected = await vscode.window.showOpenDialog({
    title: 'Choose source folder for ' + (pack.displayName || pack.name || 'this skill pack'),
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Use this folder'
  });
  return selected?.[0]?.fsPath;
}
async function readInstalledSkillPackManifests(context) {
  const packsDir = path.join(context.globalStorageUri.fsPath, 'installed-skill-packs');
  if (!(await exists(packsDir))) return [];
  const entries = await fsp.readdir(packsDir, { withFileTypes: true });
  const packs = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try {
      packs.push(JSON.parse(await fsp.readFile(path.join(packsDir, entry.name), 'utf8')));
    } catch {
      // Ignore malformed installed pack metadata.
    }
  }
  return packs;
}
async function removeSkillPack(context, payload) {
  const pack = payload?.pack;
  if (!pack || pack.status !== 'installed') {
    notify('Built-in skill packs cannot be removed from here.');
    return;
  }

  const skillNames = Array.isArray(pack.skills) ? pack.skills.flatMap((name) => {
    try { return [assertSkillName(name)]; } catch { return []; }
  }) : [];
  const choice = await vscode.window.showQuickPick(
    [{ label: 'Remove', detail: 'Removes copied skill folder(s) from your user agent skills. Backups are not deleted.' }],
    { title: 'Remove ' + (pack.displayName || pack.name), placeHolder: 'Choose Remove to continue' }
  );
  if (!choice) return;

  const userSkillsDir = path.join(os.homedir(), '.agent', 'skills');
  let removedCount = 0;
  for (const skillName of skillNames) {
    const skillPath = safeChildPath(userSkillsDir, skillName);
    if (await exists(skillPath)) {
      await fsp.rm(skillPath, { recursive: true, force: true });
      removedCount += 1;
    }
  }

  const manifestPath = path.join(context.globalStorageUri.fsPath, 'installed-skill-packs', safePackName(pack.name) + '.json');
  if (await exists(manifestPath)) {
    await fsp.rm(manifestPath, { force: true });
  }

  notify('Removed ' + removedCount + ' skill' + (removedCount === 1 ? '' : 's') + ' from ' + (pack.displayName || pack.name) + '. Reload VS Code if it still appears.', 8000);
}
async function installSkillPackFromFolder(context) {
  const selected = await vscode.window.showOpenDialog({
    title: 'Choose a skill, skill pack, or personal skills folder',
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Install skills'
  });

  const selectedFolder = selected?.[0]?.fsPath;
  if (!selectedFolder) return;

  const installPlan = await createSkillInstallPlan(selectedFolder);
  if (!installPlan) {
    notify('Choose a folder with SKILL.md, skill-pack.json, or skill folders.');
    return;
  }

  const userSkillsDir = path.join(os.homedir(), '.agent', 'skills');
  await fsp.mkdir(userSkillsDir, { recursive: true });
  await fsp.mkdir(path.join(context.globalStorageUri.fsPath, 'installed-skill-packs'), { recursive: true });

  const missing = [];
  let installedCount = 0;
  for (const skillName of installPlan.skills) {
    const source = await findSkillSource(installPlan.folder, skillName);
    if (!source) {
      missing.push(skillName);
      continue;
    }

    await assertNoSymbolicLinks(source);
    const target = safeChildPath(userSkillsDir, skillName);
    await backupExistingTarget(target);
    await fsp.cp(source, target, { recursive: true });
    installedCount += 1;
  }

  installPlan.manifest.status = 'installed';
  installPlan.manifest.installedAt = new Date().toISOString();
  installPlan.manifest.installLocation = userSkillsDir;
  installPlan.manifest.sourceFolder = installPlan.folder;
  await fsp.writeFile(path.join(context.globalStorageUri.fsPath, 'installed-skill-packs', installPlan.manifest.name + '.json'), JSON.stringify(installPlan.manifest, null, 2) + '\n');

  if (installedCount === 0) {
    notify('No skills were installed. Missing: ' + (missing.join(', ') || 'skill folders') + '.', 8000);
    return;
  }

  notify('Installed ' + installedCount + ' skill' + (installedCount === 1 ? '' : 's') + ' from ' + (installPlan.manifest.displayName || installPlan.manifest.name) + '. Reload VS Code if it does not appear immediately.', 8000);
}

async function createSkillInstallPlan(selectedFolder) {
  const skillFile = path.join(selectedFolder, 'SKILL.md');
  if (await exists(skillFile)) {
    const skillName = await readSkillName(skillFile, path.basename(selectedFolder));
    return {
      folder: selectedFolder,
      skills: [skillName],
      manifest: {
        name: skillName,
        displayName: skillName,
        version: 'local',
        owner: 'Local',
        status: 'installed',
        description: 'Local skill installed from this computer.',
        skills: [skillName],
        designSystems: [],
        requires: [],
        permissions: allSkillPackPermissions(),
        safety: 'review the SKILL.md before use'
      }
    };
  }

  const manifestPath = path.join(selectedFolder, 'skill-pack.json');
  if (!(await exists(manifestPath))) {
    const detectedSkills = await detectSkillFolders(selectedFolder);
    if (detectedSkills.length === 0) {
      return undefined;
    }

    return {
      folder: selectedFolder,
      skills: detectedSkills,
      manifest: {
        name: safePackName(path.basename(selectedFolder) || 'personal-skills'),
        displayName: path.basename(selectedFolder) || 'Personal Skills',
        version: 'local',
        owner: 'Local',
        status: 'installed',
        description: 'Personal skills folder installed from this computer.',
        skills: detectedSkills,
        designSystems: [],
        requires: [],
        permissions: allSkillPackPermissions(),
        safety: 'review each SKILL.md before use'
      }
    };
  }

  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const skills = Array.isArray(manifest.skills) ? manifest.skills.map(assertSkillName) : [];
  if (skills.length === 0) {
    return undefined;
  }

  return {
    folder: selectedFolder,
    skills,
    manifest: {
      name: safePackName(manifest.name || path.basename(selectedFolder)),
      displayName: manifest.displayName || manifest.name || path.basename(selectedFolder),
      version: manifest.version || 'local',
      owner: manifest.owner || 'Local',
      status: 'installed',
      description: manifest.description || 'Local skill pack installed from this computer.',
      skills,
      designSystems: manifest.designSystems || [],
      requires: manifest.requires || [],
      permissions: allSkillPackPermissions(),
      safety: manifest.safety || 'review included skills before use'
    }
  };
}

async function detectSkillFolders(parentFolder) {
  const entries = await fsp.readdir(parentFolder, { withFileTypes: true });
  const skillNames = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    const skillFile = path.join(parentFolder, entry.name, 'SKILL.md');
    if (await exists(skillFile)) {
      skillNames.push(await readSkillName(skillFile, entry.name));
    }
  }
  return Array.from(new Set(skillNames)).sort((a, b) => a.localeCompare(b));
}

async function readSkillName(skillFile, fallback) {
  const contents = await fsp.readFile(skillFile, 'utf8');
  const match = contents.match(/^name:\s*['\"]?([^'\"\n]+)['\"]?/m);
  return assertSkillName(match?.[1]?.trim() || fallback);
}

async function backupExistingTarget(target) {
  try {
    await fsp.lstat(target);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  await fsp.rename(target, target + '.backup-' + timestamp());
}

async function findSkillSource(packFolder, skillName) {
  const candidates = [
    packFolder,
    path.join(packFolder, 'skills', skillName),
    path.join(packFolder, skillName)
  ];
  for (const candidate of candidates) {
    if (await exists(path.join(candidate, 'SKILL.md'))) return candidate;
  }

  for (const parent of [packFolder, path.join(packFolder, 'skills')]) {
    if (!(await exists(parent))) continue;
    const entries = await fsp.readdir(parent, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const child = path.join(parent, entry.name);
      const childSkillFile = path.join(child, 'SKILL.md');
      if ((await exists(childSkillFile)) && (await readSkillName(childSkillFile, entry.name)) === skillName) {
        return child;
      }
    }
  }

  return undefined;
}

async function showSkillPackDetails(payload) {
  if (!payload?.pack) {
    notify('No skill pack details are available for this item.');
    return;
  }

  const pack = payload.pack;
  const title = payload.type === 'item'
    ? String(payload.value)
    : payload.type === 'section'
      ? payload.sectionName + ' in ' + (pack.displayName || pack.name)
      : (pack.displayName || pack.name);
  const detail = buildSkillPackDetail(payload);
  notify(title + ': ' + (String(detail || '').split('\n').find(Boolean) || 'No details available.'), 8000);
}


function buildSkillPackDetail(payload) {
  const pack = payload.pack;
  if (payload.type === 'item') {
    return [
      'Pack: ' + (pack.displayName || pack.name),
      'Section: ' + payload.sectionName,
      'Value: ' + payload.value
    ].join('\n');
  }

  if (payload.type === 'section') {
    return valuesForDetail(pack, payload.sectionName).join('\n') || 'No ' + payload.sectionName.toLowerCase() + ' declared.';
  }

  return [
    pack.description || 'No description provided.',
    '',
    'Version: ' + (pack.version || 'unknown'),
    'Owner: ' + (pack.owner || 'unknown'),
    'Status: ' + (pack.status || 'built-in'),
    'Skills: ' + ((pack.skills || []).join(', ') || 'none declared'),
    'Design Systems: ' + ((pack.designSystems || []).join(', ') || 'none declared'),
    'Connectors: ' + ((pack.requires || []).join(', ') || 'none declared'),
    'Safety: ' + (pack.safety || 'not declared')
  ].join('\n');
}

function valuesForDetail(pack, sectionName) {
  switch (sectionName) {
    case 'Skills': return pack.skills || [];
    case 'Design Systems': return pack.designSystems || [];
    case 'Connectors': return pack.requires || [];
    case 'Safety': return pack.safety ? [pack.safety] : [];
    default: return [];
  }
}

function allSkillPackPermissions() {
  return ['read-figma', 'read-knowledge', 'write-local-artifacts', 'optional-write-figma'];
}
async function openGuide(context) {
  const guideUri = vscode.Uri.file(path.join(context.extensionPath, 'GETTING-STARTED.md'));
  await vscode.commands.executeCommand('markdown.showPreview', guideUri);
}

async function startWork(context) {
  const project = await getActiveProject(context) || await chooseProject(context, { title: 'Choose project' });
  if (!project) return;
  const readyProject = await ensureProjectMemory(context, project) || project;
  await openAgentChatWithPrompt(projectChatHandoffPrompt(readyProject));
}
async function openView(viewId, fallbackMessage) {
  try {
    await vscode.commands.executeCommand(`${viewId}.focus`);
  } catch {
    notify(fallbackMessage);
  }
}

async function openAgentChatWithPrompt(prompt) {
  await vscode.env.clipboard.writeText(prompt);

  const focused = await focusagentChatInput();
  if (focused) {
    await delay(200);
    for (const pasteCommand of ['editor.action.clipboardPasteAction', 'paste']) {
      try {
        await vscode.commands.executeCommand(pasteCommand);
        return;
      } catch {
        // Try the next paste command.
      }
    }
  }

  for (const [commandId, argument] of [
    ['workbench.action.chat.open', { query: prompt, isPartialQuery: true }],
    ['workbench.action.chat.openInSidebar', { query: prompt, isPartialQuery: true }],
    ['workbench.action.chat.open', { query: prompt }],
    ['workbench.action.chat.openInSidebar', { query: prompt }],
    ['workbench.action.chat.open', prompt]
  ]) {
    try {
      await vscode.commands.executeCommand(commandId, argument);
      return;
    } catch {
      // Try the next chat command shape.
    }
  }

  await openAgentChat();
  notify('Copied ' + prompt + ' to clipboard. Paste it into agent chat if it was not inserted.', 8000);
}

async function focusagentChatInput() {
  for (const commandId of [
    'workbench.action.chat.open',
    'workbench.action.chat.openInSidebar',
    'workbench.action.chat.open'
  ]) {
    try {
      await vscode.commands.executeCommand(commandId);
      return true;
    } catch {
      // Try the next known Chat command.
    }
  }
  return false;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
async function openAgentChat() {
  const commandIds = [
    'workbench.action.chat.open',
    'workbench.action.chat.open',
    'workbench.action.chat.openInSidebar'
  ];

  for (const commandId of commandIds) {
    try {
      await vscode.commands.executeCommand(commandId);
      return;
    } catch {
      // Try the next known Chat command.
    }
  }

  notify('Open agent chat, then choose Design Jarvis (Extension) from the agent picker.', 8000);
}

function getUserPromptsDir(context) {
  return path.resolve(context.globalStorageUri.fsPath, '..', '..', 'prompts');
}

async function ensureAssets(sourceDir) {
  if (!(await exists(sourceDir))) {
    throw new Error(`Design Jarvis assets were not found: ${sourceDir}`);
  }
}

async function copyTree(sourceDir, targetDir, manifest) {
  const summary = { written: 0, unchanged: 0, backedUp: 0 };
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      const nestedSummary = await copyTree(sourcePath, targetPath, manifest);
      summary.written += nestedSummary.written;
      summary.unchanged += nestedSummary.unchanged;
      summary.backedUp += nestedSummary.backedUp;
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const result = await copyFileSafely(sourcePath, targetPath, manifest);
    summary[result] += 1;
  }

  return summary;
}

async function copyFileSafely(sourcePath, targetPath, manifest) {
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });

  const sourceHash = await hashFile(sourcePath);
  if (await exists(targetPath)) {
    const targetHash = await hashFile(targetPath);
    if (sourceHash === targetHash) {
      manifest.files[targetPath] = { hash: sourceHash, updatedAt: new Date().toISOString() };
      return 'unchanged';
    }

    const backupPath = `${targetPath}.backup-${timestamp()}`;
    await fsp.copyFile(targetPath, backupPath);
    await fsp.copyFile(sourcePath, targetPath);
    manifest.files[targetPath] = { hash: sourceHash, updatedAt: new Date().toISOString(), backupPath };
    return 'backedUp';
  }

  await fsp.copyFile(sourcePath, targetPath);
  manifest.files[targetPath] = { hash: sourceHash, updatedAt: new Date().toISOString() };
  return 'written';
}

async function loadManifest(context) {
  await fsp.mkdir(context.globalStorageUri.fsPath, { recursive: true });
  const manifestPath = path.join(context.globalStorageUri.fsPath, MANIFEST_NAME);
  if (!(await exists(manifestPath))) {
    return { files: {} };
  }

  try {
    return JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  } catch {
    return { files: {} };
  }
}

async function saveManifest(context, manifest) {
  await fsp.mkdir(context.globalStorageUri.fsPath, { recursive: true });
  await fsp.writeFile(path.join(context.globalStorageUri.fsPath, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(await fsp.readFile(filePath));
  return hash.digest('hex');
}

async function exists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

module.exports = { activate, deactivate };
