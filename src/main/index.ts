import { app, BrowserWindow, WebContentsView, ipcMain, shell } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import Store from 'electron-store';
import { CDPManager } from './cdp-manager';
import { setupNetworkInterceptor } from './network-interceptor';
import { IPC } from '../shared/ipc-channels';
import { DEFAULT_PROTECTIONS } from '../shared/constants';
import type { Protections, SiteRule, TabState, FlashEvent } from '../shared/types';

// ── Persistent store ─────────────────────────────────────────────────────────
const store = new Store<{
  settings: Protections;
  siteRules: SiteRule[];
}>({
  defaults: {
    settings: { ...DEFAULT_PROTECTIONS },
    siteRules: [],
  },
});

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

// Map of tabId → { view, url, title }
const tabs = new Map<number, { view: WebContentsView; url: string; title: string }>();
let activeTabId: number | null = null;

// CDP manager — handles flash detection and script injection per tab
let cdpManager: CDPManager;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSettings(): Protections {
  return store.get('settings');
}

function getSiteRules(): SiteRule[] {
  return store.get('siteRules');
}

function isWhitelisted(url: string): boolean {
  const rules = getSiteRules();
  return rules.some((r) => r.mode === 'whitelist' && urlMatchesPattern(url, r.pattern));
}

function urlMatchesPattern(url: string, pattern: string): boolean {
  // Simple glob-style matching: *.example.com or https://example.com/*
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped).test(url);
}

function sendTabState(tabId: number): void {
  if (!mainWindow) return;
  const tab = tabs.get(tabId);
  if (!tab) return;
  const state: TabState = {
    tabId,
    url: tab.url,
    title: tab.title,
    protections: getSettings(),
    lastFlashEvent: null,
    isBlocked: false,
  };
  mainWindow.webContents.send(IPC.TAB_STATE_UPDATE, state);
}

// ── Tab management ────────────────────────────────────────────────────────────
const CHROME_HEIGHT = 76; // px reserved for the browser chrome UI (must match --chrome-h in styles.css)

function createTab(url = 'about:blank'): number {
  if (!mainWindow) throw new Error('No main window');

  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.contentView.addChildView(view);
  resizeActiveView(view);

  const tabId = view.webContents.id;
  tabs.set(tabId, { view, url, title: 'New Tab' });

  // Attach CDP protections
  cdpManager.attach(view.webContents, getSettings());

  // Track navigation
  view.webContents.on('did-navigate', (_e, navUrl) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.url = navUrl;
      sendTabState(tabId);
    }
  });

  view.webContents.on('page-title-updated', (_e, title) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.title = title;
      sendTabState(tabId);
    }
  });

  // Open external links in system browser instead of new Electron windows
  view.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    shell.openExternal(newUrl);
    return { action: 'deny' };
  });

  view.webContents.loadURL(url);
  switchToTab(tabId);

  return tabId;
}

function switchToTab(tabId: number): void {
  if (!mainWindow) return;

  // Hide all views
  for (const [id, { view }] of tabs) {
    view.setVisible(id === tabId);
  }

  activeTabId = tabId;
  sendTabState(tabId);
}

function closeTab(tabId: number): void {
  const tab = tabs.get(tabId);
  if (!tab || !mainWindow) return;

  cdpManager.detach(tabId);
  mainWindow.contentView.removeChildView(tab.view);
  tab.view.webContents.close();
  tabs.delete(tabId);

  // Switch to another tab if available
  if (activeTabId === tabId) {
    const remaining = [...tabs.keys()];
    if (remaining.length > 0) {
      switchToTab(remaining[remaining.length - 1]);
    } else {
      activeTabId = null;
    }
  }
}

function resizeActiveView(view: WebContentsView): void {
  if (!mainWindow) return;
  const bounds = mainWindow.getContentBounds();
  view.setBounds({
    x: 0,
    y: CHROME_HEIGHT,
    width: bounds.width,
    height: bounds.height - CHROME_HEIGHT,
  });
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
function setupIPC(): void {
  ipcMain.handle(IPC.NAVIGATE, (_e, url: string) => {
    if (!activeTabId) return;
    const tab = tabs.get(activeTabId);
    if (!tab) return;
    // Ensure the URL has a protocol
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    tab.view.webContents.loadURL(normalized);
  });

  ipcMain.handle(IPC.TAB_CREATE, () => createTab());
  ipcMain.handle(IPC.TAB_CLOSE, (_e, tabId: number) => closeTab(tabId));
  ipcMain.handle(IPC.TAB_SWITCH, (_e, tabId: number) => switchToTab(tabId));

  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings());
  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Partial<Protections>) => {
    const current = getSettings();
    store.set('settings', { ...current, ...patch });
  });

  ipcMain.handle(IPC.SITE_RULES_GET, () => getSiteRules());
  ipcMain.handle(IPC.SITE_RULES_SET, (_e, rules: SiteRule[]) => store.set('siteRules', rules));

  ipcMain.handle(IPC.RESUME_TAB, (_e, tabId: number) => {
    const tab = tabs.get(tabId);
    if (tab) tab.view.webContents.reload();
  });

  ipcMain.handle(IPC.DISMISS_ALERT, () => {
    // handled renderer-side; nothing to do in main
  });
}

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,         // We draw our own title bar in the chrome UI
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/chrome-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,     // Preload needs Node access for ipcRenderer
    },
  });

  // Resize content views when window is resized
  mainWindow.on('resize', () => {
    if (activeTabId) {
      const tab = tabs.get(activeTabId);
      if (tab) resizeActiveView(tab.view);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the browser chrome UI
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.epilepsybrowser.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Initialize CDP manager with flash detection callback
  cdpManager = new CDPManager((event: FlashEvent) => {
    if (mainWindow) {
      mainWindow.webContents.send(IPC.FLASH_DETECTED, event);
    }
  });

  // Set up network-level GIF blocking (reads settings lazily on every request)
  setupNetworkInterceptor(() => getSettings().gifBlocking, isWhitelisted);

  setupIPC();
  createMainWindow();

  // Open first tab once chrome UI is ready
  mainWindow!.webContents.once('did-finish-load', () => {
    createTab('https://www.google.com');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  cdpManager.destroy();
  if (process.platform !== 'darwin') app.quit();
});
