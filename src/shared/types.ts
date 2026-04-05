export interface Protections {
  flashDetection: boolean;
  reducedMotion: boolean;
  gifBlocking: boolean;
  videoAutopause: boolean;
  webglLimit: boolean;
  rafLimit: boolean;
  highContrast: boolean;
  brightnessOverlay: number; // 0.0 – 1.0
  rafTargetFps: number;
}

export interface SiteRule {
  pattern: string; // e.g. "*.youtube.com" or "https://example.com/*"
  mode: 'whitelist' | 'blacklist' | 'custom';
  protections: Protections;
}

export type FlashSeverity = 'warning' | 'critical';

export interface FlashEvent {
  tabId: number;
  timestamp: number;
  severity: FlashSeverity;
  isRedFlash: boolean;
  flashCount: number; // flashes detected in the last 1000ms
  dangerAreaPixels: number;
}

export interface TabState {
  tabId: number;
  url: string;
  title: string;
  protections: Protections;
  lastFlashEvent: FlashEvent | null;
  isBlocked: boolean; // true if page was paused due to flash
}
