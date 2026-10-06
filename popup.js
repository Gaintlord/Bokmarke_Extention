const browserCtx = typeof browser === "undefined" ? chrome : browser;
const storage = browserCtx.storage.local;

const API_BASE = "https://bokmarke.world";
const SUMMARY_URL = `${API_BASE}/api/v1/dashboard/bookmark-summary`;
const REFRESH_URL = `${API_BASE}/api/v1/auth/refresh`;
const LOGIN_URL = `${API_BASE}/Login`;

const COLOR_MAP = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  gray: "#6b7280",
};

const views = {};
let els = {};

function showView(name) {
  for (const [key, node] of Object.entries(views)) {
    node.hidden = key !== name;
  }
}

async function getTokens() {
  const { accessToken, refreshToken } = await storage.get([
    "accessToken",
    "refreshToken",
  ]);
  return {
    accessToken:
      typeof accessToken === "string" && accessToken ? accessToken : null,
    refreshToken:
      typeof refreshToken === "string" && refreshToken ? refreshToken : null,
  };
}

async function getCookieToken() {
  try {
    const cookie = await browserCtx.cookies.get({
      url: API_BASE,
      name: "ACCESS_TOKEN",
    });
    return typeof cookie?.value === "string" && cookie.value
      ? cookie.value
      : null;
  } catch {
    return null;
  }
}

async function hasRefreshCookie() {
  try {
    const cookie = await browserCtx.cookies.get({
      url: API_BASE,
      name: "DR_TAG_TOKEN",
    });
    return typeof cookie?.value === "string" && cookie.value.length > 0;
  } catch {
    return false;
  }
}

async function fetchSummary(token) {
  const resp = await fetch(SUMMARY_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 401) {
    let body = null;
    try {
      body = await resp.clone().json();
    } catch {
      body = null;
    }
    return { expired: body?.code === "ACCESS_TOKEN_EXPIRED" };
  }

  if (!resp.ok) {
    throw new Error(`Summary request failed: ${resp.status}`);
  }

  return { data: await resp.json() };
}

async function refreshAccessToken() {
  const resp = await fetch(REFRESH_URL, { credentials: "include" });
  if (!resp.ok) {
    return null;
  }

  let body = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  const token = resp.headers.get("N_AT") || body?.accessToken || null;
  if (token) {
    await storage.set({ accessToken: token });
  }
  return token;
}

function buildSiteBlock(group) {
  const block = document.createElement("div");
  block.className = "site-block";

  const head = document.createElement("div");
  head.className = "site-head";

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = COLOR_MAP[group.color] || COLOR_MAP.gray;

  const name = document.createElement("h2");
  name.className = "site-name";
  name.textContent = group.website || "Unknown site";

  const count = document.createElement("span");
  count.className = "site-count";
  count.textContent = `${group.totalBookmarks ?? 0} bookmark${
    group.totalBookmarks === 1 ? "" : "s"
  }`;

  head.append(dot, name, count);

  const images = document.createElement("div");
  images.className = "recent-images";

  const links = Array.isArray(group.latestImageLinks)
    ? group.latestImageLinks.filter((src) => typeof src === "string" && src)
    : [];
  for (const src of links.slice(0, 3)) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    images.append(img);
  }

  block.append(head, images);
  return block;
}

function renderSites(groups) {
  const blocks = groups
    .filter((group) => group && typeof group === "object")
    .slice(0, 3)
    .map(buildSiteBlock);
  els.sites.replaceChildren(...blocks);
}

function openLogin() {
  browserCtx.tabs.create({ url: LOGIN_URL });
}

let loadInFlight = false;

async function load() {
  if (loadInFlight) return;
  loadInFlight = true;
  showView("loading");

  try {
    const stored = await getTokens();
    let accessToken = await getCookieToken();
    if (!accessToken) {
      accessToken = stored.accessToken;
    }

    const refreshCookie = await hasRefreshCookie();

    if (!accessToken && !stored.refreshToken && !refreshCookie) {
      showView("guest");
      return;
    }

    if (!accessToken) {
      accessToken = await refreshAccessToken();
      if (!accessToken) {
        showView("guest");
        return;
      }
    }

    let result = await fetchSummary(accessToken);
    if (result.expired) {
      accessToken = await refreshAccessToken();
      if (!accessToken) {
        showView("guest");
        return;
      }
      result = await fetchSummary(accessToken);
    }

    if (!result.data || result.expired) {
      showView("guest");
      return;
    }

    if (!Array.isArray(result.data) || result.data.length === 0) {
      showView("empty");
      return;
    }

    renderSites(result.data);
    showView("bookmarks");
  } catch {
    showView("error");
  } finally {
    loadInFlight = false;
  }
}

function init() {
  els = {
    sites: document.getElementById("sites"),
  };
  views.guest = document.getElementById("guest-view");
  views.bookmarks = document.getElementById("bookmark-view");
  views.loading = document.getElementById("loading");
  views.empty = document.getElementById("empty");
  views.error = document.getElementById("error");

  document.getElementById("login-btn").addEventListener("click", openLogin);

  browserCtx.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.accessToken || changes.refreshToken)) {
      load();
    }
  });

  browserCtx.cookies.onChanged.addListener((changeInfo) => {
    const name = changeInfo?.cookie?.name;
    if (name === "ACCESS_TOKEN" || name === "DR_TAG_TOKEN") {
      load();
    }
  });

  load();
}

document.addEventListener("DOMContentLoaded", init);
