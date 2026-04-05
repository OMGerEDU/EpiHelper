// All IPC channel names in one place — prevents typos and gives type safety

export const IPC = {
  // Main → Renderer: protection events
  FLASH_DETECTED: 'protection:flash-detected',
  TAB_STATE_UPDATE: 'protection:tab-state-update',

  // Renderer → Main: user actions
  NAVIGATE: 'browser:navigate',
  TAB_CREATE: 'browser:tab-create',
  TAB_CLOSE: 'browser:tab-close',
  TAB_SWITCH: 'browser:tab-switch',

  // Renderer → Main: settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SITE_RULES_GET: 'site-rules:get',
  SITE_RULES_SET: 'site-rules:set',

  // Renderer → Main: user triggered resume after flash block
  RESUME_TAB: 'protection:resume-tab',
  DISMISS_ALERT: 'protection:dismiss-alert',
} as const;
