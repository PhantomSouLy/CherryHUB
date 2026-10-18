let hubData = null;
const TWITCH_BROADCASTER_ID = "611526048";
const TWITCH_SCHEDULE_ICS_URL = `https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=${TWITCH_BROADCASTER_ID}`;
const TWITCH_UPTIME_URL = "https://decapi.me/twitch/uptime/happycherrychan";
const WALLPAPERS_DATA_URL = "data/wallpapers.json";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const THEME_KEY = "cherryhub-theme";
let modalTrigger = null;
let cardOpenRequest = 0;
let liveStatusTimer = null;
let liveStatusLoading = false;
let themeTransition = null;
let themeTarget = null;
let themeSwitchVersion = 0;

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
  if (themeColor) themeColor.setAttribute("content", safeTheme === "dark" ? "#140811" : "#d9d0dd");

  const button = $("#themeToggle");
  if (button) {
    button.textContent = safeTheme === "light" ? "☀️ Light mode" : "🌙 Dark mode";
    button.setAttribute("aria-pressed", safeTheme === "dark" ? "true" : "false");
    button.setAttribute("aria-label", safeTheme === "light" ? "Dark mód bekapcsolása" : "Light mód bekapcsolása");
  }
}

applyTheme(getInitialTheme());

function toggleTheme() {
  const next = (themeTarget || root.dataset.theme) === "dark" ? "light" : "dark";
  const version = ++themeSwitchVersion;
  themeTarget = next;
  themeTransition?.skipTransition();
  const update = () => {
    if (version === themeSwitchVersion) applyTheme(next, true);
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion && typeof document.startViewTransition === "function") {
    try {
      const transition = document.startViewTransition(update);
      themeTransition = transition;
      transition.finished.catch(() => {}).finally(() => {
        if (themeTransition === transition) {
          themeTransition = null;
          themeTarget = null;
        }
      });
      return;
    } catch {
      // Fall back to a short fade on browsers without a usable view transition.
    }
  }
  update();
  themeTransition = null;
  themeTarget = null;
  if (!reducedMotion) document.body.animate?.([{ opacity: 0.94 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
}

function bindHeaderPolish() {
  const header = $(".topbar");
  if (!header || header.dataset.polishBound) return;
  header.dataset.polishBound = "true";
  header.addEventListener("click", event => {
    const control = event.target.closest("a, button");
    if (!control || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    control.animate?.([{ transform: "scale(1)" }, { transform: "scale(.965)", offset: 0.4 }, { transform: "scale(1)" }], { duration: 220, easing: "ease-out" });
  });
}

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
    await loadWallpaperData();
    ensureWallpaperHubData();
    renderAll();
  } catch (e) {
    console.error(e);
    const lead = $("#heroLead");
    if (lead) lead.textContent = "Nem sikerült betölteni a data/content.json fájlt.";
    activateIntroPolish();
  }
}

async function loadWallpaperData() {
  try {
    const response = await fetch(WALLPAPERS_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("wallpapers.json");
    const data = await response.json();
    hubData.wallpapers = {
      phone: Array.isArray(data.phone) ? data.phone : [],
      pc: Array.isArray(data.pc) ? data.pc : []
    };
  } catch (error) {
    console.warn("A Cherry hátterek adatai még nem érhetők el.", error);
    hubData.wallpapers = { phone: [], pc: [] };
  }
}

function ensureWallpaperHubData() {
  if (!hubData) return;

  const navItem = {
    label: "Cherry Hátterek",
    target: "#wallpapers",
    open: "wallpapers"
  };

  hubData.nav = Array.isArray(hubData.nav) ? hubData.nav : [];
  if (!hubData.nav.some(item => item.open === "wallpapers")) {
    const communityIndex = hubData.nav.findIndex(item => item.open === "community");
    if (communityIndex >= 0) hubData.nav.splice(communityIndex, 0, navItem);
    else hubData.nav.push(navItem);
  }

  const wallpaperCard = {
    id: "wallpapers",
    icon: "▧",
    title: "Cherry Hátterek",
    short: "Telefonos és PC hátterek letölthető méretekben.",
    details: {
      text: "Válassz telefonos vagy PC hátteret.",
      defaultTab: "wallpaper-phone",
      tabs: [
        {
          id: "wallpaper-phone",
          label: "📱 Telefon Hátterek",
          type: "wallpapers",
          wallpaperType: "phone"
        },
        {
          id: "wallpaper-pc",
          label: "🖥️ PC Hátterek",
          type: "wallpapers",
          wallpaperType: "pc"
        }
      ]
    }
  };

  hubData.cards = Array.isArray(hubData.cards) ? hubData.cards : [];
  if (!hubData.cards.some(card => card.id === "wallpapers")) {
    const communityIndex = hubData.cards.findIndex(card => card.id === "community");
    if (communityIndex >= 0) hubData.cards.splice(communityIndex, 0, wallpaperCard);
    else hubData.cards.push(wallpaperCard);
  }
}

function renderAll() {
  applyTheme(root.dataset.theme);

  $("#themeToggle")?.addEventListener("click", toggleTheme);
  bindHeaderPolish();

  renderNav();
  renderHero();
  renderLivePanel();
  renderSocials();
  renderNews();
  renderFeaturedPanels();
  renderCards();
  bindCardRail();
  renderWideSections();
  bindModal();
  activateIntroPolish();
}

function renderNav() {
  const nav = $("#mainNav");
  const menu = $(".menu-toggle");
  const dockMenu = $(".dock-menu-trigger");
  if (!nav) return;

  nav.innerHTML = (hubData.nav || [])
    .map(i => `<a href="${i.target}" ${i.highlight ? 'class="nav-highlight"' : ""} ${i.open ? `data-nav-open="${i.open}"` : ""}><span class="nav-label">${i.label}</span></a>`)
    .join("");

  const closeNav = () => {
    nav.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
  };

  const toggleNav = e => {
    e?.stopPropagation();
    const open = nav.classList.toggle("open");
    menu?.setAttribute("aria-expanded", open ? "true" : "false");
  };

  menu?.addEventListener("click", toggleNav);
  dockMenu?.addEventListener("click", toggleNav);

  nav.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (!link) return;
    closeNav();
    if (link.dataset.navOpen) {
      e.preventDefault();
      openModal(link.dataset.navOpen);
    } else {
      closeModal();
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
    openModal(link.dataset.heroOpen, link.dataset.heroTab || null);
  });
}

function renderLivePanel() {
  loadLiveStatus();
  loadHomeSchedulePreview();
  if (liveStatusTimer === null) {
    liveStatusTimer = window.setInterval(() => {
      if (!document.hidden) loadLiveStatus();
    }, 60000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) loadLiveStatus();
    });
  }
}

function updateLiveStatus(state) {
  const online = state === "live";
  const label = online ? "Cherry Most élőben!" : state === "offline" ? "Cherry most Offline" : "Live státusz nem ellenőrizhető";
  const card = $("#homeLiveCard");
  const dot = $("#liveStatusDot");
  const text = $("#liveStatusText");
  const badge = $("#liveBadge");
  dot?.classList.toggle("online", online);
  dot?.classList.toggle("offline", !online);
  card?.classList.toggle("is-live", online);
  if (text) text.textContent = label;
  if (badge) {
    badge.textContent = online ? "LIVE" : state === "offline" ? "OFFLINE" : "STATUS";
    badge.classList.toggle("offline", !online);
  }
  const scheduleStatus = $("#scheduleLiveStatus");
  const scheduleText = $("#scheduleLiveText");
  if (scheduleStatus) scheduleStatus.dataset.state = state;
  if (scheduleText) scheduleText.textContent = label;
}

async function loadLiveStatus() {
  if (liveStatusLoading) return;
  liveStatusLoading = true;
  try {
    const res = await fetch(TWITCH_UPTIME_URL, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error("uptime");

    const uptime = (await res.text()).trim();
    const offline = /offline|not live|not currently live/i.test(uptime);
    const validUptime = /\b\d+\s+(?:days?|hours?|minutes?|seconds?)\b/i.test(uptime);
    if (!offline && !validUptime) throw new Error("Érvénytelen live státusz");
    updateLiveStatus(offline ? "offline" : "live");
  } catch (e) {
    console.warn("Live státusz nem tölthető be", e);
    updateLiveStatus("unknown");
  } finally {
    liveStatusLoading = false;
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
      sub.textContent = "Nincs új menetrend kiírva.";
      list.innerHTML = `<div class="home-schedule-empty">Hamarosan érkezik az új menetrend ♡</div>`;
      return;
    }

    const next = events[0];
    const day = [
      next.start.toLocaleDateString("hu-HU", { month: "short", day: "numeric" }),
      next.start.toLocaleDateString("hu-HU", { weekday: "long" })
    ].map(part => part.charAt(0).toLocaleUpperCase("hu-HU") + part.slice(1)).join(" - ");
    const time = next.start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    sub.innerHTML = `<time class="next-stream-date" datetime="${next.start.toISOString()}">${escapeHtml(day)} · ${time}</time><p class="next-stream-title"><span>Cím:</span> <strong>${escapeHtml(next.title || "Cherry stream")}</strong></p>`;
    list.innerHTML = events.map(renderHomeScheduleItem).join("");
  } catch (e) {
    console.warn("Twitch menetrend nem tölthető be", e);
    sub.textContent = "A Twitch menetrend most nem tölthető be.";
    list.innerHTML = `<div class="home-schedule-empty">A menetrend átmenetileg nem elérhető.</div>`;
  }
}

function renderHomeScheduleItem(event) {
  const date = event.start.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
  const time = event.start.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  return `<div class="home-schedule-item"><span>${date}</span><b>${escapeHtml(event.title || "Cherry stream")}</b><time>${time}</time></div>`;
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
  const gImage = g ? `<img src="${escapeHtml(g.image)}" alt="GaCherry banner" loading="lazy">` : "";
  const gFrame = !g || g.paused || !g.url
    ? `<div class="gacherry-image-frame">${gImage}</div>`
    : `<a class="gacherry-image-frame" href="${escapeHtml(g.url)}" target="_blank" rel="noreferrer">${gImage}</a>`;
  const gHtml = g ? `<article class="gacherry-panel"><div class="gacherry-copy"><span class="panel-kicker">✦ Kiemelt projekt</span><h2>${escapeHtml(g.title)}</h2>${renderProjectStatus(g)}<p>${escapeHtml(g.text)}</p><div class="badge-row">${(g.badges || []).map(b => `<span>${escapeHtml(b)}</span>`).join("")}</div>${renderModalAction({ label: g.button, url: g.url, disabled: g.paused }, "panel-button")}</div>${gFrame}</article>` : "";
  const mHtml = `<article class="music-panel"><div class="music-head"><span>♪</span><div><span class="panel-kicker">Cherry Music</span><h2>Cherry Zenéi</h2></div></div><div class="music-list">${music.slice(0, 4).map(t => `<a class="music-track" href="${t.url}" target="_blank" rel="noreferrer"><b>${t.title}</b><span>${t.type || "YouTube"} →</span></a>`).join("")}</div><div class="music-actions"><a class="panel-button" href="https://www.youtube.com/@happycherrychan" target="_blank" rel="noreferrer">YouTube csatorna →</a><button class="panel-button panel-button-ghost" type="button" data-open-music-list>Lista megnyitása →</button></div></article>`;
  wrap.innerHTML = gHtml + mHtml;
}

function renderProjectStatus(project) {
  if (!project.paused) return "";
  return `<div class="project-status" role="status"><strong>${escapeHtml(project.pauseMessage)}</strong><small>${escapeHtml(project.availability)}</small></div>`;
}

function renderModalAction(button, className = "") {
  if (button.disabled || !button.url) {
    return `<button class="modal-action-disabled ${className}" type="button" disabled>${escapeHtml(button.label)}</button>`;
  }
  const classes = [className, button.featured ? "modal-action-featured" : ""].filter(Boolean).join(" ");
  return `<a${classes ? ` class="${classes}"` : ""} href="${escapeHtml(button.url)}" target="${button.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${escapeHtml(button.label)}</a>`;
}

function openMusicListModal() {
  $("#modalTitle").textContent = "Cherry Zenéi";
  $("#modalText").textContent = "";
  const albums = hubData.musicAlbums || [];
  renderModalContent({ details: {
    defaultTab: albums[0]?.id,
    tabs: albums.map(album => ({ id: album.id, label: album.title, type: "music", albumId: album.id })),
    buttons: [{ label: "YouTube csatorna →", url: "https://www.youtube.com/@happycherrychan" }]
  }});
  showModal();
}

function renderMusicAlbum(albumId) {
  const tracks = (hubData.musicTracks || []).filter(track => track.album === albumId);
  if (!tracks.length) return '<div class="album-empty"><span aria-hidden="true">♪</span><p>Az Album #2 dalai hamarosan érkeznek.</p></div>';
  return `<div class="music-modal-list">${tracks.map(track => `<article class="music-modal-track"><div><b>${escapeHtml(track.title)}</b><span>${escapeHtml(track.type || "YouTube")}</span></div><a href="${escapeHtml(track.url)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(track.title)} lejátszása YouTube-on">Lejátszás YouTube-on →</a></article>`).join("")}</div>`;
}

function renderCommandList(tab) {
  const renderRows = commands => `<dl class="command-list">${commands.map(item => `<div class="command-row"><dt><code>${escapeHtml(item.command)}</code>${item.permission === "Regular" ? '<span class="command-access">Regular</span>' : ""}</dt><dd>${escapeHtml(item.description)}</dd></div>`).join("")}</dl>`;
  const content = tab.groups
    ? tab.groups.map(group => `<section class="command-group"><h3>${escapeHtml(group.title)}</h3>${renderRows(group.commands || [])}</section>`).join("")
    : renderRows(tab.commands || []);
  return `${content}${tab.note ? `<p class="command-note">${escapeHtml(tab.note)}</p>` : ""}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeNewsUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || /^(?:\.\.?\/|\/)/.test(url)) return escapeHtml(url);
  return "";
}

function getNewsText(item) {
  return String(item?.description || item?.text || "").trim();
}

function getNewsImage(item) {
  return safeNewsUrl(item?.image || item?.imageUrl || item?.image_url || "");
}

function getNewsDate(item) {
  return String(item?.date || item?.publishedAt || item?.published_at || "").trim();
}

function isRealNewsItem(item) {
  const title = String(item?.title || "").trim();
  const text = getNewsText(item);
  return Boolean((title && title !== "-") || (text && text !== "-"));
}

function renderNews() {
  const strip = $("#newsStrip");
  if (!strip) return;

  const news = (hubData.news || []).filter(isRealNewsItem);
  if (!news.length) {
    strip.innerHTML = `<div class="news-empty"><strong>Még nincs új hír.</strong><span>Ha érkezik valami Cherry világából, itt fog megjelenni.</span></div>`;
    return;
  }

  strip.innerHTML = news.map((item, index) => {
    const title = escapeHtml(item.title || "Cherry hír");
    const text = escapeHtml(getNewsText(item));
    const date = escapeHtml(getNewsDate(item));
    const image = getNewsImage(item);
    const imageHtml = image
      ? `<div class="news-card-image"><img src="${image}" alt="${title}" loading="lazy"></div>`
      : `<div class="news-card-image news-card-placeholder" aria-hidden="true"><span>CHERRY NEWS</span></div>`;

    return `<button class="news-card" type="button" data-news-index="${index}" aria-label="${title} hír megnyitása">${imageHtml}<div class="news-card-body">${date ? `<time>${date}</time>` : `<span class="news-card-label">HÍR</span>`}<h3>${title}</h3><p>${text || "Kattints a teljes hír megnyitásához."}</p><span class="news-card-more">Teljes hír →</span></div></button>`;
  }).join("");

  window.__visibleNews = news;
}

function openNewsModal(index) {
  const item = (window.__visibleNews || [])[index];
  if (!item) return;

  const title = String(item.title || "Cherry hír");
  const text = getNewsText(item);
  const date = getNewsDate(item);
  const image = getNewsImage(item);
  const optionalText = String(item.optionalText || item.optional_text || item.extraText || item.extra_text || "").trim();
  const optionalUrl = safeNewsUrl(item.optionalUrl || item.optional_url || item.extraUrl || item.extra_url || item.url || "");

  $("#modalTitle").textContent = title;
  $("#modalText").textContent = date || "Hírek";

  const imageHtml = image
    ? `<div class="news-modal-image"><img src="${image}" alt="${escapeHtml(title)}"></div>`
    : "";
  const textHtml = text
    ? `<div class="news-modal-copy">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`
    : `<div class="news-modal-copy">Ehhez a hírhez még nincs részletes leírás.</div>`;
  const extraHtml = optionalText
    ? `<div class="news-modal-extra">${escapeHtml(optionalText)}</div>`
    : "";

  $("#modalContent").innerHTML = `<article class="news-modal-article">${imageHtml}${textHtml}${extraHtml}</article>`;
  $("#modalActions").innerHTML = optionalUrl
    ? `<a href="${optionalUrl}" target="_blank" rel="noreferrer">${escapeHtml(optionalText || "További információ")} →</a>`
    : "";
  showModal();
}

function renderCards() {
  const grid = $("#cardsGrid");
  if (!grid) return;
  grid.innerHTML = (hubData.cards || []).map(card => `<button id="${card.id}" class="section-card" type="button" data-open-modal="${card.id}" aria-haspopup="dialog" aria-label="${escapeHtml(card.title)} megnyitása"><span class="card-corner" aria-hidden="true">✦</span><span class="big-icon" aria-hidden="true">${escapeHtml(card.icon)}</span><span class="card-title">${escapeHtml(card.title)}</span><span class="card-suit" aria-hidden="true">♡</span></button>`).join("");
}

function bindCardRail() {
  const rail = $("#cardsGrid");
  if (!rail || rail.dataset.dragBound) return;
  rail.dataset.dragBound = "true";
  let drag = null;
  let suppressClick = false;

  rail.addEventListener("wheel", event => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    if (maxScroll <= 0) return;
    const unit = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? rail.clientWidth : 1;
    const next = Math.max(0, Math.min(maxScroll, rail.scrollLeft - event.deltaY * unit));
    if (Math.abs(next - rail.scrollLeft) < 0.01) return;
    event.preventDefault();
    rail.scrollLeft = next;
  }, { passive: false });

  rail.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    // Let the browser handle dragging the native scrollbar itself.
    if (event.clientY >= rail.getBoundingClientRect().top + rail.clientHeight) return;
    suppressClick = false;
    drag = { pointerId: event.pointerId, x: event.clientX, left: rail.scrollLeft, moved: false };
  });

  rail.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(distance) < 6) return;
      drag.moved = true;
      suppressClick = true;
      rail.classList.add("is-dragging");
      rail.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    rail.scrollLeft = drag.left - distance;
  });

  const finishDrag = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const pointerId = drag.pointerId;
    drag = null;
    rail.classList.remove("is-dragging");
    if (rail.hasPointerCapture(pointerId)) rail.releasePointerCapture(pointerId);
  };
  rail.addEventListener("pointerup", finishDrag);
  rail.addEventListener("pointercancel", finishDrag);
  rail.addEventListener("lostpointercapture", finishDrag);
  rail.addEventListener("pointerleave", event => {
    if (!drag?.moved) finishDrag(event);
  });
  rail.addEventListener("dragstart", event => event.preventDefault());
  rail.addEventListener("click", event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
}

async function pickUpCard(card) {
  if (card.dataset.opening) return;
  const request = ++cardOpenRequest;
  card.dataset.opening = "true";
  card.setAttribute("aria-busy", "true");
  let animation;
  try {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation = card.animate([
        { transform: getComputedStyle(card).transform, opacity: 1 },
        { transform: "translateY(-22px) rotate(-5deg) scale(1.06)", opacity: 0.45 }
      ], { duration: 260, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
      await animation.finished;
    }
    if (request === cardOpenRequest) openModal(card.dataset.openModal);
  } catch (error) {
    if (error.name !== "AbortError") console.error(error);
  } finally {
    animation?.cancel();
    delete card.dataset.opening;
    card.removeAttribute("aria-busy");
  }
}

function renderWideSections() {
  const wrap = $("#wideSections");
  if (!wrap) return;
  wrap.innerHTML = (hubData.wideSections || []).map(s => `<article id="${s.id}" class="wide-card"><div class="wide-head"><span>${s.icon}</span><h2>${s.title}</h2></div>${s.text ? `<p>${escapeHtml(s.text)}</p>` : ""}${(s.items || []).map(i => `<div class="wide-item"><b>${i.title}</b><p>${i.text}</p><a class="wide-link" href="${i.url}" target="${i.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${i.button} →</a></div>`).join("")}${s.note ? `<div class="wide-note">${escapeHtml(s.note)}${s.noteDetails ? `<span class="wide-note-details">${escapeHtml(s.noteDetails)}</span>` : ""}</div>` : ""}</article>`).join("");
}

function bindModal() {
  const header = $(".topbar");
  if (header) {
    const updateHeaderHeight = () => root.style.setProperty("--header-height", `${header.offsetHeight}px`);
    updateHeaderHeight();
    new ResizeObserver(updateHeaderHeight).observe(header);
  }
  document.addEventListener("click", e => {
    if (e.target.closest('a[href="#home"]')) closeModal();
    const open = e.target.closest("[data-open-modal]");
    if (open?.classList.contains("section-card")) pickUpCard(open);
    else if (open) openModal(open.dataset.openModal, open.dataset.openTab || null);

    const musicList = e.target.closest("[data-open-music-list]");
    if (musicList) {
      e.preventDefault();
      openMusicListModal();
    }

    const newsCard = e.target.closest("[data-news-index]");
    if (newsCard) {
      e.preventDefault();
      openNewsModal(Number(newsCard.dataset.newsIndex));
    }

    if (e.target.closest("[data-close-modal]")) closeModal();
    const tab = e.target.closest("[data-tab]");
    if (tab) switchTab(tab.dataset.tab);
  });
  document.addEventListener("keydown", e => {
    const modal = $("#infoModal");
    if (e.key === "Tab" && modal?.classList.contains("show")) {
    const focusable = $$(".topbar button, .topbar a[href], .mobile-dock button, .mobile-dock a[href], #infoModal button, #infoModal a[href], #infoModal summary, #infoModal [tabindex='0']")
        .filter(element => element.getClientRects().length && !element.disabled);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        e.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!e.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        e.preventDefault();
        first?.focus({ preventScroll: true });
      }
    }
    if (e.key === "Escape") {
      closeModal();
      $("#mainNav")?.classList.remove("open");
      $(".menu-toggle")?.setAttribute("aria-expanded", "false");
    }
  });
}

function showModal() {
  cardOpenRequest++;
  const m = $("#infoModal");
  if (!m) return;
  $("#modalKicker").innerHTML = '<span class="stream-ornament" aria-hidden="true">✦ ♡ ✦</span>';
  if (!m.classList.contains("show") || document.activeElement?.closest(".topbar, .mobile-dock")) {
    modalTrigger = document.activeElement;
  }
  m.inert = false;
  m.classList.add("show");
  document.body.classList.add("modal-open");
  m.setAttribute("aria-hidden", "false");
  root.style.overflow = "hidden";
  $$("main, .site-footer").forEach(element => {
    element.inert = true;
  });
  $(".modal-panel", m).scrollTop = 0;
  $(".modal-close", m)?.focus({ preventScroll: true });
}

function openModal(id, forceTab = null) {
  if (id === "music") {
    openMusicListModal();
    return;
  }
  const d = hubData?.cards?.find(c => c.id === id);
  const section = hubData?.wideSections?.find(item => item.id === id);
  if (!d && section) {
    $("#modalTitle").textContent = section.title;
    $("#modalText").textContent = section.text;
    $("#modalContent").innerHTML = (section.items || []).map(item =>
      `<section class="detail-block"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p><a class="wide-link" href="${escapeHtml(item.url)}" target="${item.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">${escapeHtml(item.button)} →</a></section>`
    ).join("");
    $("#modalActions").innerHTML = section.note ? `<div class="wide-note">${escapeHtml(section.note)}</div>` : "";
    showModal();
    return;
  }
  if (!d) return;
  $("#modalTitle").textContent = d.title;
  $("#modalText").textContent = d.details?.text ?? d.short;
  renderModalContent(d, forceTab);
  showModal();
}

function renderDetailItem(i) {
  if (i && typeof i === "object") {
    const title = i.title || i.label || "Elem";
    if (i.value) return `<li class="detail-spec"><span>${escapeHtml(title)}</span><strong>${escapeHtml(i.value)}</strong></li>`;
    if (i.url) return `<li class="object-item"><span>${title}</span><a href="${i.url}" target="_blank" rel="noreferrer">🎧 Meghallgatom</a></li>`;
    return `<li>${escapeHtml(title)}</li>`;
  }
  return `<li>${escapeHtml(i)}</li>`;
}

function platformIcon(platform) {
  const paths = {
    twitch: "M11.571 4.714h1.715v5.143h-1.715zM6.857 0 2.571 4.286v15.428h5.143V24L12 19.714h3.429L23.143 12V0Zm14.572 11.143L18 14.571h-5.143l-3 3v-3H5.143V1.714h16.286ZM16.286 4.714H18v5.143h-1.714z",
    discord: "M19.7 5.3A18 18 0 0 0 15 3.8l-.6 1.2a16.3 16.3 0 0 0-4.8 0L9 3.8a18 18 0 0 0-4.7 1.5C1.4 9.6.7 13.8 1.1 18a18.2 18.2 0 0 0 5.7 2.9l1.2-2a12 12 0 0 1-1.8-.9l.4-.3a13.7 13.7 0 0 0 10.8 0l.4.3a12 12 0 0 1-1.8.9l1.2 2a18.2 18.2 0 0 0 5.7-2.9c.4-4.2-.3-8.4-3.2-12.7ZM8.5 10.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm7 0a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z"
  };
  if (!Object.hasOwn(paths, platform)) return "";
  return `<svg class="platform-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="${paths[platform]}"></path></svg>`;
}

function renderTabButton(tab, active) {
  const icon = platformIcon(tab.platform);
  const platform = icon ? ` data-platform="${tab.platform}"` : "";
  return `<button class="tab-btn${icon ? " platform-tab" : ""}${active ? " active" : ""}" type="button" data-tab="${escapeHtml(tab.id)}"${platform} aria-pressed="${active}" aria-controls="tabContent">${icon}${escapeHtml(tab.label)}</button>`;
}

function rulesText(value = "") {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderRules(tab) {
  const rules = tab.rules;
  if (!rules) return "";
  const platform = tab.platform === "discord" ? "discord" : "twitch";
  const paragraphs = values => (values || []).map(value => `<p>${rulesText(value)}</p>`).join("");
  const chapters = (rules.sections || []).map(section => `<details class="rules-section" name="rules-${platform}"><summary><span>${escapeHtml(section.title)}</span><span class="rules-chevron" aria-hidden="true">+</span></summary><div class="rules-section-body">${section.lead ? `<p><strong>${rulesText(section.lead)}</strong></p>` : ""}${section.intro ? `<p>${rulesText(section.intro)}</p>` : ""}<ul>${(section.items || []).map(item => `<li>${rulesText(item)}</li>`).join("")}</ul>${section.closing ? `<p>${rulesText(section.closing)}</p>` : ""}${section.emphasis ? `<p class="rules-emphasis"><strong>${rulesText(section.emphasis)}</strong></p>` : ""}</div></details>`).join("");
  const footer = rules.footer;
  return `<article class="rules-document" data-platform="${platform}"><header class="rules-intro"><h3>${escapeHtml(rules.title)}</h3>${rules.welcome ? `<p><strong>${rulesText(rules.welcome)}</strong></p>` : ""}${paragraphs(rules.intro)}</header><div class="rules-chapters">${chapters}</div>${footer ? `<footer class="rules-footer"><h3>${escapeHtml(footer.title)}</h3>${paragraphs(footer.paragraphs)}<p><strong>${rulesText(footer.emphasis)}</strong></p></footer>` : ""}</article>`;
}

function renderModalContent(d, forceTab = null) {
  const details = d.details || {};
  if (details.tabs?.length) {
    const defaultTab = forceTab || details.defaultTab || details.tabs[0].id;
    const rulesTabs = details.tabs.every(tab => tab.type === "rules");
    $("#modalContent").innerHTML = `<div class="tab-row${rulesTabs ? " rules-tabs" : ""}" role="group" aria-label="Tartalomválasztó">${details.tabs.map(tab => renderTabButton(tab, tab.id === defaultTab)).join("")}</div><div class="tab-content" id="tabContent"></div>`;
    window.__currentTabs = details.tabs;
    window.__currentTabButtons = details.buttons || [];
    switchTab(defaultTab);
    return;
  }
  $("#modalContent").innerHTML = (details.blocks || []).map(b => `<section class="detail-block"><h3>${b.heading}</h3><ul>${(b.items || []).map(renderDetailItem).join("")}</ul></section>`).join("");
  $("#modalActions").innerHTML = (details.buttons || []).map(button => renderModalAction(button)).join("");
}

function switchTab(id) {
  const tabs = window.__currentTabs || [];
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  $$(".tab-btn").forEach(button => {
    const active = button.dataset.tab === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  let html = renderProjectStatus(tab);
  html += tab.text ? `<p>${escapeHtml(tab.text)}</p>` : "";
  if (tab.id === "schedule") html += renderScheduleShell();
  else if (tab.type === "wallpapers") html += renderWallpaperGallery(tab.wallpaperType);
  else if (tab.type === "music") html += renderMusicAlbum(tab.albumId);
  else if (tab.type === "commands") html += renderCommandList(tab);
  else if (tab.type === "rules") html += renderRules(tab);

  if (tab.blocks) {
    html += tab.blocks
      .map(b => `<section class="detail-block"><h3>${b.heading}</h3><ul>${(b.items || []).map(renderDetailItem).join("")}</ul></section>`)
      .join("");
  }

  $("#tabContent").innerHTML = html;
  $("#modalActions").innerHTML = (tab.buttons ?? window.__currentTabButtons ?? [])
    .map(button => renderModalAction(button)).join("");
  if (tab.id === "schedule") loadTwitchSchedule();
}

function renderScheduleShell() {
  return `<section class="detail-block schedule-only-block"><p class="schedule-status" id="twitchScheduleStatus" role="status">Menetrend betöltése...</p><div class="schedule-list" id="twitchScheduleList"></div></section>`;
}

function renderWallpaperGallery(type) {
  const items = hubData?.wallpapers?.[type] || [];
  const label = type === "phone" ? "telefonos" : "PC";

  if (!items.length) {
    return `<div class="wallpaper-gallery wallpaper-gallery-empty"><div class="wallpaper-empty"><strong>Hamarosan érkeznek a ${label} hátterek.</strong></div></div>`;
  }

  const entries = items.map((item, index) => {
    const downloads = Array.isArray(item.downloads) ? item.downloads : [];
    const downloadHtml = downloads.length
      ? `<div class="wallpaper-downloads">${downloads.map(file => `<a class="wallpaper-download-link" href="${file.url}" target="_blank" rel="noreferrer">Download ${file.label}</a>`).join("")}</div>`
      : `<div class="wallpaper-no-download">A letöltési link hamarosan érkezik.</div>`;

    const preview = item.preview
      ? `<div class="wallpaper-preview-wrap"><img class="wallpaper-preview" src="${item.preview}" alt="${item.title || "Cherry háttér"} előnézet" loading="lazy"></div>`
      : `<div class="wallpaper-preview-wrap wallpaper-preview-placeholder">Preview hamarosan</div>`;

    return `<article class="wallpaper-entry"><h3>${item.title || `Cherry háttér ${index + 1}`}</h3>${preview}${downloadHtml}</article>${index < items.length - 1 ? `<div class="wallpaper-divider" aria-hidden="true"></div>` : ""}`;
  }).join("");

  return `<div class="wallpaper-gallery">${entries}</div>`;
}

async function loadTwitchSchedule() {
  const status = $("#twitchScheduleStatus");
  const list = $("#twitchScheduleList");
  if (!status || !list) return;
  try {
    const res = await fetch(TWITCH_SCHEDULE_ICS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const events = parseTwitchIcs(await res.text()).filter(ev => ev.start && ev.start >= new Date()).sort((a, b) => a.start - b.start).slice(0, 6);
    if (!events.length) {
      status.textContent = "Nincs heti stream kiírva. Hamarosan lesz...";
      return;
    }
    status.hidden = true;
    list.innerHTML = events.map(renderTwitchScheduleItem).join("");
  } catch (e) {
    console.warn(e);
    status.textContent = "Jelenleg nincs menetrend.";
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
  return `<div class="schedule-item"><div class="schedule-day">${day}</div><div class="schedule-time">${time}</div><div class="schedule-title">${escapeHtml(title)}</div></div>`;
}

function closeModal() {
  cardOpenRequest++;
  const m = $("#infoModal");
  if (!m?.classList.contains("show")) return;
  m.classList.remove("show");
  document.body.classList.remove("modal-open");
  m.setAttribute("aria-hidden", "true");
  m.inert = true;
  root.style.overflow = "";
  $$("main, .site-footer").forEach(element => {
    element.inert = false;
  });
  const trigger = modalTrigger?.getClientRects().length ? modalTrigger : $(".menu-toggle");
  trigger?.focus({ preventScroll: true });
  modalTrigger = null;
}

loadData();
