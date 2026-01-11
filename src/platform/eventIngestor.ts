import { ChromePlatformAdapter, ChromeTabSnapshot } from "./chromeAdapter";
import { PromptBridge } from "./promptBridge";
import { MicroBatchQueue } from "../store/writeQueue";

export interface IngestorConfig {
  ignoreUrlPrefixes: string[];
  ignorePinned: boolean;
  ignoreIncognito: boolean;
}

export interface DomainPolicy {
  domainFromUrl(url: string): string;
}

export interface CaptureService {
  captureClosedTab(snapshot: { url: string; title: string; domain: string; at: string; why: string | null }): Promise<string>;
  annotateWhy(id: string, why: string | null): Promise<void>;
  touch(id: string): Promise<void>;
}

export interface MaintenanceService {
  runDailyMaintenance(now: Date): Promise<void>;
}

export interface Clock {
  nowIso(): string;
  nowDate(): Date;
}

export interface ChromeEventIngestorDeps {
  platform: ChromePlatformAdapter;
  capture: CaptureService;
  maintenance: MaintenanceService;
  clock: Clock;
  domainPolicy: DomainPolicy;
  prompt: PromptBridge;
  cfg: IngestorConfig;
}

export class DefaultChromeEventIngestor {
  private disposed = false;
  private readonly tabCache = new Map<number, ChromeTabSnapshot>();
  private passiveQueue: MicroBatchQueue<{ tabId: number; removedAtIso: string }>;

  constructor(private readonly deps: ChromeEventIngestorDeps) {
    this.passiveQueue = new MicroBatchQueue(async (batch) => {
      await this.flushPassiveBatch(batch);
    }, 200);
  }

  init(): void {
    const { platform } = this.deps;

    void this.seedTabCache();

    platform.onTabUpdated((tabId, tab) => {
      if (this.disposed) return;
      this.tabCache.set(tabId, tab);
    });

    platform.onTabRemoved((tabId) => {
      if (this.disposed) return;
      this.passiveQueue.push({ tabId, removedAtIso: this.deps.clock.nowIso() });
      this.tabCache.delete(tabId);
    });

    platform.onCommand((command) => {
      if (this.disposed) return;
      if (command === "tabdeath-close") void this.handleActiveCloseFromFocusedTab();
    });

    platform.onContextMenu((info, tab) => {
      if (this.disposed) return;
      if (info.menuItemId === "tabdeath.closeWithWhy" && tab?.id != null) {
        void this.handleActiveClose(tab.id);
      }
    });

    platform.onAlarm((name) => {
      if (this.disposed) return;
      if (name === "tabdeath.daily") void this.deps.maintenance.runDailyMaintenance(this.deps.clock.nowDate());
    });

    void platform.createDailyAlarm("tabdeath.daily");

    void this.ensureContextMenu();
  }

  dispose(): void {
    this.disposed = true;
  }

  private shouldIgnore(url: string, tab: ChromeTabSnapshot): boolean {
    const { cfg } = this.deps;
    if (cfg.ignorePinned && tab.pinned) return true;
    if (cfg.ignoreIncognito && tab.incognito) return true;
    return cfg.ignoreUrlPrefixes.some((prefix) => url.startsWith(prefix));
  }

  private async flushPassiveBatch(batch: Array<{ tabId: number; removedAtIso: string }>): Promise<void> {
    for (const evt of batch) {
      const tab = this.tabCache.get(evt.tabId) ?? (await this.deps.platform.tryGetTab(evt.tabId));
      if (!tab) continue;
      if (this.shouldIgnore(tab.url, tab)) continue;

      await this.deps.capture.captureClosedTab({
        url: tab.url,
        title: tab.title,
        domain: this.deps.domainPolicy.domainFromUrl(tab.url),
        at: evt.removedAtIso,
        why: null,
      });
    }
  }

  private async ensureContextMenu(): Promise<void> {
    try {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: "tabdeath.closeWithWhy",
          title: "Close with Tab Death…",
          contexts: ["page"],
        });
      });
    } catch {
      // ignore
    }
  }

  private async seedTabCache(): Promise<void> {
    try {
      const tabs = await this.deps.platform.listTabs();
      for (const tab of tabs) {
        this.tabCache.set(tab.tabId, tab);
      }
    } catch {
      // ignore
    }
  }

  private async handleActiveCloseFromFocusedTab(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab?.id || !tab.url) return;
    await this.handleActiveClose(tab.id);
  }

  private async handleActiveClose(tabId: number): Promise<void> {
    const tab = await this.deps.platform.tryGetTab(tabId);
    if (!tab) return;
    if (this.shouldIgnore(tab.url, tab)) {
      await this.deps.platform.closeTab(tabId);
      return;
    }

    const why = await this.deps.prompt.requestWhy(tab);
    await this.deps.capture.captureClosedTab({
      url: tab.url,
      title: tab.title,
      domain: this.deps.domainPolicy.domainFromUrl(tab.url),
      at: this.deps.clock.nowIso(),
      why,
    });

    await this.deps.platform.closeTab(tabId);
  }
}
