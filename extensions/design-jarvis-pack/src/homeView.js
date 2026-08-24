const crypto = require('crypto');
const vscode = require('vscode');

const COMMANDS = new Map([
  ['installForMe', 'designJarvis.installForMe'],
  ['openGuide', 'designJarvis.openGuide'],
  ['openSkillPacks', 'designJarvis.openSkillPacks'],
  ['setupWorkspace', 'designJarvis.setupWorkspace'],
]);

class DesignJarvisHomeProvider {
  static viewType = 'designJarvis.home';

  constructor(context) {
    this.context = context;
    this.view = undefined;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.onDidReceiveMessage(async (message) => {
      const command = COMMANDS.get(message?.command);
      if (command) await vscode.commands.executeCommand(command);
    });
    await this.refresh();
  }

  async refresh() {
    if (!this.view) return;
    const version = this.context.extension.packageJSON.version || '0.0.0';
    this.view.webview.html = renderHome(version);
  }
}

function renderHome(version) {
  const nonce = crypto.randomBytes(16).toString('hex');
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'nonce-' + nonce + '\';">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Design Jarvis</title>',
    '  <style>',
    '    :root { color-scheme: light dark; }',
    '    body { margin: 0; padding: 16px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); line-height: 1.45; }',
    '    h1 { margin: 0; font-size: 16px; font-weight: 600; }',
    '    h2 { margin: 18px 0 4px; font-size: 13px; font-weight: 600; }',
    '    p { margin: 4px 0 0; }',
    '    .muted { color: var(--vscode-descriptionForeground); }',
    '    .actions { display: grid; gap: 8px; margin-top: 14px; }',
    '    button { width: 100%; min-height: 30px; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); font: inherit; font-weight: 600; cursor: pointer; }',
    '    button:hover { background: var(--vscode-button-hoverBackground); }',
    '    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }',
    '    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }',
    '  </style>',
    '</head>',
    '<body>',
    '  <h1>Design Jarvis</h1>',
    '  <p class="muted">Version ' + escapeHtml(version) + '</p>',
    '  <h2>Open product-design agents</h2>',
    '  <p class="muted">Use the vendor-neutral core with local project artifacts, reusable skills, and optional Figma workflows.</p>',
    '  <div class="actions">',
    '    <button data-command="installForMe">Install or refresh agents</button>',
    '    <button class="secondary" data-command="setupWorkspace">Set up this workspace</button>',
    '    <button class="secondary" data-command="openSkillPacks">Browse skill packs</button>',
    '    <button class="secondary" data-command="openGuide">Getting started</button>',
    '  </div>',
    '  <h2>Updates</h2>',
    '  <p class="muted">Install updates from your editor marketplace or another distribution source you trust. This extension does not request repository credentials or download updates itself.</p>',
    '  <script nonce="' + nonce + '">',
    '    const vscode = acquireVsCodeApi();',
    '    for (const element of document.querySelectorAll("[data-command]")) {',
    '      element.addEventListener("click", () => vscode.postMessage({ command: element.dataset.command }));',
    '    }',
    '  </script>',
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

module.exports = { DesignJarvisHomeProvider, renderHome };
