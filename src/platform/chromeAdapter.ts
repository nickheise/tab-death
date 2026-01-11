export type ChromeTabId = number;

export interface ChromeTabSnapshot {
  tabId: ChromeTabId;
  url: string;
  title: string;
  pinned: boolean;
  incognito: boolean;
  windowId: number;
}

export interface ChromePlatformAdapter {
  tryGetTab(tabId: ChromeTabId): Promise<ChromeTabSnapshot | null>;
  closeTab(tabId: ChromeTabId): Promise<void>;
  openUrl(url: string, opts?: { active?: boolean }): Promise<void>;

  onCommand(handler: (command: string) => void): void;
  onTabRemoved(handler: (tabId: ChromeTabId, removeInfo: { windowId: number; isWindowClosing: boolean }) => void): void;
  onTabUpdated(handler: (tabId: ChromeTabId, tab: ChromeTabSnapshot) => void): void;
  onContextMenu(handler: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void): void;

  onAlarm(handler: (name: string) => void): void;
  createDailyAlarm(name: string): Promise<void>;
}

export class DefaultChromePlatformAdapter implements ChromePlatformAdapter {
  async tryGetTab(tabId: ChromeTabId): Promise<ChromeTabSnapshot | null> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url) return null;
      return {
        tabId: tab.id!,
        url: tab.url,
        title: tab.title ?? tab.url,
        pinned: !!tab.pinned,
        incognito: !!tab.incognito,
        windowId: tab.windowId,
      };
    } catch {
      return null;
    }
  }

  async closeTab(tabId: ChromeTabId): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      return;
    }
  }

  async openUrl(url: string, opts?: { active?: boolean }): Promise<void> {
    await chrome.tabs.create({ url, active: opts?.active ?? true });
  }

  onCommand(handler: (command: string) => void): void {
    chrome.commands.onCommand.addListener(handler);
  }

  onTabRemoved(handler: (tabId: ChromeTabId, removeInfo: { windowId: number; isWindowClosing: boolean }) => void): void {
    chrome.tabs.onRemoved.addListener(handler);
  }

  onTabUpdated(handler: (tabId: ChromeTabId, tab: ChromeTabSnapshot) => void): void {
    chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
      if (!tab.url) return;
      handler(tabId, {
        tabId,
        url: tab.url,
        title: tab.title ?? tab.url,
        pinned: !!tab.pinned,
        incognito: !!tab.incognito,
        windowId: tab.windowId,
      });
    });
  }

  onContextMenu(handler: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void): void {
    chrome.contextMenus.onClicked.addListener(handler);
  }

  onAlarm(handler: (name: string) => void): void {
    chrome.alarms.onAlarm.addListener((alarm) => handler(alarm.name));
  }

  async createDailyAlarm(name: string): Promise<void> {
    chrome.alarms.create(name, { periodInMinutes: 60 * 24 });
  }
}
