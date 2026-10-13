// OnlySale – core
// Draws the overlay (name, theme button, close button, range slider), remembers the range
// for this tab and hides every product whose discount is outside the range.
// Shop-specific knowledge lives in sites/*.js (adapters). The manifest only loads this
// extension on the supported shops, so there is no fallback for other websites.

(() => {
  const OnlySale = globalThis.OnlySale;
  if (!OnlySale || globalThis.__onlysaleLoaded) return;
  const adapter = OnlySale.adapters.find((a) => a.matches(location.hostname));
  if (!adapter) return;
  globalThis.__onlysaleLoaded = true;

  const api = globalThis.browser || globalThis.chrome;
  const STATE_KEY = "onlysale-state"; // per tab (sessionStorage): open + range
  const THEME_KEY = "onlysale-theme"; // per browser (extension storage): "light" | "dark"
  const HIDDEN_ATTR = "data-onlysale-hidden";

  // ---------- state ----------
  // open = overlay visible, min/max = chosen discount range in %
  let state = { open: false, min: 0, max: 100 };

  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n)) || 0));

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY));
      if (saved && saved.open) {
        state = { open: true, min: clamp(saved.min), max: clamp(saved.max) };
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      if (state.open) sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
      else sessionStorage.removeItem(STATE_KEY); // closed = forgotten = back to defaults
    } catch (e) {}
  }

  // Changing one end of the range. If it crosses the other end, the other end is pushed along.
  function setMin(value) {
    state.min = clamp(value);
    if (state.min > state.max) state.max = state.min;
    refreshOverlay();
  }
  function setMax(value) {
    state.max = clamp(value);
    if (state.max < state.min) state.min = state.max;
    refreshOverlay();
  }
  // Step buttons: 17 -> 10 / 20,  30 -> 20 / 40,  0 and 100 stay where they are.
  const stepDown = (v) => (v % 10 === 0 ? v - 10 : Math.floor(v / 10) * 10);
  const stepUp = (v) => (v % 10 === 0 ? v + 10 : Math.ceil(v / 10) * 10);

  // ---------- theme (light / dark) ----------
  // No saved choice = follow the browser setting. Clicking the button saves a choice.
  let themeChoice = null;
  const darkQuery = globalThis.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  const currentTheme = () => themeChoice || (darkQuery && darkQuery.matches ? "dark" : "light");

  function applyTheme() {
    if (host) host.shadowRoot.querySelector(".panel").dataset.theme = currentTheme();
  }

  function toggleTheme() {
    themeChoice = currentTheme() === "dark" ? "light" : "dark";
    applyTheme();
    try {
      api.storage.local.set({ [THEME_KEY]: themeChoice });
    } catch (e) {}
  }

  try {
    api.storage.local.get(THEME_KEY).then((saved) => {
      themeChoice = saved[THEME_KEY] || null;
      applyTheme();
    });
  } catch (e) {}
  if (darkQuery) darkQuery.addEventListener("change", applyTheme);

  // ---------- filtering ----------
  const filterIsActive = () => state.open && (state.min > 0 || state.max < 100);

  function applyFilter() {
    const cellHasVisibleCard = new Map(); // cell -> true/false

    if (filterIsActive()) {
      const cards = adapter.findCards
        ? adapter.findCards()
        : document.querySelectorAll(adapter.productSelector);
      for (const card of cards) {
        let cell = adapter.getCell ? adapter.getCell(card) : card;
        // Safety net: never hide an element that contains more than one product.
        if (cell !== card && adapter.productSelector &&
            cell.querySelectorAll(adapter.productSelector).length > 1) cell = card;
        const percent = adapter.getSalePercent(card);
        const visible = percent >= state.min && percent <= state.max;
        cellHasVisibleCard.set(cell, cellHasVisibleCard.get(cell) || visible);
      }
    }

    // un-hide everything that should no longer be hidden
    for (const el of document.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
      if (cellHasVisibleCard.get(el) !== false) el.removeAttribute(HIDDEN_ATTR);
    }
    // hide the rest
    for (const [cell, visible] of cellHasVisibleCard) {
      if (!visible) cell.setAttribute(HIDDEN_ATTR, "");
    }
  }

  // Run the filter soon, but not more often than needed (pages change a lot while loading).
  let timer = null;
  function queueFilter(delay = adapter.delay || 100) {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      applyFilter();
    }, delay);
  }

  // Watch the page: new products appear while scrolling, lists get re-rendered, prices update.
  const observer = new MutationObserver(() => queueFilter());

  // ---------- overlay ----------
  let host = null; // the element we add to the page
  let pageStyle = null; // <style> that does the actual hiding

  const OVERLAY_CSS = `
    :host { all: initial; }
    .panel {
      --bg: #fff; --text: #2B0018; --muted: #5E0034; --rail: #ecdfe7; --hover: #fde6f2;
      --border: #5E0034; --accent: #FF038F; --logo-bg: transparent;
      --shadow: 0 8px 28px rgba(43,0,24,.28), 0 0 0 1px rgba(94,0,52,.12);
    }
    .panel[data-theme="dark"] {
      --bg: #26121d; --text: #fbeaf3; --muted: #e9b4d0; --rail: #4b2c3c; --hover: rgba(255,3,143,.22);
      --border: #c0608e; --logo-bg: #f6e6ef;
      --shadow: 0 8px 28px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.1);
    }
    .panel {
      position: fixed; top: 12px; right: 12px; z-index: 2147483647;
      width: 280px; box-sizing: border-box; padding: 14px 16px 16px;
      background: var(--bg); color: var(--text); border-radius: 16px; box-shadow: var(--shadow);
      font: 14px/1.3 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .brand { display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 17px; letter-spacing: .2px; }
    /* 34px box with 4px padding: the logo stays 26px, its background reaches half way to the text */
    .brand .logo { width: 34px; height: 34px; padding: 4px; box-sizing: border-box; border-radius: 10px; background: var(--logo-bg); }
    .brand .version { align-self: flex-end; margin-bottom: 4px; font-weight: 600; font-size: 11px; letter-spacing: 0; color: var(--muted); }
    .buttons { display: flex; gap: 2px; }
    .icon-btn {
      all: unset; box-sizing: border-box; cursor: pointer; width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; color: var(--muted);
    }
    .icon-btn:hover { background: var(--hover); }
    .icon-btn:focus-visible { outline: 2px solid var(--accent); }
    .icon-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .panel[data-theme="dark"] .moon, .panel:not([data-theme="dark"]) .sun { display: none; }
    .values { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 8px; }
    .box { flex: 1; text-align: center; }
    .box label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin-bottom: 3px; }
    .num {
      position: relative; border: 2px solid var(--border); border-radius: 10px; padding: 6px 0;
      font-size: 20px; font-weight: 800; color: var(--text); background: var(--bg);
    }
    .num span { color: var(--accent); }
    /* Invisible click areas (left half = down, right half = up): only the pointer and tooltip change. */
    .step { all: unset; position: absolute; top: 0; bottom: 0; width: 50%; cursor: pointer; }
    .step.down { left: 0; border-radius: 8px 0 0 8px; }
    .step.up { right: 0; border-radius: 0 8px 8px 0; }
    .step:focus-visible { outline: 2px solid var(--accent); } /* keyboard users only */
    .dash { padding-bottom: 10px; color: var(--muted); font-weight: 700; }
    .slider { position: relative; height: 28px; margin-top: 6px; }
    .rail { position: absolute; left: 11px; right: 11px; top: 50%; height: 6px; margin-top: -3px; background: var(--rail); border-radius: 3px; }
    .fill { position: absolute; top: 0; bottom: 0; background: var(--accent); border-radius: 3px; }
    input[type=range] {
      -webkit-appearance: none; appearance: none; background: none; pointer-events: none;
      position: absolute; left: 0; top: 0; width: 100%; height: 28px; margin: 0;
    }
    input[type=range]::-webkit-slider-runnable-track { background: none; }
    input[type=range]::-moz-range-track { background: none; }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; pointer-events: auto; cursor: grab;
      width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid var(--accent);
      box-shadow: 0 1px 4px rgba(0,0,0,.35);
    }
    input[type=range]::-moz-range-thumb {
      pointer-events: auto; cursor: grab; box-sizing: border-box;
      width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid var(--accent);
      box-shadow: 0 1px 4px rgba(0,0,0,.35);
    }
    .made { display: flex; align-items: center; gap: 4px; font-size: 10px; }
    .made svg { height: 11px; width: auto; fill: none; stroke: currentColor; stroke-width: 40; stroke-linecap: round; }
    input[type=range]:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--muted); }
    .scale { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 2px; padding: 0 4px; }
  `;

  const OVERLAY_HTML = `
    <div class="panel" role="dialog" aria-label="OnlySale">
      <div class="head">
        <div class="brand">
          <svg class="logo" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M48 96C43.7565 96 39.6869 97.6857 36.6863 100.686C33.6857 103.687 32 107.757 32 112C32 116.243 33.6857 120.313 36.6863 123.314C39.6869 126.314 43.7565 128 48 128C49.4856 128 50.9711 128 52.4567 128C62.8556 128 73.2546 128 83.6535 128C87.769 128 91.8845 128 96 128C113.062 128.394 128.394 113.062 128 96C128 92.1522 128 88.3045 128 84.4567C128 82.9711 128 81.4856 128 80C128 75.7565 126.314 71.6869 123.314 68.6863C120.313 65.6857 116.243 64 112 64C107.757 64 103.687 65.6857 100.686 68.6863C97.6857 71.6869 96 75.7565 96 80C96 81.4856 96 82.9711 96 84.4567C96 88.3045 96 92.1522 96 96C96.0206 95.9831 95.9831 96.0206 96 96C91.8845 96 87.769 96 83.6535 96C73.2546 96 62.8556 96 52.4567 96C50.9711 96 49.4856 96 48 96Z" fill="#2B0018"/>
<path d="M48 16C65.6731 16 80 30.3269 80 48C80 65.6731 65.6731 80 48 80" stroke="#FF038F" stroke-width="32" stroke-linecap="round"/>
<path d="M48 32C52.2435 32 56.3131 30.3143 59.3137 27.3137C62.3143 24.3131 64 20.2435 64 16C64 11.7565 62.3143 7.68687 59.3137 4.68629C56.3131 1.68571 52.2435 0 48 0C43.9104 -0.00121498 39.7916 0.520411 35.8032 1.56735C15.1734 6.69067 -0.32184 26.7827 0 48C-0.0146351 55.7297 1.90387 63.5567 5.55435 70.4273C5.55435 70.4273 5.55435 70.4273 5.55435 70.4273C5.55435 70.4273 5.55435 70.4273 5.55435 70.4273C13.5562 85.8793 30.5791 96.1836 48 96C66.5911 96 85.1822 96 103.773 96C106.515 96 109.258 96 112 96C116.243 96 120.313 94.3143 123.314 91.3137C126.314 88.3131 128 84.2435 128 80C128 75.7565 126.314 71.6869 123.314 68.6863C120.313 65.6857 116.243 64 112 64C109.258 64 106.515 64 103.773 64C85.1822 64 66.5911 64 48 64C42.1569 64.0643 36.5369 60.6332 33.8391 55.4616C33.8391 55.4616 33.8391 55.4616 33.8391 55.4616C33.8391 55.4616 33.8391 55.4616 33.8391 55.4616C32.629 53.1726 32 50.6449 32 48C31.8612 40.9288 37.1193 34.2009 43.9193 32.521C45.2358 32.176 46.5978 32.0001 48 32Z" fill="#5E0034"/></svg>
          <span>OnlySale</span>
          <span class="version"></span>
        </div>
        <div class="buttons">
          <button class="icon-btn theme" aria-label="Switch light / dark mode" title="Switch light / dark mode">
            <svg class="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <svg class="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          </button>
          <button class="icon-btn close" aria-label="Close" title="Close">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      </div>
      <div class="values">
        <div class="box"><label>From</label>
          <div class="num"><b class="lo-val">0</b><span> %</span>
            <button class="step down lo-down" aria-label="Minimum: previous 10" title="Previous 10"></button>
            <button class="step up lo-up" aria-label="Minimum: next 10" title="Next 10"></button>
          </div>
        </div>
        <div class="dash">&ndash;</div>
        <div class="box"><label>To</label>
          <div class="num"><b class="hi-val">100</b><span> %</span>
            <button class="step down hi-down" aria-label="Maximum: previous 10" title="Previous 10"></button>
            <button class="step up hi-up" aria-label="Maximum: next 10" title="Next 10"></button>
          </div>
        </div>
      </div>
      <div class="slider">
        <div class="rail"><div class="fill"></div></div>
        <input class="lo" type="range" min="0" max="100" step="1" value="0" aria-label="Minimum discount">
        <input class="hi" type="range" min="0" max="100" step="1" value="100" aria-label="Maximum discount">
      </div>
      <div class="scale"><span>0 %</span><span class="made">Manufactured by <svg role="img" aria-label="RihaLabs" viewBox="0 0 1190 190"><path d="M120 170H45C31.1929 170 20 158.807 20 145C20 131.193 31.1929 120 45 120H120C147.614 120 170 97.6142 170 70C170 42.3858 147.614 20 120 20H20"/><path d="M220 20V170"/><path d="M570 170L495.894 21.7889C495.526 21.0518 494.474 21.0518 494.106 21.7889L420 170"/><path d="M720 170H695C653.579 170 620 136.421 620 95V20"/><path d="M920 170H995C1008.81 170 1020 158.807 1020 145C1020 131.193 1008.81 120 995 120H895C881.193 120 870 108.807 870 95C870 81.1929 881.193 70 895 70H945C958.807 70 970 58.8071 970 45C970 31.1929 958.807 20 945 20H820"/><path d="M1070 170H1120C1147.61 170 1170 147.614 1170 120C1170 92.3858 1147.61 70 1120 70H1045C1031.19 70 1020 58.8071 1020 45C1020 31.1929 1031.19 20 1045 20H1120"/><path d="M820 170L745.894 21.7889C745.526 21.0518 744.474 21.0518 744.106 21.7889L707.5 95"/><path d="M270 20V95V145C270 158.807 281.193 170 295 170C308.807 170 320 158.807 320 145V120C320 106.193 331.193 95 345 95H370C397.614 95 420 72.6142 420 45V20"/></svg></span><span>100 %</span></div>
    </div>
  `;

  function buildOverlay() {
    host = document.createElement("onlysale-overlay");
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${OVERLAY_CSS}</style>${OVERLAY_HTML}`;
    document.documentElement.appendChild(host); // outside <body>, so the site can't wipe it

    const on = (selector, event, handler) => root.querySelector(selector).addEventListener(event, handler);
    on(".lo", "input", (e) => setMin(e.target.value)); // moving a handle past the other drags it along
    on(".hi", "input", (e) => setMax(e.target.value));
    on(".lo-down", "click", () => setMin(stepDown(state.min)));
    on(".lo-up", "click", () => setMin(stepUp(state.min)));
    on(".hi-down", "click", () => setMax(stepDown(state.max)));
    on(".hi-up", "click", () => setMax(stepUp(state.max)));
    on(".theme", "click", toggleTheme);
    on(".close", "click", closeOverlay);

    root.querySelector(".version").textContent = "v" + api.runtime.getManifest().version;
    applyTheme();
    refreshOverlay();
  }

  function refreshOverlay() {
    if (!host) return;
    const root = host.shadowRoot;
    const lo = root.querySelector(".lo");
    const hi = root.querySelector(".hi");
    lo.value = state.min;
    hi.value = state.max;
    root.querySelector(".lo-val").textContent = state.min;
    root.querySelector(".hi-val").textContent = state.max;
    const fill = root.querySelector(".fill");
    fill.style.left = state.min + "%";
    fill.style.right = 100 - state.max + "%";
    // When both handles sit on top of each other, keep the right one grabbable.
    lo.style.zIndex = state.min > 50 ? 4 : 2;
    hi.style.zIndex = 3;
    saveState();
    queueFilter(0);
  }

  // ---------- open / close ----------
  function openOverlay() {
    state.open = true;
    pageStyle = document.createElement("style");
    pageStyle.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`;
    (document.head || document.documentElement).appendChild(pageStyle);
    buildOverlay();
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: adapter.watchText !== false,
    });
  }

  function closeOverlay() {
    // Closing resets everything: range back to 0–100, all products visible again.
    state = { open: false, min: 0, max: 100 };
    saveState();
    observer.disconnect();
    applyFilter(); // filter is now inactive, so this un-hides everything
    if (host) host.remove();
    if (pageStyle) pageStyle.remove();
    host = pageStyle = null;
  }

  // The toolbar button (background.js) sends this message.
  api.runtime.onMessage.addListener((message) => {
    if (message && message.type === "onlysale-toggle") {
      if (state.open) closeOverlay();
      else openOverlay();
    }
  });

  // Page was reloaded or we moved to another page of the site: restore the overlay.
  loadState();
  if (state.open) openOverlay();
})();
