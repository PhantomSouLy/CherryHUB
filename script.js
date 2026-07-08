let hubData = null;
const TWITCH_BROADCASTER_ID = "611526048";
const TWITCH_SCHEDULE_ICS_URL = `https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=${TWITCH_BROADCASTER_ID}`;
// Token nélküli, egyszerű live státusz próbálkozás.
// Ha később saját proxy lesz, ezt az URL-t érdemes arra cserélni.
const TWITCH_UPTIME_URL = "https://decapi.me/twitch/uptime/happycherrychan";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const savedTheme = localStorage.getItem("cherryhub-theme");

if (savedTheme) root.dataset.theme = savedTheme;

function setThemeButton() {
  const btn = $("#themeToggle");
  if (!btn) return;
  btn.textContent = root.dataset.theme === "light" ? "Light mód" : "Dark mód";
  btn.setAttribute("aria-label", root.dataset.theme === "light" ? "Light mód aktív, váltás dark módra" : "Dark mód aktív, váltás light módra");
}

async function loadData() {
  try {
    const res = await fetch("data/content.json", { cache: "no-store" });
    if (!res.ok) throw new Error("content.json nem tölthető be");
    hubData = await res.json();
    renderAll();
  } catch (err) {
    console.error(err);
    $("#heroLead").textContent = "Nem sikerült betölteni a data/content.json fájlt.";
  }
}

function renderAll() {
  setThemeButton();
  $("#themeToggle").addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("cherryhub-theme", root.dataset.theme);
    setThemeButton();
  });

  renderNav();
  renderHero();
  renderLivePanel();
  renderSocials();
  renderFlower();
  renderNews();
  renderCards();
  renderWideSections();
  renderLinks();
  bindModal();

  const first = hubData.cards.find(c => c.id === hubData.petals[0]) || hubData.cards[0];
  if (first) renderFloatingCard(first.id);
}

function renderNav() {
  const nav = $("#mainNav");
  nav.innerHTML = hubData.nav.map(i => `<a href="${i.target}" ${i.open ? `data-nav-open="${i.open}"` : ""}>${i.label}</a>`).join("");
  $(".menu-toggle").addEventListener("click", () => nav.classList.toggle("open"));
  nav.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (!link) return;
    nav.classList.remove("open");
    const openId = link.dataset.navOpen;
    if (openId) {
      e.preventDefault();
      goToAndOpen(openId);
    }
  });
}

function renderHero() {
  $("#heroLead").textContent = hubData.hero.lead;
  $("#heroActions").innerHTML = hubData.hero.actions.map(a => `<a class="${a.style}" href="${a.url}" target="${a.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${a.label}</a>`).join("");
}


function renderLivePanel() {
  loadLiveStatus();
  loadHomeSchedulePreview();
}

async function loadLiveStatus() {
  const dot = $("#liveStatusDot");
  const text = $("#liveStatusText");
  const sub = $("#liveSubText");
  if (!dot || !text || !sub) return;

  try {
    const res = await fetch(TWITCH_UPTIME_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Live státusz nem elérhető.");

    const uptime = (await res.text()).trim();
    const isOffline = /offline|not live|not currently live/i.test(uptime);

    dot.classList.toggle("online", !isOffline);
    dot.classList.toggle("offline", isOffline);

    if (isOffline) {
      text.textContent = "Cherry most offline";
      // A subtextet a menetrend preview külön frissíti.
    } else {
      text.textContent = "Cherry most élőben van!";
      sub.textContent = `Stream fut: ${uptime}`;
    }
  } catch (err) {
    console.warn(err);
    dot.classList.remove("online");
    dot.classList.add("offline");
    text.textContent = "Live státusz nem ellenőrizhető";
    // A subtextet a menetrend preview ettől még frissítheti.
  }
}

async function loadHomeSchedulePreview() {
  const sub = $("#liveSubText");
  if (!sub) return;

  try {
    const res = await fetch(TWITCH_SCHEDULE_ICS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Twitch menetrend nem elérhető.");

    const ics = await res.text();
    const next = parseTwitchIcs(ics)
      .filter(event => event.start && event.start >= new Date())
      .sort((a, b) => a.start - b.start)[0];

    if (!next) {
      if (!sub.textContent || sub.textContent.includes("keresése")) {
        sub.textContent = "Nincs kiírt közelgő stream a Twitch menetrendben.";
      }
      return;
    }

    const day = next.start.toLocaleDateString("hu-HU", { weekday: "long", month: "short", day: "numeric" });
    const time = next.start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    sub.textContent = `Következő stream: ${day}, ${time} — ${next.title || "Cherry stream"}`;
  } catch (err) {
    console.warn(err);
    if (!sub.textContent || sub.textContent.includes("keresése")) {
      sub.textContent = "A Twitch menetrend most nem tölthető be.";
    }
  }
}


function renderSocials() {
  $("#socialStrip").innerHTML = hubData.socials.map(s => `<a class="social-link" href="${s.url}" target="_blank" rel="noreferrer"><img src="${s.icon}" alt="" loading="lazy"><span><b>${s.name}</b><span>${s.handle}</span></span></a>`).join("");
}

function renderFlower() {
  const flower = $("#flowerMenu");
  const petals = hubData.petals.map((id, i) => {
    const c = hubData.cards.find(x => x.id === id);
    return c ? `<button class="petal p${i + 1} ${i === 0 ? "active" : ""}" data-card="${c.id}" aria-label="${c.title}"><span class="icon">${c.icon}</span><strong>${c.title}</strong><small>${c.short}</small></button>` : "";
  }).join("");

  flower.innerHTML = petals + `<div class="core"><span>Cherry</span><strong>HUB</strong></div>`;

  $$(".petal", flower).forEach(p => {
    const id = p.dataset.card;
    p.addEventListener("mouseenter", () => renderFloatingCard(id));
    p.addEventListener("focus", () => renderFloatingCard(id));
    p.addEventListener("click", () => {
      $$(".petal", flower).forEach(x => x.classList.remove("active"));
      p.classList.add("active");
      renderFloatingCard(id);
    });
  });

  $(".close-card").addEventListener("click", () => {
    const c = $("#floatingCard");
    c.style.opacity = c.style.opacity === "0" ? "1" : "0";
    c.style.pointerEvents = c.style.opacity === "0" ? "none" : "auto";
  });

  $(".card-link").addEventListener("click", e => {
    const active = $(".petal.active");
    if (active) {
      e.preventDefault();
      openModal(active.dataset.card);
    }
  });
}

function goToAndOpen(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => openModal(id), 360);
}

function renderFloatingCard(id) {
  const d = hubData.cards.find(c => c.id === id);
  if (!d) return;
  const c = $("#floatingCard");
  $(".card-kicker", c).textContent = `✿ ${d.title}`;
  $("h2", c).textContent = d.floatingTitle || d.title;
  $("p", c).textContent = d.floatingText || d.short;
  $("ul", c).innerHTML = (d.floatingItems || []).map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join("");
  $(".card-link", c).href = `#${d.id}`;
  c.style.opacity = "1";
  c.style.pointerEvents = "auto";
}

function renderNews() {
  $("#newsStrip").innerHTML = hubData.news.map(i => `<article><b>${i.title}</b><span>${i.text}</span></article>`).join("");
}

function renderCards() {
  $("#cardsGrid").innerHTML = hubData.cards.map(c => `<article id="${c.id}" class="section-card"><div class="big-icon">${c.icon}</div><h2>${c.title}</h2><p>${c.short}</p><button class="open-modal" type="button" data-open-modal="${c.id}">Több infó</button></article>`).join("");
}

function renderWideSections() {
  $("#wideSections").innerHTML = hubData.wideSections.map(s => `<article id="${s.id}" class="wide-card"><div class="wide-head"><span>${s.icon}</span><h2>${s.title}</h2></div><p>${s.text}</p>${(s.items || []).map(i => `<div class="wide-item"><b>${i.title}</b><p>${i.text}</p><a class="wide-link" href="${i.url}" target="${i.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${i.button} →</a></div>`).join("")}${s.note ? `<div class="wide-note">${s.note}</div>` : ""}</article>`).join("");
}

function renderLinks() {
  $("#links").innerHTML = `<h2>Közösségi linkek</h2><div class="links-row">${hubData.socials.map(s => `<a href="${s.url}" target="_blank" rel="noreferrer"><img src="${s.icon}" alt="" loading="lazy">${s.name}</a>`).join("")}</div>`;
}

function bindModal() {
  document.addEventListener("click", e => {
    const o = e.target.closest("[data-open-modal]");
    if (o) openModal(o.dataset.openModal);
    if (e.target.closest("[data-close-modal]")) closeModal();
    const tab = e.target.closest("[data-tab]");
    if (tab) switchTab(tab.dataset.tab);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
}

function openModal(id) {
  const d = hubData.cards.find(c => c.id === id);
  if (!d) return;
  $("#modalKicker").textContent = `✿ ${d.title}`;
  $("#modalTitle").textContent = d.title;
  $("#modalText").textContent = d.details?.text || d.short;
  renderModalContent(d);
  const m = $("#infoModal");
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function renderModalContent(d) {
  const details = d.details || {};
  if (details.tabs?.length) {
    const defaultTab = details.defaultTab || details.tabs[0].id;
    $("#modalContent").innerHTML = `<div class="tab-row">${details.tabs.map(t => `<button class="tab-btn ${t.id === defaultTab ? "active" : ""}" type="button" data-tab="${t.id}">${t.label}</button>`).join("")}</div><div class="tab-content" id="tabContent"></div>`;
    window.__currentTabs = details.tabs;
    switchTab(defaultTab);
    $("#modalActions").innerHTML = (details.buttons || []).map(b => `<a href="${b.url}" target="${b.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${b.label}</a>`).join("");
    return;
  }

  $("#modalContent").innerHTML = (details.blocks || []).map(b => `<section class="detail-block"><h3>${b.heading}</h3><ul>${(b.items || []).map(i => `<li>${i}</li>`).join("")}</ul></section>`).join("");
  $("#modalActions").innerHTML = (details.buttons || []).map(b => `<a href="${b.url}" target="${b.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${b.label}</a>`).join("");
}

function switchTab(id) {
  const tabs = window.__currentTabs || [];
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === id));

  let html = `<p>${tab.text || ""}</p>`;
  if (tab.id === "schedule") {
    html += renderScheduleShell(tab);
  } else if (tab.schedule) {
    html += renderManualSchedule(tab);
  }

  if (tab.blocks) {
    html += tab.blocks.map(b => `<section class="detail-block"><h3>${b.heading}</h3><ul>${(b.items || []).map(i => `<li>${i}</li>`).join("")}</ul></section>`).join("");
  }

  $("#tabContent").innerHTML = html;

  if (tab.id === "schedule") {
    loadTwitchSchedule();
  }
}

function renderScheduleShell(tab) {
  return `
    <section class="detail-block">
      <h3>Automatikus Twitch menetrend</h3>
      <p class="schedule-status" id="twitchScheduleStatus">Menetrend betöltése Twitchről...</p>
      <div class="schedule-list" id="twitchScheduleList"></div>
    </section>
    <section class="detail-block">
      <h3>Kézi menetrend / tartalék</h3>
      ${renderManualSchedule(tab)}
    </section>
  `;
}

function renderManualSchedule(tab) {
  let html = "";
  if (tab.schedule) {
    html += `<div class="schedule-list">${tab.schedule.map(s => `<div class="schedule-item"><div class="schedule-day">${s.day}</div><div class="schedule-time">${s.time}</div><div class="schedule-title">${s.title}</div></div>`).join("")}</div>`;
  }
  if (tab.note) {
    html += `<div class="schedule-note">${tab.note}</div>`;
  }
  return html;
}

async function loadTwitchSchedule() {
  const status = $("#twitchScheduleStatus");
  const list = $("#twitchScheduleList");
  if (!status || !list) return;

  try {
    const res = await fetch(TWITCH_SCHEDULE_ICS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("A Twitch menetrend most nem érhető el.");

    const ics = await res.text();
    const events = parseTwitchIcs(ics)
      .filter(event => event.start && event.start >= new Date())
      .slice(0, 6);

    if (!events.length) {
      status.textContent = "Nincs kiírt közelgő Twitch menetrend. A kézi tartalék menetrend látható lentebb.";
      return;
    }

    status.textContent = `Következő ${events.length} kiírt stream Cherry Twitch ütemezéséből.`;
    list.innerHTML = events.map(renderTwitchScheduleItem).join("");
  } catch (err) {
    console.warn(err);
    status.textContent = "Az automatikus Twitch menetrend nem töltődött be. A kézi tartalék menetrend látható lentebb.";
  }
}

function parseTwitchIcs(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.map(block => {
    const lines = block.split(/\r?\n/);
    const event = {};
    lines.forEach(line => {
      const separator = line.indexOf(":");
      if (separator === -1) return;
      const rawKey = line.slice(0, separator);
      const key = rawKey.split(";")[0];
      const value = decodeIcsText(line.slice(separator + 1));
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
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00", second = "00", z] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${z ? "Z" : ""}`;
  return new Date(iso);
}

function decodeIcsText(value) {
  return value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

loadData();
