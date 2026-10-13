// Reads a merchant's catalog from their public storefront, cheapest source first:
// 1. Shopify's public /products.json,
// 2. schema.org Product markup (JSON-LD) on the page,
// 3. otherwise the caller falls back to AI extraction (lib/ai-extract.ts).

import { createHash } from "node:crypto";
import { safeFetch, type FetchResult } from "./safe-fetch";
import type { CatalogSource, Product } from "./types";

/** Items an agent can buy; each Shopify variant (a size or colour) counts as one. */
export const MAX_PRODUCTS = 300;
const SHOPIFY_PRODUCT_LIMIT = 50;

export type CatalogResult = {
  storeName: string;
  source: CatalogSource;
  products: Product[];
  /** Plain text of the page, kept for the AI fallback when no structured catalog exists. */
  pageText: string;
  finalUrl: string;
};

type Fetcher = (url: string) => Promise<FetchResult>;

export function normalizeStoreUrl(input: string): string {
  const trimmed = input.trim();
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  url.hash = "";
  return url.toString();
}

export function productId(seed: string): string {
  return createHash("sha256").update(seed).digest("base64url").slice(0, 10);
}

export function toPrice(value: unknown): string | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function clip(text: string | undefined, max = 280): string | undefined {
  if (!text) return undefined;
  const plain = stripHtml(text);
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain || undefined;
}

function storeNameFrom(html: string, url: string): string {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const name = og ?? title?.split(/\s[|–—-]\s/)[0];
  return name ? decodeEntities(name).trim() : new URL(url).hostname.replace(/^www\./, "");
}

// ---------- Shopify ----------

type ShopifyProduct = {
  id?: number | string;
  title?: string;
  handle?: string;
  body_html?: string;
  images?: Array<{ src?: string }>;
  variants?: Array<{ id?: number | string; title?: string; price?: string; sku?: string; available?: boolean }>;
};

export function parseShopify(json: unknown, origin: string): Product[] {
  const list = (json as { products?: ShopifyProduct[] })?.products;
  if (!Array.isArray(list)) return [];
  const products: Product[] = [];
  for (const p of list) {
    if (!p.title) continue;
    const base = p.handle ? `${origin}/products/${p.handle}` : `${origin}#${p.id ?? p.title}`;
    const title = decodeEntities(p.title);
    const description = clip(p.body_html);
    const image = p.images?.[0]?.src;
    // A shopper buys a size and a colour, not a style: each variant is its own item.
    for (const variant of p.variants ?? []) {
      const price = toPrice(variant.price);
      if (!price) continue;
      const named = variant.title && variant.title !== "Default Title";
      const url = variant.id !== undefined && p.handle ? `${base}?variant=${variant.id}` : p.handle ? base : undefined;
      products.push({
        id: productId(named ? `${base}?variant=${variant.id ?? variant.title}` : base),
        name: named ? `${title} (${decodeEntities(variant.title!)})` : title,
        description,
        price,
        url,
        image,
        sku: variant.sku || undefined,
        available: variant.available !== false,
      });
    }
  }
  return products;
}

// ---------- JSON-LD ----------

type Node = Record<string, unknown>;

function typesOf(node: Node): string[] {
  const t = node["@type"];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string");
}

function collectProductNodes(value: unknown, out: Node[], depth = 0): void {
  if (depth > 6 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) collectProductNodes(v, out, depth + 1);
    return;
  }
  const node = value as Node;
  if (typesOf(node).includes("Product")) {
    out.push(node);
    return;
  }
  for (const key of ["@graph", "itemListElement", "item", "mainEntity", "hasVariant"]) {
    if (key in node) collectProductNodes(node[key], out, depth + 1);
  }
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object") return firstString((value as Node).url ?? (value as Node)["@id"]);
  return undefined;
}

export function parseJsonLd(html: string, pageUrl: string, currency: string): Product[] {
  const nodes: Node[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectProductNodes(JSON.parse(m[1].trim()), nodes);
    } catch {
      // Malformed blocks are common; skip them.
    }
  }

  const products: Product[] = [];
  for (const node of nodes) {
    const name = typeof node.name === "string" ? decodeEntities(node.name).trim() : "";
    const offers = (Array.isArray(node.offers) ? node.offers : [node.offers]).filter(Boolean) as Node[];
    const offer =
      offers.find((o) => String(o.priceCurrency ?? "").toUpperCase() === currency) ??
      (offers.length && !offers.some((o) => o.priceCurrency) ? offers[0] : undefined);
    const price = toPrice(offer?.price ?? offer?.lowPrice);
    if (!name || !offer || !price) continue;

    const url = firstString(node.url) ?? firstString(offer.url);
    const absolute = url ? new URL(url, pageUrl).toString() : undefined;
    products.push({
      id: productId(absolute ?? `${pageUrl}#${name}`),
      name,
      description: clip(typeof node.description === "string" ? node.description : undefined),
      price,
      url: absolute,
      image: firstString(node.image),
      sku: typeof node.sku === "string" ? node.sku : undefined,
      available: !/OutOfStock|SoldOut|Discontinued/i.test(String(offer.availability ?? "")),
    });
  }
  return products;
}

// ---------- Orchestration ----------

function dedupe(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, MAX_PRODUCTS);
}

export async function readCatalog(
  rawUrl: string,
  currency: string,
  fetcher: Fetcher = (url) => safeFetch(url),
): Promise<CatalogResult> {
  const url = normalizeStoreUrl(rawUrl);
  const page = await fetcher(url);
  if (!page.ok) throw new Error(`Could not reach ${new URL(url).hostname}. Check the address and try again.`);

  const origin = new URL(page.finalUrl).origin;
  const storeName = storeNameFrom(page.text, page.finalUrl);
  const pageText = stripHtml(page.text).slice(0, 20_000);
  const base = { storeName, pageText, finalUrl: page.finalUrl };

  const shopify = await fetcher(`${origin}/products.json?limit=${SHOPIFY_PRODUCT_LIMIT}`);
  if (shopify.ok) {
    try {
      const products = dedupe(parseShopify(JSON.parse(shopify.text), origin));
      if (products.length > 0) return { ...base, source: "shopify", products };
    } catch {
      // Not Shopify, or not JSON: fall through.
    }
  }

  const fromJsonLd = dedupe(parseJsonLd(page.text, page.finalUrl, currency));
  return { ...base, source: fromJsonLd.length > 0 ? "json-ld" : "ai", products: fromJsonLd };
}
