import { ChromeTabSnapshot } from "./chromeAdapter";

export interface PromptBridge {
  requestWhy(tab: ChromeTabSnapshot): Promise<string | null>;
}

export class RuntimePromptBridge implements PromptBridge {
  private pending = new Map<string, (value: string | null) => void>();

  constructor() {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "TABDEATH_PROMPT_RESULT" && typeof msg.requestId === "string") {
        const resolve = this.pending.get(msg.requestId);
        if (resolve) {
          this.pending.delete(msg.requestId);
          resolve(typeof msg.why === "string" ? msg.why : null);
        }
      }
      sendResponse?.(undefined);
      return false;
    });
  }

  async requestWhy(tab: ChromeTabSnapshot): Promise<string | null> {
    const requestId = crypto.randomUUID();

    await chrome.storage.session.set({ [`prompt:${requestId}`]: tab });
    const windowInfo = await chrome.windows.create({
      url: chrome.runtime.getURL(`prompt.html#${encodeURIComponent(requestId)}`),
      type: "popup",
      width: 420,
      height: 180,
      focused: true,
    chrome.runtime.sendMessage({
      type: "TABDEATH_PROMPT_WHAT",
      requestId,
      tab,
    });

    return new Promise<string | null>((resolve) => {
      this.pending.set(requestId, resolve);
      setTimeout(async () => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          if (windowInfo?.id) {
            try {
              await chrome.windows.remove(windowInfo.id);
            } catch {
              // ignore
            }
          }
          await chrome.storage.session.remove(`prompt:${requestId}`);
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          resolve(null);
        }
      }, 5000);
    });
  }
}
