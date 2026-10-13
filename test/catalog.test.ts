import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeStoreUrl, parseJsonLd, parseShopify, readCatalog, toPrice } from "../lib/catalog";
import type { FetchResult } from "../lib/safe-fetch";

const page = (text: string, finalUrl = "https://shop.test/", ok = true): FetchResult => ({ ok, status: ok ? 200 : 404, text, finalUrl });

const JSON_LD_PAGE = `<html><head><title>Fern &amp; Co | Plants</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"WebSite","name":"Fern & Co"},
  {"@type":"Product","name":"Monstera &amp; Pot","description":"<p>A big leafy plant.</p>","sku":"M-1","url":"/p/monstera",
   "image":["https://cdn.test/m.jpg"],"offers":{"@type":"Offer","price":"39.5","priceCurrency":"USD","availability":"https://schema.org/InStock"}},
  {"@type":"Product","name":"Fiddle Leaf","offers":[{"@type":"Offer","price":"55","priceCurrency":"EUR"}]},
  {"@type":"Product","name":"Snake Plant","offers":{"@type":"AggregateOffer","lowPrice":18,"priceCurrency":"USD","availability":"OutOfStock"}}
]}</script>
<script type="application/ld+json">{ not json </script></head><body>Shop plants</body></html>`;

test("toPrice normalises to two decimals and rejects non-positive values", () => {
  assert.equal(toPrice("39.5"), "39.50");
  assert.equal(toPrice("$1,299.00"), "1299.00");
  assert.equal(toPrice(0), null);
  assert.equal(toPrice("free"), null);
});

test("normalizeStoreUrl adds https and drops the fragment", () => {
  assert.equal(normalizeStoreUrl(" shop.test/plants#top "), "https://shop.test/plants");
  assert.equal(normalizeStoreUrl("http://shop.test"), "http://shop.test/");
});

test("parseJsonLd reads products in the store currency from @graph", () => {
  const products = parseJsonLd(JSON_LD_PAGE, "https://shop.test/", "USD");
  assert.deepEqual(
    products.map((p) => [p.name, p.price, p.available]),
    [
      ["Monstera & Pot", "39.50", true],
      ["Snake Plant", "18.00", false],
    ],
  );
  const [monstera] = products;
  assert.equal(monstera.url, "https://shop.test/p/monstera");
  assert.equal(monstera.image, "https://cdn.test/m.jpg");
  assert.equal(monstera.description, "A big leafy plant.");
  assert.equal(monstera.sku, "M-1");
});

test("parseJsonLd skips offers in another currency", () => {
  assert.deepEqual(parseJsonLd(JSON_LD_PAGE, "https://shop.test/", "EUR").map((p) => p.name), ["Fiddle Leaf"]);
});

test("parseShopify makes each size or colour its own buyable item", () => {
  const products = parseShopify(
    {
      products: [
        {
          id: 7,
          title: "Tree Runner",
          handle: "tree-runner",
          variants: [
            { id: 71, title: "9 / Jet Black", price: "100.00", available: true },
            { id: 72, title: "10 / Jet Black", price: "100.00", available: false },
          ],
        },
      ],
    },
    "https://shop.test",
  );
  assert.deepEqual(
    products.map((p) => [p.name, p.available, p.url]),
    [
      ["Tree Runner (9 / Jet Black)", true, "https://shop.test/products/tree-runner?variant=71"],
      ["Tree Runner (10 / Jet Black)", false, "https://shop.test/products/tree-runner?variant=72"],
    ],
  );
  assert.notEqual(products[0].id, products[1].id);
});

test("parseShopify maps products.json and skips unpriced items", () => {
  const products = parseShopify(
    {
      products: [
        { id: 1, title: "Mug", handle: "mug", body_html: "<b>Ceramic</b>", images: [{ src: "https://cdn.test/mug.jpg" }], variants: [{ price: "12.00", sku: "MUG", available: true }] },
        { id: 2, title: "Gift card", variants: [] },
        { id: 3, title: "Poster", handle: "poster", variants: [{ price: "20", available: false }] },
      ],
    },
    "https://shop.test",
  );
  assert.deepEqual(
    products.map((p) => [p.name, p.price, p.available, p.url]),
    [
      ["Mug", "12.00", true, "https://shop.test/products/mug"],
      ["Poster", "20.00", false, "https://shop.test/products/poster"],
    ],
  );
  assert.equal(products[0].description, "Ceramic");
});

test("readCatalog prefers Shopify, then JSON-LD, then hands off to AI", async () => {
  const shopify = await readCatalog("shop.test", "USD", async (url) =>
    url.endsWith("/products.json?limit=50")
      ? page(JSON.stringify({ products: [{ id: 1, title: "Mug", handle: "mug", variants: [{ price: "12" }] }] }))
      : page(JSON_LD_PAGE),
  );
  assert.equal(shopify.source, "shopify");
  assert.equal(shopify.storeName, "Fern & Co");

  const jsonLd = await readCatalog("shop.test", "USD", async (url) => (url.includes("products.json") ? page("", "", false) : page(JSON_LD_PAGE)));
  assert.equal(jsonLd.source, "json-ld");
  assert.equal(jsonLd.products.length, 2);

  const ai = await readCatalog("shop.test", "USD", async (url) =>
    url.includes("products.json") ? page("<html>not json</html>") : page("<title>Bakery</title><body>Sourdough $8</body>"),
  );
  assert.equal(ai.source, "ai");
  assert.equal(ai.products.length, 0);
  assert.match(ai.pageText, /Sourdough \$8/);
});

test("readCatalog reports an unreachable store", async () => {
  await assert.rejects(readCatalog("gone.test", "USD", async () => page("", "", false)), /Could not reach gone\.test/);
});
