let hubData = null;
const TWITCH_BROADCASTER_ID = "611526048";
const TWITCH_SCHEDULE_ICS_URL = `https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=${TWITCH_BROADCASTER_ID}`;
const TWITCH_UPTIME_URL = "https://decapi.me/twitch/uptime/happycherrychan";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const THEME_KEY = "cherryhub-theme";

function readStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

function writeStoredTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

function getInitialTheme() {
  const saved = readStoredTheme();
  if (saved === "light" || saved === "dark") return saved;
  return root.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme, persist = false) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  root.dataset.theme = safeTheme;
  root.style.colorScheme = safeTheme;

  if (persist) writeStoredTheme(safeTheme);

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", safeTheme === "dark" ? "#140811" : "#fff1f7");

  const button = $("#themeToggle");
  if (button) {
    button.textContent = safeTheme === "light" ? "☀️ Light mode" : "🌙 Dark mode";
    button.setAttribute("aria-pressed", safeTheme === "dark" ? "true" : "false");
    button.setAttribute("aria-label", safeTheme === "light" ? "Dark mód bekapcsolása" : "Light mód bekapcsolása");
  }
}

applyTheme(getInitialTheme());

function activateIntroPolish() {
  requestAnimationFrame(() => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-loaded");
  });
}

async function loadData() {
  try {
    const r = await fetch("data/content.json", { cache: "no-store" });
    if (!r.ok) throw new Error("content.json");
    hubData = await r.json();
    renderAll();
  } catch (e) {
    console.error(e);
    const lead = $("#heroLead");
    if (lead) lead.textContent = "Nem sikerült betölteni a data/content.json fájlt.";
    activateIntroPolish();
  }
}

function renderAll() {
  applyTheme(root.dataset.theme);

  $("#themeToggle")?.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "light" ? "dark" : "light", true);
  });

  renderNav();
  renderHero();
  renderLivePanel();
  renderSocials();
  renderNews();
  renderFeaturedPanels();
  renderCards();
  renderWideSections();
  renderLinks();
  bindModal();
  activateIntroPolish();
}

function renderNav() {
  const nav = $("#mainNav");
  const menu = $(".menu-toggle");
  if (!nav) return;

  nav.innerHTML = (hubData.nav || [])
    .map(i => `<a href="${i.target}" ${i.open ? `data-nav-open="${i.open}"` : ""}>${i.label}</a>`)
    .join("");

  const closeNav = () => {
    nav.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
  };

  menu?.addEventListener("click", e => {
    e.stopPropagation();
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", open ? "true" : "false");
  });

  nav.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (!link) return;
    closeNav();
    if (link.dataset.navOpen) {
      e.preventDefault();
      goToAndOpen(link.dataset.navOpen);
    }
  });

  document.addEventListener("click", e => {
    if (!nav.classList.contains("open")) return;
    if (e.target.closest("#mainNav") || e.target.closest(".menu-toggle")) return;
    closeNav();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) closeNav();
  });
}

function renderHero() {
  const lead = $("#heroLead");
  const actions = $("#heroActions");
  if (!lead || !actions) return;

  lead.textContent = hubData.hero.lead;
  actions.innerHTML = (hubData.hero.actions || []).map(a => {
    const target = a.url.startsWith("http") ? "_blank" : "_self";
    const open = a.open ? ` data-hero-open="${a.open}" data-hero-tab="${a.tab || ""}"` : "";
    return `<a class="${a.style}" href="${a.url}" target="${target}" rel="noreferrer"${open}>${a.label}</a>`;
  }).join("");

  actions.addEventListener("click", e => {
    const link = e.target.closest("[data-hero-open]");
    if (!link) return;
    e.preventDefault();
    goToAndOpen(link.dataset.heroOpen, link.dataset.heroTab || null);
  });
}

function renderLivePanel() {
  loadLiveStatus();
  loadHomeSchedulePreview();
}

async function loadLiveStatus() {
  const card = $("#homeLiveCard");
  const dot = $("#liveStatusDot");
  const text = $("#liveStatusText");
  const badge = $("#liveBadge");
  if (!dot || !text) return;

  try {
    const res = await fetch(TWITCH_UPTIME_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("uptime");

    const uptime = (await res.text()).trim();
    const offline = /offline|not live|not currently live/i.test(uptime);
    dot.classList.toggle("online", !offline);
    dot.classList.toggle("offline", offline);
    card?.classList.toggle("is-live", !offline);
    text.textContent = offline ? "Cherry most offline" : "Cherry most élőben van!";

    if (badge) {
      badge.textContent = offline ? "OFFLINE" : "LIVE";
      badge.classList.toggle("offline", offline);
    }
  } catch (e) {
    console.warn("Live státusz nem tölthető be", e);
    dot.classList.remove("online");
    dot.classList.add("offline");
    card?.classList.remove("is-live");
    text.textContent = "Live státusz nem ellenőrizhető";
    if (badge) {
      badge.textContent = "STATUS";
      badge.classList.add("offline");
    }
  }
}

async function loadHomeSchedulePreview() {
  const sub = $("#liveSubText");
  const list = $("#homeScheduleList");
  if (!sub || !list) return;

  try {
    const res = await fetch(TWITCH_SCHEDULE_ICS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("schedule");

    const events = parseTwitchIcs(await res.text())
      .filter(ev => ev.start && ev.start >= new Date())
      .sort((a, b) => a.start - b.start)
      .slice(0, 3);

    if (!events.length) {
      sub.textContent = "Nincs kiírt közelgő stream a Twitch menetrendben.";
      list.innerHTML = `<div class="home-schedule-empty">Hamarosan érkezik az új menetrend ♡</div>`;
      return;
    }

    const next = events[0];
    const day = next.start.toLocaleDateString("hu-HU", { weekday: "long", month: "short", day: "numeric" });
    const time = next.start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    sub.textContent = `Következő stream: ${day}, ${time} — ${next.title || "Cherry stream"}`;
    list.innerHTML = events.map(renderHomeScheduleItem).join("");
  } catch (e) {
    console.warn("Főoldali Twitch menetrend nem tölthető be", e);
    sub.textContent = "A Twitch menetrend most nem tölthető be.";
    list.innerHTML = `<div class="home-schedule-empty">A menetrend átmenetileg nem elérhető.</div>`;
  }
}

function renderHomeScheduleItem(event) {
  const date = event.start.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
  const time = event.start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  return `<div class="home-schedule-item"><span>${date}</span><b>${event.title || "Cherry stream"}</b><time>${time}</time></div>`;
}

function renderSocials() {
  const strip = $("#socialStrip");
  if (!strip) return;
  strip.innerHTML = (hubData.socials || []).map(s =>
    `<a class="social-link" href="${s.url}" target="_blank" rel="noreferrer"><img src="${s.icon}" alt="" loading="lazy"><span><b>${s.name}</b><span>${s.handle}</span></span></a>`
  ).join("");
}

function renderFeaturedPanels() {
  const wrap = $("#featuredPanels");
  if (!wrap) return;
  const g = hubData.gacherryPanel;
  const music = hubData.musicTracks || [];
  const gHtml = g ? `<article class="gacherry-panel"><div class="gacherry-copy"><span class="panel-kicker">✦ Kiemelt projekt</span><h2>${g.title}</h2><p>${g.text}</p><div class="badge-row">${(g.badges || []).map(b => `<span>${b}</span>`).join("")}</div><a class="panel-button" href="${g.url}" target="_blank" rel="noreferrer">${g.button} →</a></div><a class="gacherry-image-frame" href="${g.url}" target="_blank" rel="noreferrer"><img src="${g.image}" alt="GaCherry banner" loading="lazy"></a></article>` : "";
  const mHtml = `<article class="music-panel"><div class="music-head"><span>♪</span><div><span class="panel-kicker">Cherry Music</span><h2>Cherry Zenéi</h2><p>Saját Cherry dalok és YouTube zenék egy helyen.</p></div></div><div class="music-list">${music.slice(0, 4).map(t => `<a class="music-track" href="${t.url}" target="_blank" rel="noreferrer"><b>${t.title}</b><span>${t.type || "YouTube"} →</span></a>`).join("")}</div><div class="music-actions"><a class="panel-button" href="https://www.youtube.com/@happycherrychan" target="_blank" rel="noreferrer">YouTube csatorna →</a><button class="panel-button panel-button-ghost" type="button" data-open-music-list>Lista megnyitása →</button></div></article>`;
  wrap.innerHTML = gHtml + mHtml;
  wrap.querySelector("[data-open-music-list]")?.addEventListener("click", openMusicListModal);
}

function openMusicListModal() {
  const tracks = hubData.musicTracks || [];
  $("#modalKicker").textContent = "♪ Cherry Music";
  $("#modalTitle").textContent = "Cherry Zenéi – Lista";
  $("#modalText").textContent = "Itt találod Cherry zenéit. A linkek YouTube-on nyílnak meg.";
  $("#modalContent").innerHTML = `<div class="music-modal-list">${tracks.map(t => `<article class="music-modal-track"><div><b>${t.title}</b><span>${t.type || "YouTube"}</span></div><a href="${t.url}" target="_blank" rel="noreferrer">Lejátszás YouTube-on →</a></article>`).join("")}</div>`;
  $("#modalActions").innerHTML = `<a href="https://www.youtube.com/@happycherrychan" target="_blank" rel="noreferrer">YouTube csatorna →</a>`;
  showModal();
}

function goToAndOpen(id, tab = null) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => openModal(id, tab), 360);
}

function renderNews() {
  const strip = $("#newsStrip");
  if (!strip) return;
  strip.innerHTML = (hubData.news || []).map(i => `<article><b>${i.title}</b><span>${i.text}</span></article>`).join("");
}

function renderCards() {
  const grid = $("#cardsGrid");
  if (!grid) return;
  grid.innerHTML = (hubData.cards || []).map(c => `<article id="${c.id}" class="section-card"><div class="big-icon">${c.icon}</div><h2>${c.title}</h2><p>${c.short}</p><button class="open-modal" type="button" data-open-modal="${c.id}">Több infó</button></article>`).join("");
}

function renderWideSections() {
  const wrap = $("#wideSections");
  if (!wrap) return;
  wrap.innerHTML = (hubData.wideSections || []).map(s => `<article id="${s.id}" class="wide-card"><div class="wide-head"><span>${s.icon}</span><h2>${s.title}</h2></div><p>${s.text}</p>${(s.items || []).map(i => `<div class="wide-item"><b>${i.title}</b><p>${i.text}</p><a class="wide-link" href="${i.url}" target="${i.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${i.button} →</a></div>`).join("")}${s.note ? `<div class="wide-note">${s.note}</div>` : ""}</article>`).join("");
}

function renderLinks() {
  const links = $("#links");
  if (!links) return;
  links.innerHTML = `<h2>Közösségi linkek</h2><div class="links-row">${(hubData.socials || []).map(s => `<a href="${s.url}" target="_blank" rel="noreferrer"><img src="${s.icon}" alt="" loading="lazy">${s.name}</a>`).join("")}</div>`;
}

function bindModal() {
  document.addEventListener("click", e => {
    const open = e.target.closest("[data-open-modal]");
    if (open) openModal(open.dataset.openModal);
    if (e.target.closest("[data-close-modal]")) closeModal();
    const tab = e.target.closest("[data-tab]");
    if (tab) switchTab(tab.dataset.tab);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      $("#mainNav")?.classList.remove("open");
      $(".menu-toggle")?.setAttribute("aria-expanded", "false");
    }
  });
}

function showModal() {
  const m = $("#infoModal");
  if (!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function openModal(id, forceTab = null) {
  const d = hubData?.cards?.find(c => c.id === id);
  if (!d) return;
  $("#modalKicker").textContent = `✿ ${d.title}`;
  $("#modalTitle").textContent = d.title;
  $("#modalText").textContent = d.details?.text || d.short;
  renderModalContent(d, forceTab);
  showModal();
}

function renderDetailItem(i) {
  if (i && typeof i === "object") {
    const title = i.title || i.label || "Elem";
    if (i.url) return `<li class="object-item"><span>${title}</span><a href="${i.url}" target="_blank" rel="noreferrer">🎧 Meghallgatom</a></li>`;
    return `<li>${title}</li>`;
  }
  return `<li>${i}</li>`;
}

function renderModalContent(d, forceTab = null) {
  const details = d.details || {};
  if (details.tabs?.length) {
    const defaultTab = forceTab || details.defaultTab || details.tabs[0].id;
    $("#modalContent").innerHTML = `<div class="tab-row">${details.tabs.map(t => `<button class="tab-btn ${t.id === defaultTab ? "active" : ""}" type="button" data-tab="${t.id}">${t.label}</button>`).join("")}</div><div class="tab-content" id="tabContent"></div>`;
    window.__currentTabs = details.tabs;
    switchTab(defaultTab);
    $("#modalActions").innerHTML = (details.buttons || []).map(b => `<a href="${b.url}" target="${b.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${b.label}</a>`).join("");
    return;
  }
  $("#modalContent").innerHTML = (details.blocks || []).map(b => `<section class="detail-block"><h3>${b.heading}</h3><ul>${(b.items || []).map(renderDetailItem).join("")}</ul></section>`).join("");
  $("#modalActions").innerHTML = (details.buttons || []).map(b => `<a href="${b.url}" target="${b.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${b.label}</a>`).join("");
}

function switchTab(id) {
  const tabs = window.__currentTabs || [];
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  let html = `<p>${tab.text || ""}</p>`;
  if (tab.id === "schedule") html += renderScheduleShell(tab);
  else if (tab.schedule) html += renderManualSchedule(tab);
  if (tab.blocks) html += tab.blocks.map(b => `<section class="detail-block"><h3>${b.heading}</h3><ul>${(b.items || []).map(renderDetailItem).join("")}</ul></section>`).join("");
  $("#tabContent").innerHTML = html;
  if (tab.id === "schedule") loadTwitchSchedule();
}

function renderScheduleShell(tab) {
  return `<section class="detail-block"><h3>Automatikus Twitch menetrend</h3><p class="schedule-status" id="twitchScheduleStatus">Menetrend betöltése Twitchről...</p><div class="schedule-list" id="twitchScheduleList"></div></section><section class="detail-block"><h3>Kézi menetrend / tartalék</h3>${renderManualSchedule(tab)}</section>`;
}

function renderManualSchedule(tab) {
  let html = "";
  if (tab.schedule) html += `<div class="schedule-list">${tab.schedule.map(s => `<div class="schedule-item"><div class="schedule-day">${s.day}</div><div class="schedule-time">${s.time}</div><div class="schedule-title">${s.title}</div></div>`).join("")}</div>`;
  if (tab.note) html += `<div class="schedule-note">${tab.note}</div>`;
  return html;
}

async function loadTwitchSchedule() {
  const status = $("#twitchScheduleStatus");
  const list = $("#twitchScheduleList");
  if (!status || !list) return;
  try {
    const res = await fetch(TWITCH_SCHEDULE_ICS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const events = parseTwitchIcs(await res.text()).filter(ev => ev.start && ev.start >= new Date()).slice(0, 6);
    if (!events.length) {
      status.textContent = "Nincs heti stream kiírva. Hamarosan lesz...";
      return;
    }
    status.textContent = `A héten ${events.length} kiírt stream látható.`;
    list.innerHTML = events.map(renderTwitchScheduleItem).join("");
  } catch (e) {
    console.warn(e);
    status.textContent = "Az automatikus Twitch menetrend nem töltődött be. A kézi tartalék menetrend látható lentebb.";
  }
}

function parseTwitchIcs(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.map(block => {
    const event = {};
    block.split(/\r?\n/).forEach(line => {
      const sep = line.indexOf(":");
      if (sep === -1) return;
      const key = line.slice(0, sep).split(";")[0];
      const value = decodeIcsText(line.slice(sep + 1));
      if (key === "SUMMARY") event.title = value;
      if (key === "DESCRIPTION") event.description = value;
      if (key === "DTSTART") event.start = parseIcsDate(value);
      if (key === "DTEND") event.end = parseIcsDate(value);
    });
    return event;
  }).filter(event => event.title || event.start);
}

function parseIcsDate(value) {
  if (!value) return null;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00", z] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : ""}`);
}

function decodeIcsText(value) {
  return value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function renderTwitchScheduleItem(event) {
  const day = event.start.toLocaleDateString("hu-HU", { weekday: "long", month: "short", day: "numeric" });
  const time = event.start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  const title = event.title || "Cherry stream";
  const duration = event.end ? ` • kb. ${formatDuration(event.start, event.end)}` : "";
  return `<div class="schedule-item"><div class="schedule-day">${day}</div><div class="schedule-time">${time}</div><div class="schedule-title">${title}${duration}</div></div>`;
}

function formatDuration(start, end) {
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} óra ${m} perc`;
  if (h) return `${h} óra`;
  return `${m} perc`;
}

function closeModal() {
  const m = $("#infoModal");
  if (!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

loadData();
