// OnlySale – adapter for Košík (kosik.cz)

(() => {
  const OnlySale = (globalThis.OnlySale = globalThis.OnlySale || { adapters: [] });
  const { parseMoney, firstPriceIn, printedPercent, percentOff, findCell } = OnlySale;

  const HOSTS = /(^|\.)kosik\.cz$/;

  // The price that is really shown on the card. For multi-buy offers ("107,90 od 2 ks")
  // it is lower than the regular price stored in data-cnstrc-item-price.
  function shownPrice(card) {
    const el = card.querySelector('[data-tid="pbox-price"] [aria-label]');
    const fromLabel = el ? firstPriceIn(el.getAttribute("aria-label")) : NaN;
    return fromLabel > 0 ? fromLabel : Number(card.dataset.cnstrcItemPrice);
  }

  OnlySale.adapters.push({
    name: "kosik",
    matches: (hostname) => HOSTS.test(hostname),
    productSelector: 'article[data-tid="product-box"]',
    getCell: findCell,

    getSalePercent(card) {
      const shown = shownPrice(card);
      let best = 0;

      // 1) Discount printed in a label: "-53 % do 13. 10.", "Zachraň mě -40 %" ...
      for (const el of card.querySelectorAll('[data-tid^="Feature"]:not([data-tid^="FeatureDelivery"])')) {
        best = Math.max(best, printedPercent(el.textContent));
      }

      // 2) Crossed-out old price.
      const oldEl = card.querySelector('[data-tid="product-box__crossed-price"]');
      if (oldEl) best = Math.max(best, percentOff(parseMoney(oldEl.textContent), shown));

      // 3) Multi-buy: the shown price is lower than the regular price.
      best = Math.max(best, percentOff(Number(card.dataset.cnstrcItemPrice), shown));

      return best;
    },
  });
})();
