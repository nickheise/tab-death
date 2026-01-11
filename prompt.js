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
window.addEventListener("blur", () => sendResult(null));

input.focus();
