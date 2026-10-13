// OnlySale – adapter for the Rohlik group shops:
// rohlik.cz, kifli.hu, gurkerl.at, knuspr.de, sezamo.ro, sezamo.it
//
// An adapter tells the core:
//   matches(hostname)      – is this my website?
//   productSelector        – CSS selector that finds every product card
//   getCell(card)          – the element to hide (the whole grid/carousel cell)
//   getSalePercent(card)   – the biggest discount we can find for the card (0 = no sale)

(() => {
  const OnlySale = (globalThis.OnlySale = globalThis.OnlySale || { adapters: [] });
  const { parseMoney, firstPriceIn, printedPercent, percentOff, findCell } = OnlySale;

  const HOSTS = /(^|\.)(rohlik\.cz|kifli\.hu|gurkerl\.at|knuspr\.de|sezamo\.(ro|it))$/;

  OnlySale.adapters.push({
    name: "rohlik",
    matches: (hostname) => HOSTS.test(hostname),
    productSelector: "[data-maia-product-id]",
    getCell: findCell,

    getSalePercent(card) {
      const badges = [...card.querySelectorAll('[data-test="productCard-body-badge"]')].map(
        (b) => b.textContent.replace(/\u00a0/g, " ")
      );
      const priceMeta = card.querySelector('meta[itemprop="price"]');
      const price = priceMeta ? Number(priceMeta.content) : NaN;
      let best = 0;

      // 1) Discount printed in a badge: "-33 % do 12. 10.", "-24 % Pro Rohlíček", "-11 % od 2 ks" ...
      for (const text of badges) best = Math.max(best, printedPercent(text));

      // 2) Crossed-out old price next to the price.
      const oldEl = card.querySelector('[data-test="productCard-body-price-sale"]');
      if (oldEl) best = Math.max(best, percentOff(parseMoney(oldEl.textContent), price));

      // 3) Multi-buy price in a badge without a percent: "99,90 Kč od 2 ks" (price shown is the regular one).
      for (const text of badges) {
        if (text.includes("%")) continue;
        best = Math.max(best, percentOff(price, firstPriceIn(text)));
      }

      return best;
    },
  });
})();
