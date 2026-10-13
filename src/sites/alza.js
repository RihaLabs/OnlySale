// OnlySale – adapter for Alza (alza.cz, .sk, .hu, .de, .at)
//
// Alza shows several prices on one card, so we always compute the BIGGEST possible discount:
//   reference price = the highest "normal" price we can find (old crossed price,
//                     price without code / without membership, or price + "You save X")
//   best price      = the lowest price (shown price, price with a discount code, price with AlzaPlus+)
//   discount        = how much cheaper the best price is than the reference price
// The percent printed in the card header ("Zlevněno -3 %", "Slevový kód -5 %") is used too, if bigger.

(() => {
  const OnlySale = (globalThis.OnlySale = globalThis.OnlySale || { adapters: [] });
  const { parseMoney, printedPercent, percentOff, findCell } = OnlySale;

  const HOSTS = /(^|\.)alza\.(cz|sk|hu|de|at)$/;

  OnlySale.adapters.push({
    name: "alza",
    matches: (hostname) => HOSTS.test(hostname),

    // 1st: product lists (category, search, "Alza dny" ...)   2nd: new-style carousels (home page)
    productSelector: '.box.browsingitem, [data-slot="carousel-item"][data-testid="item"]',
    getCell: findCell,

    getSalePercent(card) {
      const priceBox = card.querySelector(".ads-pb");
      if (!priceBox) return 0;

      const price = parseMoney(card.querySelector(".ads-pb__price-value")?.textContent);
      if (!(price > 0)) return 0;

      let reference = price;
      let lowest = price;

      // The "original price" element is used in two ways:
      //  - old crossed price / "without code" / "without membership": it is the reference price itself
      //  - otherwise it says "You save 144,-": the reference price is the shown price + that amount
      const originalEl = card.querySelector(".ads-pb__original-price");
      const original = originalEl ? parseMoney(originalEl.textContent) : NaN;
      if (original > 0) {
        const isPrice =
          originalEl.classList.contains("ads-pb__original-price--strike") ||
          priceBox.classList.contains("ads-pb--code") ||
          priceBox.classList.contains("ads-pb--alza-plus");
        reference = Math.max(reference, isPrice ? original : price + original);
      }

      // Price after using the discount code / adding AlzaPlus+ (shown under the card).
      const coupon = parseMoney(card.querySelector(".coupon-block__price")?.textContent);
      if (coupon > 0 && coupon < lowest) lowest = coupon;

      let best = percentOff(reference, lowest);

      // Percent printed in the header, e.g. "Zlevněno -3 %", "Slevový kód -5 %", "-11 % s AlzaPlus+".
      const header = card.querySelector(".ads-pb__header");
      if (header) best = Math.max(best, printedPercent(header.textContent));

      return best;
    },
  });
})();
