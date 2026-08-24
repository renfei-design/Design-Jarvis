const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const PROMPT_FILE_SUFFIX = '.prompt.md';

class DesignJarvisPromptLibraryProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren() {
    const prompts = await readPromptLibrary(this.context);
    if (prompts.length === 0) {
      return [emptyPromptItem()];
    }
    return prompts.map((prompt) => promptItem(prompt));
  }

  getTreeItem(element) {
    return element;
  }
}

async function readPromptLibrary(context) {
  const promptsDir = getUserPromptsDir(context);
  if (!(await exists(promptsDir))) {
    return [];
  }

  const entries = await fsp.readdir(promptsDir, { withFileTypes: true });
  const prompts = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(PROMPT_FILE_SUFFIX)) {
      continue;
    }

    const filePath = path.join(promptsDir, entry.name);
    try {
      const contents = await fsp.readFile(filePath, 'utf8');
      prompts.push(parsePromptFile(filePath, entry.name, contents));
    } catch {
      // Ignore unreadable prompt files in the product UI.
    }
  }

  return prompts.sort((a, b) => a.commandName.localeCompare(b.commandName));
}

function promptItem(prompt) {
  const item = new vscode.TreeItem('/' + prompt.commandName, vscode.TreeItemCollapsibleState.None);
  item.description = prompt.description || path.basename(prompt.filePath);
  item.tooltip = [
    '/' + prompt.commandName,
    prompt.description,
    prompt.argumentHint ? 'Argument hint: ' + prompt.argumentHint : undefined,
    prompt.filePath
  ].filter(Boolean).join('\n');
  item.contextValue = 'promptLibraryPrompt';
  item.iconPath = new vscode.ThemeIcon('comment-discussion');
  item.commandName = prompt.commandName;
  item.promptName = prompt.commandName;
  item.filePath = prompt.filePath;
  item.prompt = prompt;
  item.command = {
    command: 'designJarvis.usePromptInChat',
    title: 'Use Prompt with Working Project',
    arguments: [prompt]
  };
  return item;
}

function emptyPromptItem() {
  const item = new vscode.TreeItem('No prompts yet', vscode.TreeItemCollapsibleState.None);
  item.description = 'Create one from the + button';
  item.iconPath = new vscode.ThemeIcon('info');
  item.command = { command: 'designJarvis.newPrompt', title: 'New Prompt' };
  return item;
}

function parsePromptFile(filePath, fileName, contents) {
  const metadata = parseFrontmatter(contents);
  const fallbackName = fileName.slice(0, -PROMPT_FILE_SUFFIX.length);
  const commandName = safePromptCommandName(metadata.name || fallbackName);
  return {
    commandName,
    description: metadata.description || '',
    argumentHint: metadata['argument-hint'] || '',
    filePath
  };
}

function parseFrontmatter(contents) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) {
      continue;
    }
    metadata[field[1]] = stripYamlQuotes(field[2].trim());
  }
  return metadata;
}

function stripYamlQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function safePromptCommandName(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-prompt';
}

function getUserPromptsDir(context) {
  return path.resolve(context.globalStorageUri.fsPath, '..', '..', 'prompts');
}

async function exists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

module.exports = { DesignJarvisPromptLibraryProvider, readPromptLibrary, safePromptCommandName };
