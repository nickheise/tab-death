import { DefaultCaptureService } from "../app/services/captureService";
import { DefaultMaintenanceService } from "../app/services/maintenanceService";
import { DefaultCapPolicy } from "../app/core/defaultCapPolicy";
import { DefaultDecayEngine } from "../app/core/defaultDecayEngine";
import { TabDeathDB } from "../store/db";
import { DexieItemRepository, DexieOpRepository } from "../store/repositories";
import { DefaultChromePlatformAdapter } from "../platform/chromeAdapter";
import { SystemClock } from "../platform/clock";
import { DefaultDomainPolicy } from "../platform/domainPolicy";
import { DefaultChromeEventIngestor } from "../platform/eventIngestor";
import { RuntimePromptBridge } from "../platform/promptBridge";

const db = new TabDeathDB();
const itemRepo = new DexieItemRepository(db);
const opRepo = new DexieOpRepository(db);

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TABDEATH_GET_REVIEW_BUCKETS") {
    void (async () => {
      const buckets = await maintenance.getReviewBuckets(clock.nowDate());
      sendResponse(buckets);
    })();
    return true;
  }
  return false;
});
