import { DefaultCaptureService } from "../app/services/captureService";
import { DefaultMaintenanceService } from "../app/services/maintenanceService";
import { DefaultCapPolicy } from "../app/core/defaultCapPolicy";
import { DefaultDecayEngine } from "../app/core/defaultDecayEngine";
import { TabDeathDB } from "../store/db";
import { DexieItemRepository, DexieOpRepository } from "../store/repositories";
import { ExportService } from "../store/exportService";
import { loadSettings } from "../store/settings";
import { DefaultChromePlatformAdapter } from "../platform/chromeAdapter";
import { SystemClock } from "../platform/clock";
import { DefaultDomainPolicy } from "../platform/domainPolicy";
import { DefaultChromeEventIngestor } from "../platform/eventIngestor";
import { RuntimePromptBridge } from "../platform/promptBridge";

const initBackground = async () => {
  try {
    console.log('[Tab Death] Starting initialization...');

    const db = new TabDeathDB();

    // Explicitly open database and wait for it to be ready
    await db.open();
    console.log('[Tab Death] Database opened successfully');

    const itemRepo = new DexieItemRepository(db);
    const opRepo = new DexieOpRepository(db);

    const settings = await loadSettings();
    console.log('[Tab Death] Settings loaded:', settings);

    const capture = new DefaultCaptureService(db, itemRepo, opRepo, settings.maxStars);

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

    // Register event listeners AFTER everything is initialized
    ingestor.init();
    console.log('[Tab Death] Event listeners registered');

    void maintenance.runDailyMaintenance(clock.nowDate());

    const exportService = new ExportService(db);

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        if (message?.type === "TABDEATH_GET_REVIEW_BUCKETS") {
          void (async () => {
            try {
              const buckets = await maintenance.getReviewBuckets(clock.nowDate());
              sendResponse(buckets);
            } catch (error) {
              console.error('[Tab Death] Error getting review buckets:', error);
              sendResponse({ unclaimed: [], deathRow: [], starred: [] });
            }
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
      } catch (error) {
        console.error('[Tab Death] Error in message handler:', error);
        return false;
      }
    });

    console.log('[Tab Death] Initialized successfully ✓');
  } catch (error) {
    console.error('[Tab Death] Initialization failed:', error);
    throw error;
  }
};

initBackground().catch((err) => {
  console.error('[Tab Death] Fatal initialization error:', err);
});
