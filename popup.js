const renderList = (rootId, items, emptyLabel) => {
  const root = document.getElementById(rootId);
  root.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = emptyLabel;
    root.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const wrap = document.createElement("div");
    wrap.className = "item";

    const why = document.createElement("div");
    why.className = "why";
    why.textContent = item.why || item.title || "(no note)";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${item.domain} · ${ageInDays(item.createdAt)} days`;

    wrap.appendChild(why);
    wrap.appendChild(meta);
    root.appendChild(wrap);
  });
};

const ageInDays = (createdAt) => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
};

chrome.runtime.sendMessage({ type: "TABDEATH_GET_REVIEW_BUCKETS" }, (response) => {
  if (!response) return;
  renderList("unclaimed", response.unclaimed || [], "Nothing waiting.");
  renderList("deathRow", response.deathRow || [], "No items in Last Chance.");
  renderList("starred", response.starred || [], "No starred items.");
});
