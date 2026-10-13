// OnlySale – helpers shared by all site adapters.
// Nothing here is specific to one shop or one language.

(() => {
  const OnlySale = (globalThis.OnlySale = globalThis.OnlySale || { adapters: [] });

  // "1 798,67 Kč" -> 1798.67    "1.299,-" -> 1299    "£1,299.00" -> 1299    "9 999,-" -> 9999
  OnlySale.parseMoney = function (text) {
    const t = String(text || "").replace(/[^\d.,]/g, "").replace(/[.,]+$/, "");
    if (!t) return NaN;
    const i = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
    if (i === -1) return Number(t);
    const tail = t.slice(i + 1);
    if (tail.length === 3) return Number(t.replace(/[.,]/g, "")); // 1.299 or 1,299 = thousands
    return Number(t.slice(0, i).replace(/[.,]/g, "") + "." + tail);
  };

  // First price with decimals inside a text: "Cena 107,90 Kč od 2 ks" -> 107.9.
  // Dates like "12. 10." or "12.10." are not mistaken for prices.
  OnlySale.firstPriceIn = function (text) {
    const m = String(text || "").match(/\d[\d\s\u00a0]*[.,]\d{2}(?![\d.,])/);
    return m ? OnlySale.parseMoney(m[0]) : NaN;
  };

  // Discount printed on the page: "-33 % do 12. 10.", "Zachraň mě -40 %", "-5 % s AlzaPlus+" -> 33, 40, 5
  OnlySale.printedPercent = function (text) {
    const m = String(text || "").match(/[-\u2212\u2013]\s*(\d{1,3})\s*%/);
    return m ? Math.min(100, Number(m[1])) : 0;
  };

  // How many percent cheaper is `price` than `reference`? (0 when it is not cheaper)
  OnlySale.percentOff = function (reference, price) {
    if (!(reference > 0) || !(price >= 0) || price >= reference) return 0;
    return Math.round(((reference - price) / reference) * 100);
  };

  // The element to hide for a product card: the grid cell or carousel slide around it.
  // We climb through wrappers that contain only this product, but we stop
  //  - when the parent is a grid/flex container (then we are already the cell),
  //  - when the parent holds more than one child,
  //  - after a few steps (so a lone product can never hide a whole page section).
  OnlySale.findCell = function (card) {
    let cell = card;
    for (let step = 0; step < 3; step++) {
      const parent = cell.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) break;
      if (/grid|flex/.test(getComputedStyle(parent).display)) break;
      if (parent.children.length !== 1) break;
      cell = parent;
    }
    return cell;
  };
})();
