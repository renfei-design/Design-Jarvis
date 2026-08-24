const vscode = require('vscode');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { discoverProjects } = require('./projects');

class DesignJarvisProjectsProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() { this._onDidChangeTreeData.fire(); }

  async getChildren(element) {
    if (!getWorkspaceRoot()) return [messageItem('Open a folder to see Design Jarvis projects')];
    if (!element) {
      const projects = await discoverProjects(this.context);
      if (projects.length === 0) return [messageItem('No Design Jarvis projects found')];
      return projects.map((project) => projectItem(project));
    }
    if (element.kind === 'project') return artifactGroups(element.project);
    if (element.kind === 'group') return artifactFiles(element.resourcePath, element.groupName, element.project);
    return [];
  }

  getTreeItem(element) { return element; }
}

function getWorkspaceRoot() { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }

function projectItem(project) {
  const item = new vscode.TreeItem(project.name, vscode.TreeItemCollapsibleState.Expanded);
  item.kind = 'project';
  item.project = project;
  item.slug = project.slug;
  item.resourcePath = project.projectPath;
  item.description = project.active ? 'Working project' : project.status || 'project';
  item.tooltip = [project.name, project.goal, project.projectPath].filter(Boolean).join('\n');
  item.contextValue = project.active ? 'designJarvisProjectActive' : 'designJarvisProject';
  item.iconPath = new vscode.ThemeIcon(project.active ? 'star-full' : 'folder');
  return item;
}

function artifactGroups(project) {
  const groups = [
    ['Prototypes', path.join(project.projectPath, 'prototypes'), 'preview'],
    ['Slides', path.join(project.projectPath, 'slides'), 'symbol-method'],
    ['Specs', path.join(project.projectPath, 'specs'), 'book'],
    ['Memory', project.memoryPath, 'history']
  ];
  return groups.map(([label, folderPath, icon]) => {
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
    item.kind = 'group';
    item.groupName = label;
    item.resourcePath = folderPath;
    item.project = project;
    item.contextValue = contextValueForGroup(label);
    item.iconPath = new vscode.ThemeIcon(icon);
    return item;
  });
}

async function artifactFiles(folderPath, groupName, project) {
  if (!(await exists(folderPath))) return [messageItem('No ' + groupName.toLowerCase() + ' yet')];
  const files = await collectFiles(folderPath, 2);
  if (files.length === 0) return [messageItem('No ' + groupName.toLowerCase() + ' yet')];
  return files.map((filePath) => {
    const label = path.basename(filePath);
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.kind = 'file';
    item.resourcePath = filePath;
    item.filePath = filePath;
    item.project = project;
    item.groupName = groupName;
    item.groupRoot = folderPath;
    item.description = path.relative(folderPath, path.dirname(filePath));
    item.tooltip = filePath;
    item.resourceUri = vscode.Uri.file(filePath);
    item.contextValue = contextValueForFile(groupName, filePath);
    item.command = { command: 'vscode.open', title: 'Open', arguments: [vscode.Uri.file(filePath)] };
    return item;
  });
}

async function collectFiles(root, depth) {
  const results = [];
  const entries = await fsp.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.jarvis') continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory() && depth > 0) {
      results.push(...await collectFiles(entryPath, depth - 1));
      continue;
    }
    if (entry.isFile()) results.push(entryPath);
  }
  return results.sort((a, b) => a.localeCompare(b)).slice(0, 80);
}

function contextValueForGroup(label) {
  if (label === 'Prototypes') return 'designJarvisPrototypeGroup';
  if (label === 'Slides') return 'designJarvisSlidesGroup';
  if (label === 'Specs') return 'designJarvisSpecsGroup';
  return 'designJarvisProjectGroup';
}

function contextValueForFile(groupName, filePath) {
  if (groupName === 'Prototypes' && /\.html?$/i.test(filePath)) return 'designJarvisPrototypeFile';
  return 'designJarvisProjectFile';
}

function messageItem(label) {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
  item.contextValue = 'message';
  item.iconPath = new vscode.ThemeIcon('info');
  return item;
}

async function exists(filePath) {
  try { await fsp.access(filePath, fs.constants.F_OK); return true; } catch { return false; }
}

module.exports = { DesignJarvisProjectsProvider };
