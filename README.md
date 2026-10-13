<p align="center"><img src="docs/assets/logo.svg" width="96" alt="OnlySale logo"></p>
<h1 align="center">OnlySale</h1>
<p align="center"><b>Show only what's on sale.</b><br>A free, open-source browser extension that hides every product outside the discount range you choose.</p>
<p align="center"><a href="https://rihalabs.github.io/onlysale/">Website &amp; live demo</a> · Chrome Web Store · Firefox Add-ons · Edge Add-ons (links added after publishing)</p>

## What it does

Open the OnlySale panel on a supported shop, drag the two handles (or click the percentage boxes to jump by 10) and only products whose discount is inside that range stay visible. Products without a sale count as 0 %.

- Works on lists that load while you scroll and on pages that re-render themselves.
- Uses the **biggest** discount it can find on a card (crossed-out price, printed percent, multi-buy, member or code prices on Alza).
- Light and dark mode (follows your browser, remembers your choice).
- The range survives reloads and navigation in the same tab; closing the panel resets everything.
- No tracking, no network requests, no account. See [PRIVACY.md](PRIVACY.md).

**Supported shops:** Rohlík group (rohlik.cz, kifli.hu, gurkerl.at, knuspr.de, sezamo.ro, sezamo.it), Košík (kosik.cz), Alza (alza.cz, .sk, .hu, .de, .at). More are planned.

## Install

Store links will be added here once the extension is published. Until then, install from source:

- **Chrome / Edge / other Chromium** (Edge uses the same build as Chrome): run `node build.mjs`, open `chrome://extensions`, enable *Developer mode*, click *Load unpacked* and pick `dist/chrome`.
- **Firefox:** run `node build.mjs`, open `about:debugging#/runtime/this-firefox`, click *Load Temporary Add-on* and pick `dist/firefox/manifest.json`.

(Node.js 18+ is the only requirement, there is nothing to `npm install`.)

## How it works

```
src/
  background.js      toolbar button click -> sends "toggle" message to the page
  core.js            the panel (Shadow DOM), range state, filtering, MutationObserver
  sites/common.js    shared helpers: price parsing, percent maths, "which element to hide"
  sites/rohlik.js    adapter: how to find product cards + their discount on Rohlík shops
  sites/kosik.js     adapter for Košík
  sites/alza.js      adapter for Alza
  icons/             16/32/48/128 px icons
manifests/           chrome.json and firefox.json (the only differences between browsers)
build.mjs            copies src + manifest into dist/<browser> and zips them
docs/                the one-page website (GitHub Pages)
store/               ready-to-paste texts for the store listings
```

1. Content scripts are injected only on the shop domains listed in the manifest.
2. `core.js` picks the **adapter** whose `matches(hostname)` fits the current site. An adapter knows three things: the CSS selector of a product card, which element to hide (the grid cell), and `getSalePercent(card)`.
3. When the range is not 0–100, every card is checked and cards outside the range get a `data-onlysale-hidden` attribute; one injected `<style>` rule hides them. Cards that become visible again lose the attribute, so nothing on the page is ever changed or deleted.
4. A `MutationObserver` re-runs the filter (debounced) when the page adds or changes products.
5. The panel lives in a Shadow DOM attached to `<html>`, so the shop's CSS cannot affect it and the shop cannot wipe it.

### Adding a new shop

1. Copy `src/sites/kosik.js` to `src/sites/yourshop.js` and change the hostname regex, `productSelector` and `getSalePercent`.
2. Add the file to `content_scripts.js` (before `core.js`) and the domain to `matches` in **both** manifests (and `host_permissions` in `manifests/firefox.json`).
3. Run `node build.mjs`, load the extension and test on lists, search, carousels and infinite scroll.

## Build & release

`node build.mjs` creates `dist/onlysale-chrome-<version>.zip` and `dist/onlysale-firefox-<version>.zip`. Change the version in **both** manifests. Store listing texts: [store/STORE-LISTING.md](store/STORE-LISTING.md).

## Contributing

Issues and pull requests are welcome, especially for new shops or when a shop changes its page and a sale is no longer detected. Please keep the code simple: plain JavaScript, no frameworks, no build tooling.

## License

[MIT](LICENSE) © RihaLabs. The names "OnlySale" and "RihaLabs" and the logos are not covered by the MIT licence's grant to use them as your own brand. Shop names mentioned belong to their owners; OnlySale is not affiliated with them.
