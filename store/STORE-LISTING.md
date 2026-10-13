# Store listing texts (copy & paste)

**Name:** OnlySale
**Category:** Shopping (Chrome) / Shopping (Firefox)
**Language:** English (optionally add Czech)

## Short description (Chrome limit 132 chars / Firefox summary limit 250)
Hide everything that is not on sale. Choose a discount range and see only the products inside it on supported online shops.

## Detailed description
OnlySale hides everything that is not on sale, so you can browse only the deals you care about.

Open the panel with the toolbar button, then drag the two handles or click the percentage boxes to set a range, for example "30 % to 100 %". Only products with a discount inside that range stay on the page. Products without a sale count as 0 %.

• Works with endless scrolling and pages that reload their content
• Uses the biggest discount found on each product (old price, printed percent, multi-buy, member and code prices)
• Light and dark mode
• Free, open source, no tracking, no data collected

It works on a selected set of online shops, and more are being added. The current list is on the project page.

Source code: https://github.com/RihaLabs/OnlySale
Website: https://rihalabs.github.io/onlysale/

## Single purpose (Chrome "Privacy" tab)
Filter the products shown on supported shopping websites by their discount percentage.

## Permission justifications
- **storage:** saves the user's light/dark mode choice on their device.
- **Host access (shop domains):** the content script must read the product cards and discounts on those shop pages to hide the ones outside the chosen range. It is not active on any other site.
- Remote code: **No**. Data collected: **none** (tick nothing in the data-usage list; certify the three disclosures).

## Screenshots (Chrome: 1280×800, 1–5 images)
1. Panel open on a shop list, filter 30–100 %.  2. Same page unfiltered.  3. Dark mode.  4. Panel close-up.

## Notes for Firefox reviewers
No build step or minification: the uploaded zip contains the plain source. `node build.mjs` only copies `src/` and the right manifest. No network requests, no data collection (`data_collection_permissions: none`).

## Microsoft Edge Add-ons (free)
Register for free at Partner Center (Microsoft Edge program), upload the **same Chrome zip** (`onlysale-chrome-<version>.zip`), reuse the texts above, and submit for review. Updates go through review again.

## Ready-made screenshots
`store/screenshots/` holds two 1280×800 images (light and dark) that fit the Chrome and Edge size requirement. Better still: add one real screenshot of the panel on a shop page (crop or resize to 1280×800).

## Rule for all store texts
Do not list shop or brand names in any store text (name, summary, description, screenshots). Chrome treats that as keyword spam. Say "supported online shops" and point to the project page, where the list lives.
