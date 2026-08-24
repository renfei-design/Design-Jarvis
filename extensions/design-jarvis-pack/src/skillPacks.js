const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DEFAULT_HIDDEN_PACKS = new Set(['design-jarvis-core', 'designer-module']);
const HIDDEN_PACKS_KEY = 'designJarvis.hiddenSkillPacks';
const SHOWN_PACKS_KEY = 'designJarvis.shownSkillPacks';
const BUILT_IN_PACK_ORDER = new Map([
  ['product-design', 0],
  ['research-and-operations', 1],
]);

class DesignJarvisSkillPacksProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element) {
    if (!element) {
      const packs = await readVisibleSkillPacks(this.context);
      return packs.map((pack) => packItem(pack));
    }

    if (element.kind === 'pack') {
      return skillItems(this.context, element.pack);
    }

    return [];
  }

  getTreeItem(element) {
    return element;
  }
}

class DesignJarvisConnectorsProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element) {
    if (element) return [];
    const connectors = await connectorItems(this.context);
    return connectors.length > 0 ? connectors : [messageItem('No connectors declared')];
  }

  getTreeItem(element) {
    return element;
  }
}

async function readVisibleSkillPacks(context) {
  const packs = await readSkillPacks(context, { includeHidden: true });
  return packs.filter((pack) => !pack.hidden);
}

async function readHiddenSkillPacks(context) {
  const packs = await readSkillPacks(context, { includeHidden: true });
  return packs.filter((pack) => pack.hidden);
}

async function readSkillPacks(context, options = {}) {
  const builtInPacks = (await readPacksFromDir(path.join(context.extensionPath, 'skill-packs')))
    .map((pack) => ({ ...pack, source: 'built-in' }));
  const installedPacks = (await readPacksFromDir(path.join(context.globalStorageUri.fsPath, 'installed-skill-packs')))
    .map((pack) => ({ ...pack, source: 'installed', status: pack.status || 'installed' }));
  const hiddenPackNames = hiddenSkillPackNames(context);
  const packs = [...builtInPacks, ...installedPacks]
    .map((pack) => ({ ...pack, hidden: hiddenPackNames.has(pack.name) }))
    .sort(compareSkillPacks);
  return options.includeHidden ? packs : packs.filter((pack) => !pack.hidden);
}

function compareSkillPacks(a, b) {
  const orderA = BUILT_IN_PACK_ORDER.get(a.name) ?? Number.MAX_SAFE_INTEGER;
  const orderB = BUILT_IN_PACK_ORDER.get(b.name) ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name));
}

function hiddenSkillPackNames(context) {
  const hidden = new Set(context.globalState.get(HIDDEN_PACKS_KEY, []));
  const shown = new Set(context.globalState.get(SHOWN_PACKS_KEY, []));
  for (const packName of DEFAULT_HIDDEN_PACKS) hidden.add(packName);
  for (const packName of shown) hidden.delete(packName);
  return hidden;
}

async function hideSkillPack(context, payload) {
  const pack = packFromPayload(payload);
  if (!pack?.name) return false;
  const hidden = new Set(context.globalState.get(HIDDEN_PACKS_KEY, []));
  const shown = new Set(context.globalState.get(SHOWN_PACKS_KEY, []));
  hidden.add(pack.name);
  shown.delete(pack.name);
  await context.globalState.update(HIDDEN_PACKS_KEY, [...hidden].sort());
  await context.globalState.update(SHOWN_PACKS_KEY, [...shown].sort());
  vscode.window.setStatusBarMessage('Hidden skill pack: ' + (pack.displayName || pack.name), 4000);
  return true;
}

async function searchSkills(context) {
  const packs = await readVisibleSkillPacks(context);
  const entries = [];
  for (const pack of packs) {
    const skills = Array.isArray(pack.skills) ? pack.skills : [];
    for (const skillName of skills) {
      const description = await readSkillDescription(context, pack, skillName);
      entries.push({
        label: '$(symbol-method) ' + skillName,
        description: pack.displayName || pack.name,
        detail: description,
        pack,
        skillName,
      });
    }
  }

  if (entries.length === 0) {
    vscode.window.showInformationMessage('No skills available to search.');
    return false;
  }

  entries.sort((a, b) => a.skillName.localeCompare(b.skillName));

  const selected = await vscode.window.showQuickPick(entries, {
    title: 'Search Skills',
    placeHolder: 'Search skills by name, pack, or description',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!selected?.skillName) return false;

  await vscode.commands.executeCommand('designJarvis.useSkillInChat', {
    type: 'item',
    pack: selected.pack,
    sectionName: 'Skills',
    value: selected.skillName,
  });
  return true;
}

async function showHiddenSkillPack(context) {
  const hiddenPacks = await readHiddenSkillPacks(context);
  if (hiddenPacks.length === 0) {
    vscode.window.showInformationMessage('No hidden skill packs.');
    return false;
  }
  const selected = await vscode.window.showQuickPick(
    hiddenPacks.map((pack) => ({
      label: pack.displayName || pack.name,
      description: pack.status || pack.source || 'built-in',
      detail: pack.description,
      pack,
    })),
    { title: 'Show Hidden Skill Pack', placeHolder: 'Choose a skill pack to show in the Skill Packs section' }
  );
  if (!selected?.pack?.name) return false;
  const hidden = new Set(context.globalState.get(HIDDEN_PACKS_KEY, []));
  const shown = new Set(context.globalState.get(SHOWN_PACKS_KEY, []));
  hidden.delete(selected.pack.name);
  shown.add(selected.pack.name);
  await context.globalState.update(HIDDEN_PACKS_KEY, [...hidden].sort());
  await context.globalState.update(SHOWN_PACKS_KEY, [...shown].sort());
  vscode.window.setStatusBarMessage('Showing skill pack: ' + (selected.pack.displayName || selected.pack.name), 4000);
  return true;
}

function packFromPayload(payload) {
  if (!payload) return undefined;
  if (payload.pack) return payload.pack;
  if (payload.name) return payload;
  return undefined;
}

async function readPacksFromDir(packsDir) {
  if (!(await exists(packsDir))) {
    return [];
  }

  const entries = await fsp.readdir(packsDir, { withFileTypes: true });
  const packs = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    try {
      const contents = await fsp.readFile(path.join(packsDir, entry.name), 'utf8');
      packs.push(JSON.parse(contents));
    } catch {
      // Ignore malformed packs in the product UI.
    }
  }

  return packs;
}

function packItem(pack) {
  const item = new vscode.TreeItem(pack.displayName || pack.name, vscode.TreeItemCollapsibleState.Collapsed);
  item.kind = 'pack';
  item.pack = pack;
  item.description = `${pack.version || '0.0.0'} · ${pack.status || 'built-in'}`;
  item.tooltip = [pack.displayName || pack.name, pack.description].filter(Boolean).join('\n\n');
  item.contextValue = pack.status === 'installed' ? 'installedSkillPack' : 'builtInSkillPack';
  item.iconPath = new vscode.ThemeIcon('package');
  item.command = detailsCommand({ type: 'pack', pack });
  return item;
}

async function skillItems(context, pack) {
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  if (skills.length === 0) return [messageItem('No skills declared')];
  return Promise.all(skills.map(async (value) => {
    const item = new vscode.TreeItem(value, vscode.TreeItemCollapsibleState.None);
    const description = await readSkillDescription(context, pack, value);
    item.tooltip = [value, description].filter(Boolean).join('\n\n');
    item.skillName = value;
    item.pack = pack;
    item.value = value;
    item.contextValue = 'skillPackSkill';
    item.iconPath = new vscode.ThemeIcon('symbol-method');
    item.command = { command: 'designJarvis.useSkillInChat', title: 'Use Skill with Working Project', arguments: [{ type: 'item', pack, sectionName: 'Skills', value }] };
    return item;
  }));
}

async function readSkillDescription(context, pack, skillName) {
  for (const candidate of skillFileCandidates(context, pack, skillName)) {
    try {
      const contents = await fsp.readFile(candidate, 'utf8');
      const description = parseFrontmatterDescription(contents);
      if (description) return description;
    } catch {
      // Try the next candidate path.
    }
  }
  return undefined;
}

function skillFileCandidates(context, pack, skillName) {
  const candidates = [];
  if (pack.status === 'installed') {
    if (pack.installLocation) candidates.push(path.join(pack.installLocation, skillName, 'SKILL.md'));
    if (pack.sourceFolder) {
      candidates.push(path.join(pack.sourceFolder, 'skills', skillName, 'SKILL.md'));
      candidates.push(path.join(pack.sourceFolder, skillName, 'SKILL.md'));
      candidates.push(path.join(pack.sourceFolder, 'SKILL.md'));
    }
  }
  candidates.push(path.join(context.extensionPath, 'skills', skillName, 'SKILL.md'));
  return candidates;
}

function parseFrontmatterDescription(contents) {
  const match = contents.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return undefined;
  const lines = match[1].split(/\r?\n/);
  const descriptionLines = [];
  let collecting = false;
  for (const line of lines) {
    if (!collecting) {
      const inline = line.match(/^description:\s*['"]?(.+?)['"]?\s*$/);
      if (inline && inline[1] !== '>' && inline[1] !== '|') return inline[1].trim();
      if (/^description:\s*[>|]?\s*$/.test(line)) collecting = true;
      continue;
    }

    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    descriptionLines.push(line.trim());
  }
  return descriptionLines.join(' ').replace(/\s+/g, ' ').trim() || undefined;
}

async function connectorItems(context) {
  const packs = await readSkillPacks(context, { includeHidden: true });
  const byConnector = new Map();
  for (const pack of packs) {
    for (const connectorName of Array.isArray(pack.requires) ? pack.requires : []) {
      if (!byConnector.has(connectorName)) {
        byConnector.set(connectorName, { name: connectorName, packs: [] });
      }
      byConnector.get(connectorName).packs.push(pack.displayName || pack.name);
    }
  }
  return [...byConnector.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((connector) => {
      const item = new vscode.TreeItem(connector.name, vscode.TreeItemCollapsibleState.None);
      item.kind = 'connector';
      item.connector = connector;
      item.description = connector.packs.join(', ');
      item.tooltip = ['Connector: ' + connector.name, 'Used by: ' + connector.packs.join(', ')].join('\n');
      item.contextValue = 'designJarvisConnector';
      item.iconPath = new vscode.ThemeIcon('plug');
      return item;
    });
}

function detailsCommand(payload) {
  return {
    command: 'designJarvis.showSkillPackDetails',
    title: 'Show Details',
    arguments: [payload]
  };
}

function messageItem(label) {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  item.iconPath = new vscode.ThemeIcon('info');
  return item;
}

async function exists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

module.exports = { DesignJarvisConnectorsProvider, DesignJarvisSkillPacksProvider, hideSkillPack, searchSkills, showHiddenSkillPack };
