// The shopping operations an AI agent can perform against one store. Shared by
// the MCP storefront (external agents) and the on-page demo shopper.

import { orderBody, priceCart, type CartLine, type PricedCart } from "./cart";
import type { Db, OrderRecord } from "./db";
import { approvalUrl, type PayPalClient, type PayPalOrder } from "./paypal";
import type { Product, Store } from "./types";

export type ShopDeps = { db: Db; paypal: PayPalClient; baseUrl: string };

export type SearchOptions = { query?: string; maxPrice?: number; inStockOnly?: boolean; limit?: number };

export function searchProducts(store: Store, { query, maxPrice, inStockOnly = true, limit = 10 }: SearchOptions = {}): Product[] {
  const terms = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const scored = store.products
    .filter((p) => (inStockOnly ? p.available : true))
    .filter((p) => (maxPrice === undefined ? true : Number(p.price) <= maxPrice))
    .map((p) => {
      const haystack = `${p.name} ${p.description ?? ""} ${p.sku ?? ""}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (p.name.toLowerCase().includes(t) ? 3 : haystack.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || Number(a.p.price) - Number(b.p.price));
  return scored.slice(0, limit).map(({ p }) => p);
}

export type Checkout = { orderId: string; approvalUrl: string; cart: PricedCart };

export async function createCheckout(deps: ShopDeps, store: Store, cart: CartLine[], channel: OrderRecord["channel"]): Promise<Checkout> {
  const priced = priceCart(store, cart);
  const requestId = `shelf-${store.id}-${crypto.randomUUID()}`;
  const order = await deps.paypal.createOrder(
    orderBody(store, priced, {
      returnUrl: `${deps.baseUrl}/checkout/return`,
      cancelUrl: `${deps.baseUrl}/checkout/cancel?store=${encodeURIComponent(store.id)}`,
    }),
    requestId,
  );
  const url = approvalUrl(order);
  if (!url) throw new Error("PayPal did not return an approval link for this order.");

  await deps.db.saveOrder({
    orderId: order.id,
    storeId: store.id,
    status: order.status,
    total: priced.total,
    currency: priced.currency,
    items: priced.lines.map((l) => ({ name: l.name, quantity: l.quantity })),
    createdAt: new Date().toISOString(),
    channel,
  });
  return { orderId: order.id, approvalUrl: url, cart: priced };
}

export type OrderState = { orderId: string; status: string; paid: boolean; total: string; currency: string; captureId?: string };

function stateOf(order: PayPalOrder, record: OrderRecord): OrderState {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    orderId: order.id,
    status: order.status,
    paid: order.status === "COMPLETED" && capture?.status === "COMPLETED",
    total: record.total,
    currency: record.currency,
    captureId: capture?.id,
  };
}

/**
 * Reads an order and, once the buyer has approved it on PayPal, captures it.
 * Capture is idempotent per order, so the return page and an agent polling
 * check_order can both call this safely.
 */
export async function settleOrder(deps: ShopDeps, orderId: string, storeId?: string): Promise<OrderState | null> {
  const record = await deps.db.getOrder(orderId);
  if (!record || (storeId && record.storeId !== storeId)) return null;

  let order = await deps.paypal.getOrder(orderId);
  if (order.status === "APPROVED") {
    order = await deps.paypal.captureOrder(orderId, `shelf-capture-${orderId}`);
  }
  if (order.status !== record.status) await deps.db.saveOrder({ ...record, status: order.status });
  return stateOf(order, record);
}
