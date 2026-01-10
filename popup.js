const renderList = (rootId, items, emptyLabel, renderItem) => {
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
    const wrap = renderItem(item);
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

const send = (payload) =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => resolve(response));
  });

const renderUnclaimed = (item) => {
  const wrap = document.createElement("div");
  wrap.className = "item";

  const title = document.createElement("div");
  title.className = "why";
  title.textContent = item.title || item.url;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${item.domain} · ${ageInDays(item.createdAt)} days`;

  const row = document.createElement("div");
  row.className = "row";

  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.maxLength = 140;
  input.placeholder = "Why did this matter?";

  const save = document.createElement("button");
  save.className = "btn primary";
  save.textContent = "Save";
  save.addEventListener("click", async () => {
    const why = input.value.trim();
    await send({ type: "TABDEATH_SET_WHY", id: item.id, why: why || null });
    await loadBuckets();
  });

  row.appendChild(input);
  row.appendChild(save);

  wrap.appendChild(title);
  wrap.appendChild(meta);
  wrap.appendChild(row);

  return wrap;
};

const renderReviewable = (item) => {
  const wrap = document.createElement("div");
  wrap.className = "item";

  const why = document.createElement("div");
  why.className = "why";
  why.textContent = item.why || item.title || "(no note)";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${item.domain} · ${ageInDays(item.createdAt)} days`;

  const row = document.createElement("div");
  row.className = "row";

  const star = document.createElement("button");
  star.className = "btn";
  star.textContent = item.isStarred ? "Unstar" : "Star";
  star.addEventListener("click", async () => {
    await send({ type: item.isStarred ? "TABDEATH_UNSTAR_ITEM" : "TABDEATH_STAR_ITEM", id: item.id });
    await loadBuckets();
  });

  const reopen = document.createElement("button");
  reopen.className = "btn";
  reopen.textContent = "Reopen";
  reopen.addEventListener("click", async () => {
    await send({ type: "TABDEATH_REOPEN_ITEM", id: item.id, url: item.url });
    await loadBuckets();
  });

  row.appendChild(star);
  row.appendChild(reopen);

  wrap.appendChild(why);
  wrap.appendChild(meta);
  wrap.appendChild(row);

  return wrap;
};

const loadBuckets = async () => {
  const response = await send({ type: "TABDEATH_GET_REVIEW_BUCKETS" });
  if (!response) return;
  renderList("unclaimed", response.unclaimed || [], "Nothing waiting.", renderUnclaimed);
  renderList("deathRow", response.deathRow || [], "No items in Last Chance.", renderReviewable);
  renderList("starred", response.starred || [], "No starred items.", renderReviewable);
  const deathRowIds = (response.deathRow || []).map((item) => item.id);
  if (deathRowIds.length) {
    await send({ type: "TABDEATH_MARK_LAST_CHANCE", ids: deathRowIds });
  }
};

void loadBuckets();

document.getElementById("exportJson").addEventListener("click", async () => {
  await send({ type: "TABDEATH_EXPORT", format: "json_items" });
});

document.getElementById("exportCsv").addEventListener("click", async () => {
  await send({ type: "TABDEATH_EXPORT", format: "csv_items" });
};

void loadBuckets();
chrome.runtime.sendMessage({ type: "TABDEATH_GET_REVIEW_BUCKETS" }, (response) => {
  if (!response) return;
  renderList("unclaimed", response.unclaimed || [], "Nothing waiting.");
  renderList("deathRow", response.deathRow || [], "No items in Last Chance.");
  renderList("starred", response.starred || [], "No starred items.");
});
