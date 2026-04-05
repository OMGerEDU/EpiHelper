import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { Protections, SiteRule, FlashEvent, TabState } from '../shared/types';

// Expose a safe, typed API to the browser chrome renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation
  navigate: (url: string) => ipcRenderer.invoke(IPC.NAVIGATE, url),

  // Tab management
  createTab: () => ipcRenderer.invoke(IPC.TAB_CREATE),
  closeTab: (tabId: number) => ipcRenderer.invoke(IPC.TAB_CLOSE, tabId),
  switchTab: (tabId: number) => ipcRenderer.invoke(IPC.TAB_SWITCH, tabId),

  // Settings
  getSettings: (): Promise<Protections> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings: Partial<Protections>) => ipcRenderer.invoke(IPC.SETTINGS_SET, settings),

  // Site rules
  getSiteRules: (): Promise<SiteRule[]> => ipcRenderer.invoke(IPC.SITE_RULES_GET),
  setSiteRules: (rules: SiteRule[]) => ipcRenderer.invoke(IPC.SITE_RULES_SET, rules),

  // Protection actions
  resumeTab: (tabId: number) => ipcRenderer.invoke(IPC.RESUME_TAB, tabId),
  dismissAlert: (tabId: number) => ipcRenderer.invoke(IPC.DISMISS_ALERT, tabId),

  // Event listeners (main → renderer)
  onFlashDetected: (cb: (event: FlashEvent) => void) => {
    ipcRenderer.on(IPC.FLASH_DETECTED, (_e, event) => cb(event));
    return () => ipcRenderer.removeAllListeners(IPC.FLASH_DETECTED);
  },
  onTabStateUpdate: (cb: (state: TabState) => void) => {
    ipcRenderer.on(IPC.TAB_STATE_UPDATE, (_e, state) => cb(state));
    return () => ipcRenderer.removeAllListeners(IPC.TAB_STATE_UPDATE);
  },
});
