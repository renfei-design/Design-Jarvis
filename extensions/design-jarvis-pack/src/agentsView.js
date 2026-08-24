const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const AGENTS = [
  {
    id: 'design-lead',
    name: 'Design Lead',
    description: 'Direction, critique, and quality review',
    bestFor: 'Framing design strategy, reviewing artifacts, and making trade-off calls.',
    icon: 'eye'
  },
  {
    id: 'designer',
    name: 'Designer',
    description: 'Flows, wireframes, hi-fi, and design system work',
    bestFor: 'Information architecture, workflows, screen design, Figma artifacts, and Code Connect mapping.',
    icon: 'symbol-color'
  },
  {
    id: 'ux-researcher',
    name: 'UX Researcher',
    description: 'Competitive research and insight synthesis',
    bestFor: 'Competitor analysis, market patterns, evidence gathering, and research reports.',
    icon: 'search'
  },
  {
    id: 'front-end-engineer',
    name: 'Front-End Engineer',
    description: 'Accessible, production-transferable prototypes',
    bestFor: 'Interactive prototypes in the project stack, implementation-quality UI code, and runtime verification.',
    icon: 'code'
  },
  {
    id: 'design-ops',
    name: 'Design Ops',
    description: 'Memory, decisions, and project tracking',
    bestFor: 'Project memory, decision logs, session summaries, and artifact organization.',
    icon: 'database'
  }
];

class DesignJarvisAgentsProvider {
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

    return Promise.all(AGENTS.map((agent) => agentItem(this.context, agent)));
  }

  getTreeItem(element) {
    return element;
  }
}

async function agentItem(context, agent) {
  const installedPath = path.join(getUserPromptsDir(context), agent.id + '.agent.md');
  const packagedPath = path.join(context.extensionPath, 'assets', 'user-prompts', agent.id + '.agent.md');
  const installed = await exists(installedPath);
  const item = new vscode.TreeItem(agent.name, vscode.TreeItemCollapsibleState.None);
  item.description = installed ? 'Installed' : 'Needs install';
  item.tooltip = [agent.name, agent.description, 'Best for: ' + agent.bestFor, installed ? 'Installed for this user' : 'Run Install for Me to add this agent'].join('\n');
  item.contextValue = 'designJarvisAgent';
  item.iconPath = new vscode.ThemeIcon(agent.icon);
  item.agent = { ...agent, installed, filePath: installed ? installedPath : packagedPath };
  item.command = {
    command: 'designJarvis.useAgentInChat',
    title: 'Ask About Working Project',
    arguments: [item.agent]
  };
  return item;
}

function getAgents() {
  return AGENTS.map((agent) => ({ ...agent }));
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

module.exports = { DesignJarvisAgentsProvider, getAgents };
