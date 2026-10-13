export type Product = {
  id: string;
  name: string;
  description?: string;
  /** Decimal string in the store currency, e.g. "24.00". */
  price: string;
  url?: string;
  image?: string;
  sku?: string;
  available: boolean;
};

export type CatalogSource = "shopify" | "json-ld" | "ai";

export type Store = {
  id: string;
  name: string;
  sourceUrl: string;
  /**
   * PayPal account that receives payment for this store's orders. When absent,
   * payment goes to the account that owns this deployment's PayPal app.
   */
  payeeEmail?: string;
  /** ISO 4217 code shared by every product; PayPal orders take one currency. */
  currency: string;
  source: CatalogSource;
  products: Product[];
  createdAt: string;
};
