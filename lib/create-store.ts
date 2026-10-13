import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { extractCatalogWithClaude } from "./ai";
import { readCatalog } from "./catalog";
import { newStoreId, type Db } from "./db";
import type { FetchResult } from "./safe-fetch";
import type { Store } from "./types";

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

export const CreateStoreInput = z.object({
  url: z.string().trim().min(4).max(2048),
  payeeEmail: z.email().max(254),
  currency: z.enum(CURRENCIES).default("USD"),
});

export class StoreSetupError extends Error {}

export async function createStore(
  input: z.infer<typeof CreateStoreInput>,
  deps: { db: Db; anthropic: Anthropic | null; fetcher?: (url: string) => Promise<FetchResult> },
): Promise<Store> {
  let catalog;
  try {
    catalog = await readCatalog(input.url, input.currency, deps.fetcher);
  } catch (error) {
    throw new StoreSetupError(error instanceof Error ? error.message : "Could not read that store.");
  }

  let { products, source } = catalog;
  if (products.length === 0 && deps.anthropic) {
    products = await extractCatalogWithClaude(deps.anthropic, {
      storeName: catalog.storeName,
      pageUrl: catalog.finalUrl,
      pageText: catalog.pageText,
      currency: input.currency,
    });
    source = "ai";
  }
  if (products.length === 0) {
    throw new StoreSetupError(
      `No products with ${input.currency} prices found at ${new URL(catalog.finalUrl).hostname}. Try your shop or collection page.`,
    );
  }

  const store: Store = {
    id: newStoreId(catalog.storeName),
    name: catalog.storeName,
    sourceUrl: catalog.finalUrl,
    payeeEmail: input.payeeEmail.toLowerCase(),
    currency: input.currency,
    source,
    products,
    createdAt: new Date().toISOString(),
  };
  await deps.db.saveStore(store);
  return store;
}
