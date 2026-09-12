const WEBNEWS_API_URL = "https://happycherrychan-webnews.phantomsouly.workers.dev/api/news";

const webNewsState = {
  status: "loading",
  items: []
};

const originalRenderNews = renderNews;

(function installWebNewsStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .news-empty.news-live-state{
      flex:1 0 100%;
      min-height:220px;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:28px;
      text-align:center;
      border:0;
      background:transparent;
      box-shadow:none;
      color:color-mix(in srgb,var(--muted) 62%,transparent);
    }
    .news-empty.news-live-state span{
      font-size:clamp(15px,2vw,20px);
      font-weight:600;
      letter-spacing:.02em;
      opacity:.72;
    }
  `;
  document.head.appendChild(style);
})();

function formatWebNewsDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function normalizeWebNewsItem(item) {
  return {
    id: item?.id || "",
    title: item?.title || "Cherry hír",
    description: item?.description || "",
    image: item?.image || "",
    date: formatWebNewsDate(item?.publishedAt),
    publishedAt: item?.publishedAt || "",
    editedAt: item?.editedAt || "",
    optionalText: item?.extraText || "",
    optionalUrl: item?.extraLink || ""
  };
}

function renderWebNewsState() {
  const strip = document.querySelector("#newsStrip");
  if (!strip) return;

  if (webNewsState.status === "loading") {
    strip.innerHTML = `<div class="news-empty news-live-state"><span>Hírek betöltése...</span></div>`;
    return;
  }

  if (webNewsState.status === "error") {
    strip.innerHTML = `<div class="news-empty news-live-state"><span>A hírek most nem tölthetők be.</span></div>`;
    return;
  }

  if (!webNewsState.items.length) {
    window.__visibleNews = [];
    if (hubData) hubData.news = [];
    strip.innerHTML = `<div class="news-empty news-live-state"><span>Még nincsenek hírek.</span></div>`;
    return;
  }

  if (hubData) hubData.news = webNewsState.items;
  originalRenderNews();
}

renderNews = function () {
  renderWebNewsState();
};

async function loadWebNews() {
  webNewsState.status = "loading";
  renderWebNewsState();

  try {
    const response = await fetch(WEBNEWS_API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`WebNews API: ${response.status}`);

    const data = await response.json();
    if (!data?.ok || !Array.isArray(data.news)) {
      throw new Error("Érvénytelen WebNews válasz");
    }

    webNewsState.items = data.news.map(normalizeWebNewsItem);
    webNewsState.status = "ready";
  } catch (error) {
    console.error("A WebNews hírek nem tölthetők be:", error);
    webNewsState.items = [];
    webNewsState.status = "error";
  }

  renderWebNewsState();
}

loadWebNews();
