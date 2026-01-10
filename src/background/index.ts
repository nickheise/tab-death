import { DefaultCaptureService } from "../app/services/captureService";
import { DefaultMaintenanceService } from "../app/services/maintenanceService";
import { DefaultCapPolicy } from "../app/core/defaultCapPolicy";
import { DefaultDecayEngine } from "../app/core/defaultDecayEngine";
import { TabDeathDB } from "../store/db";
import { DexieItemRepository, DexieOpRepository } from "../store/repositories";
import { ExportService } from "../store/exportService";
import { DefaultChromePlatformAdapter } from "../platform/chromeAdapter";
import { SystemClock } from "../platform/clock";
import { DefaultDomainPolicy } from "../platform/domainPolicy";
import { DefaultChromeEventIngestor } from "../platform/eventIngestor";
import { RuntimePromptBridge } from "../platform/promptBridge";

const db = new TabDeathDB();
const itemRepo = new DexieItemRepository(db);
const opRepo = new DexieOpRepository(db);

const capture = new DefaultCaptureService(db, itemRepo, opRepo, 5);
const capture = new DefaultCaptureService(db, itemRepo, opRepo);

const decay = new DefaultDecayEngine();
const cap = new DefaultCapPolicy();

const maintenance = new DefaultMaintenanceService(
  itemRepo,
  opRepo,
  decay,
  {
    freshDays: 7,
    fadingDays: 21,
    criticalDays: 30,
    archiveDays: 90,
    starsPauseDecay: true,
  },
  cap,
  { maxItems: 1000 },
  { keepLastN: 10000 }
);

const platform = new DefaultChromePlatformAdapter();
const prompt = new RuntimePromptBridge();
const domainPolicy = new DefaultDomainPolicy();
const clock = new SystemClock();

const ingestor = new DefaultChromeEventIngestor({
  platform,
  capture,
  maintenance,
  clock,
  domainPolicy,
  prompt,
  cfg: {
    ignoreUrlPrefixes: ["chrome://", "chrome-extension://", "about:"],
    ignorePinned: true,
    ignoreIncognito: true,
  },
});

ingestor.init();

const exportService = new ExportService(db);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TABDEATH_GET_REVIEW_BUCKETS") {
    void (async () => {
      const buckets = await maintenance.getReviewBuckets(clock.nowDate());
      sendResponse(buckets);
    })();
    return true;
  }
  if (message?.type === "TABDEATH_SET_WHY") {
    void (async () => {
      if (typeof message.id !== "string") {
        sendResponse({ ok: false });
        return;
      }
      await capture.annotateWhy(message.id, message.why ?? null);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "TABDEATH_REOPEN_ITEM") {
    void (async () => {
      if (typeof message.id !== "string" || typeof message.url !== "string") {
        sendResponse({ ok: false });
        return;
      }
      await platform.openUrl(message.url, { active: true });
      await capture.touch(message.id);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "TABDEATH_STAR_ITEM") {
    void (async () => {
      if (typeof message.id !== "string") {
        sendResponse({ ok: false });
        return;
      }
      await capture.star(message.id);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "TABDEATH_UNSTAR_ITEM") {
    void (async () => {
      if (typeof message.id !== "string") {
        sendResponse({ ok: false });
        return;
      }
      await capture.unstar(message.id);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "TABDEATH_MARK_LAST_CHANCE") {
    void (async () => {
      if (!Array.isArray(message.ids)) {
        sendResponse({ ok: false });
        return;
      }
      const ids = message.ids.filter((id: unknown) => typeof id === "string");
      await capture.markLastChanceShown(ids);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "TABDEATH_EXPORT") {
    void (async () => {
      const format = message.format;
      const artifact = await exportService.export(format);
      const blob = new Blob([artifact.bytes], { type: artifact.mimeType });
      const url = URL.createObjectURL(blob);
      await chrome.downloads.download({ url, filename: artifact.filename, saveAs: true });
      URL.revokeObjectURL(url);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message?.type === "TABDEATH_SEARCH_ARCHIVED") {
    void (async () => {
      if (typeof message.query !== "string") {
        sendResponse([]);
        return;
      }
      const results = await itemRepo.searchArchived({ q: message.query, limit: 25 });
      sendResponse(results);
    })();
    return true;
  }
  return false;
});
