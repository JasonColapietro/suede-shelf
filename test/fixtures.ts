import type { Store } from "../lib/types";

export const store: Store = {
  id: "fern-co",
  name: "Fern & Co",
  sourceUrl: "https://shop.test/",
  payeeEmail: "merchant@business.example.com",
  currency: "USD",
  source: "json-ld",
  createdAt: "2026-10-12T00:00:00.000Z",
  products: [
    { id: "monstera", name: "Monstera", description: "Big leafy plant", price: "39.50", sku: "M-1", available: true, url: "https://shop.test/p/monstera" },
    { id: "pothos", name: "Golden Pothos", description: "Trailing, easy care", price: "12.00", available: true },
    { id: "snake", name: "Snake Plant", price: "18.00", available: false },
  ],
};
