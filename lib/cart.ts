// Turns an agent's cart (product ids and quantities only) into a PayPal order
// body. Prices always come from the stored catalog, never from the agent.

import type { Store } from "./types";

export const MAX_LINES = 20;
export const MAX_QUANTITY = 10;

export type CartLine = { productId: string; quantity: number };

export class CartError extends Error {}

export type PricedLine = { productId: string; name: string; sku?: string; unitPrice: string; quantity: number };

export type PricedCart = { currency: string; lines: PricedLine[]; total: string };

const cents = (price: string) => Math.round(Number(price) * 100);
const fromCents = (value: number) => (value / 100).toFixed(2);

export function priceCart(store: Store, cart: CartLine[]): PricedCart {
  if (cart.length === 0) throw new CartError("The cart is empty. Add at least one product.");
  if (cart.length > MAX_LINES) throw new CartError(`A cart can hold at most ${MAX_LINES} different products.`);

  const merged = new Map<string, number>();
  for (const { productId, quantity } of cart) {
    if (!Number.isInteger(quantity) || quantity < 1) throw new CartError(`Quantity for ${productId} must be a whole number of at least 1.`);
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  const lines: PricedLine[] = [];
  for (const [productId, quantity] of merged) {
    const product = store.products.find((p) => p.id === productId);
    if (!product) throw new CartError(`No product with id ${productId} in ${store.name}. Search the catalog for valid ids.`);
    if (!product.available) throw new CartError(`${product.name} is out of stock.`);
    if (quantity > MAX_QUANTITY) throw new CartError(`At most ${MAX_QUANTITY} of ${product.name} per order.`);
    lines.push({ productId, name: product.name, sku: product.sku, unitPrice: product.price, quantity });
  }

  const total = lines.reduce((sum, l) => sum + cents(l.unitPrice) * l.quantity, 0);
  return { currency: store.currency, lines, total: fromCents(total) };
}

export function orderBody(store: Store, cart: PricedCart, urls: { returnUrl: string; cancelUrl: string }) {
  const money = (value: string) => ({ currency_code: cart.currency, value });
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: store.id,
        custom_id: store.id,
        description: `Order from ${store.name} via Suede Shelf`.slice(0, 127),
        ...(store.payeeEmail ? { payee: { email_address: store.payeeEmail } } : {}),
        amount: { ...money(cart.total), breakdown: { item_total: money(cart.total) } },
        items: cart.lines.map((l) => ({
          name: l.name.slice(0, 127),
          quantity: String(l.quantity),
          unit_amount: money(l.unitPrice),
          ...(l.sku ? { sku: l.sku.slice(0, 127) } : {}),
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: store.name.slice(0, 127),
          user_action: "PAY_NOW",
          return_url: urls.returnUrl,
          cancel_url: urls.cancelUrl,
        },
      },
    },
  };
}
