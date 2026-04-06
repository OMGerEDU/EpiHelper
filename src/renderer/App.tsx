import React, { useState, useEffect, useRef } from 'react';
import type { TabState, FlashEvent } from '../shared/types';

interface Tab {
  tabId: number;
  url: string;
  title: string;
}

const api = (window as any).electronAPI;

export default function App(): JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [flashAlert, setFlashAlert] = useState<FlashEvent | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);

  // Subscribe to tab state updates from main process
  useEffect(() => {
    const unsub = api.onProtectionStatus((state: TabState) => {
      setTabs((prev) => {
        const exists = prev.find((t) => t.tabId === state.tabId);
        if (exists) {
          return prev.map((t) =>
            t.tabId === state.tabId ? { ...t, url: state.url, title: state.title } : t
          );
        }
        return [...prev, { tabId: state.tabId, url: state.url, title: state.title }];
      });
      setActiveTabId(state.tabId);
      setAddressInput(state.url === 'about:blank' ? '' : state.url);
    });
    return unsub;
  }, []);

  // Subscribe to flash detection alerts
  useEffect(() => {
    const unsub = api.onFlashAlert((event: FlashEvent) => {
      setFlashAlert(event);
    });
    return unsub;
  }, []);

  function handleNavigate(e: React.FormEvent): void {
    e.preventDefault();
    if (addressInput.trim()) {
      api.navigate(addressInput.trim());
    }
  }

  function handleNewTab(): void {
    api.createTab();
  }

  function handleCloseTab(tabId: number, e: React.MouseEvent): void {
    e.stopPropagation();
    api.closeTab(tabId);
    setTabs((prev) => prev.filter((t) => t.tabId !== tabId));
  }

  function handleSwitchTab(tabId: number): void {
    api.switchTab(tabId);
    setActiveTabId(tabId);
    const tab = tabs.find((t) => t.tabId === tabId);
    if (tab) setAddressInput(tab.url === 'about:blank' ? '' : tab.url);
  }

  function handleDismissFlash(): void {
    if (flashAlert) {
      api.dismissAlert(flashAlert.tabId);
      setFlashAlert(null);
    }
  }

  function handleResumeTab(): void {
    if (flashAlert) {
      api.resumeTab(flashAlert.tabId);
      setFlashAlert(null);
    }
  }

  const activeTab = tabs.find((t) => t.tabId === activeTabId);

  return (
    <div className="chrome">
      {/* Flash alert banner — shown above everything */}
      {flashAlert && (
        <div className={`flash-alert ${flashAlert.severity}`} role="alert" aria-live="assertive">
          <span className="flash-icon">⚠</span>
          <span className="flash-message">
            {flashAlert.isRedFlash
              ? 'Red flash hazard detected'
              : `Flash hazard: ${flashAlert.flashCount} flashes/sec`}
            {' — '}content has been paused for your safety.
          </span>
          <button onClick={handleResumeTab} className="flash-btn flash-btn--resume">
            Resume anyway
          </button>
          <button onClick={handleDismissFlash} className="flash-btn flash-btn--dismiss">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="tab-bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.tabId}
            role="tab"
            aria-selected={tab.tabId === activeTabId}
            className={`tab ${tab.tabId === activeTabId ? 'tab--active' : ''}`}
            onClick={() => handleSwitchTab(tab.tabId)}
          >
            <span className="tab-title">{tab.title || 'New Tab'}</span>
            <span
              className="tab-close"
              role="button"
              aria-label={`Close ${tab.title || 'tab'}`}
              onClick={(e) => handleCloseTab(tab.tabId, e)}
            >
              ×
            </span>
          </button>
        ))}
        <button className="tab-new" onClick={handleNewTab} aria-label="New tab" title="New tab">
          +
        </button>
      </div>

      {/* Address bar + controls */}
      <div className="address-bar-row">
        <form className="address-form" onSubmit={handleNavigate}>
          {/* Protection badge */}
          <div
            className="protection-badge"
            title="Epilepsy protection active"
            aria-label="Epilepsy protection active"
            data-testid="protection-badge"
          >
            <span className="shield">🛡</span>
          </div>

          <input
            ref={addressRef}
            className="address-input"
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Search or enter address"
            aria-label="Address bar"
            spellCheck={false}
          />

          <button type="submit" className="address-go" aria-label="Navigate">
            →
          </button>
        </form>

        <button
          className={`settings-btn ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings((s) => !s)}
          aria-label="Protection settings"
          aria-expanded={showSettings}
        >
          ⚙
        </button>
      </div>

      {/* Settings panel (inline, expandable) */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
function SettingsPanel({ onClose }: { onClose: () => void }): JSX.Element {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  function toggle(key: string): void {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    api.setSettings({ [key]: updated[key] });
  }

  if (!settings) return <div className="settings-panel">Loading…</div>;

  return (
    <div className="settings-panel" role="dialog" aria-label="Protection settings">
      <div className="settings-header">
        <h2>Protection Settings</h2>
        <button onClick={onClose} aria-label="Close settings">×</button>
      </div>
      <div className="settings-body">
        <ToggleRow
          label="Flash detection"
          description="Detect and pause flashing content (WCAG 2.3.1)"
          checked={settings.flashDetection}
          onChange={() => toggle('flashDetection')}
        />
        <ToggleRow
          label="Reduce motion"
          description="Enforce prefers-reduced-motion on all pages"
          checked={settings.reducedMotion}
          onChange={() => toggle('reducedMotion')}
        />
        <ToggleRow
          label="Block animated GIFs"
          description="Replace animated GIFs with static first frame"
          checked={settings.gifBlocking}
          onChange={() => toggle('gifBlocking')}
        />
        <ToggleRow
          label="Pause videos"
          description="Prevent autoplay on all videos"
          checked={settings.videoAutopause}
          onChange={() => toggle('videoAutopause')}
        />
        <ToggleRow
          label="Limit animation speed"
          description="Cap requestAnimationFrame to 24 fps"
          checked={settings.rafLimit}
          onChange={() => toggle('rafLimit')}
        />
        <ToggleRow
          label="Limit WebGL"
          description="Throttle WebGL rendering speed"
          checked={settings.webglLimit}
          onChange={() => toggle('webglLimit')}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}): JSX.Element {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <label htmlFor={id} className="toggle-label">{label}</label>
        <p className="toggle-desc">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? 'toggle--on' : 'toggle--off'}`}
        onClick={onChange}
        aria-label={`${label}: ${checked ? 'on' : 'off'}`}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}
