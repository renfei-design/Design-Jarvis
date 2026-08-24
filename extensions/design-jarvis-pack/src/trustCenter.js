const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

class DesignJarvisTrustProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element) {
    if (element) {
      return [];
    }

    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const promptsPath = path.resolve(this.context.globalStorageUri.fsPath, '..', '..', 'prompts', 'design-jarvis.agent.md');
    const hasAgent = await exists(promptsPath);
    const hasWorkspaceSkills = workspacePath ? await exists(path.join(workspacePath, '.github', 'skills')) : false;
    const hasWorkspaceMcp = workspacePath ? await exists(path.join(workspacePath, '.vscode', 'mcp.json')) : false;
    const hasMemory = workspacePath ? await exists(path.join(workspacePath, '.jarvis', 'memory')) || await exists(path.join(workspacePath, 'projects')) : false;
    const hasExtensionMcp = Boolean(vscode.lm?.registerMcpServerDefinitionProvider && vscode.McpHttpServerDefinition);

    return [
      trustItem('Design Jarvis agent', hasAgent ? 'Installed for this user' : 'Needs install', hasAgent),
      trustItem('Optional Figma integration', hasExtensionMcp ? 'Available from the extension' : 'Needs workspace connector setup', hasExtensionMcp || hasWorkspaceMcp),
      trustItem('Design skills', hasWorkspaceSkills ? 'Workspace skills prepared' : 'Built-in packs available; workspace setup optional', true),
      trustItem('Project memory', hasMemory ? 'Project context found' : 'Prepare a project to create shared memory', Boolean(hasMemory)),
      trustItem('Local artifacts', workspacePath ? 'Can create files after confirmation' : 'Open a folder to save artifacts', Boolean(workspacePath)),
      trustItem('Figma writes', 'Read-only by default; write workflows should ask first', true)
    ];
  }

  getTreeItem(element) {
    return element;
  }
}

function trustItem(label, description, isReady) {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  item.description = description;
  item.tooltip = `${label}: ${description}`;
  item.iconPath = new vscode.ThemeIcon(isReady ? 'pass' : 'warning');
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

module.exports = { DesignJarvisTrustProvider };
