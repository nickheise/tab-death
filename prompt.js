const requestId = decodeURIComponent(location.hash.replace(/^#/, ""));
const input = document.getElementById("why");
const meta = document.getElementById("meta");
const save = document.getElementById("save");
const skip = document.getElementById("skip");

const sessionKey = `prompt:${requestId}`;

const sendResult = async (why) => {
  if (!requestId) return;
  await chrome.runtime.sendMessage({
    type: "TABDEATH_PROMPT_RESULT",
    requestId,
    why,
  });
  await chrome.storage.session.remove(sessionKey);
  window.close();
};

chrome.storage.session.get(sessionKey).then((res) => {
  const tab = res?.[sessionKey];
  if (tab?.title || tab?.url) {
    meta.textContent = tab.title || tab.url;
  } else {
    meta.textContent = "";
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendResult(input.value.trim() || null);
  }
});

save.addEventListener("click", () => sendResult(input.value.trim() || null));
skip.addEventListener("click", () => sendResult(null));

// Auto-close on blur with 1-second delay (prevents accidental loss)
let blurTimer = null;
window.addEventListener("blur", () => {
  blurTimer = setTimeout(() => sendResult(null), 1000);
});
window.addEventListener("focus", () => {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
});

input.focus();
