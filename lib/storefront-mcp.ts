// One MCP server per store. An AI shopping assistant can browse the catalog,
// build a cart and create a PayPal checkout; payment completes only when the
// human shopper approves it on PayPal.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CartError, MAX_LINES, MAX_QUANTITY } from "./cart";
import { PayPalError } from "./paypal";
import { createCheckout, searchProducts, settleOrder, type ShopDeps } from "./shop";
import type { Product, Store } from "./types";

const text = (t: string, structuredContent?: Record<string, unknown>): CallToolResult => ({
  content: [{ type: "text", text: t }],
  ...(structuredContent ? { structuredContent } : {}),
});

const fail = (error: unknown): CallToolResult => {
  const message =
    error instanceof CartError
      ? error.message
      : error instanceof PayPalError
        ? `PayPal could not create the checkout: ${error.message}`
        : "Something went wrong. Try again in a moment.";
  return { isError: true, content: [{ type: "text", text: message }] };
};

function line(p: Product, currency: string): string {
  return `- ${p.name} (id: ${p.id}): ${p.price} ${currency}${p.available ? "" : ", out of stock"}${p.description ? `. ${p.description}` : ""}`;
}

const productShape = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string(),
  currency: z.string(),
  available: z.boolean(),
  description: z.string().optional(),
  url: z.string().optional(),
  image: z.string().optional(),
});

const publicProduct = (p: Product, currency: string) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  currency,
  available: p.available,
  ...(p.description ? { description: p.description } : {}),
  ...(p.url ? { url: p.url } : {}),
  ...(p.image ? { image: p.image } : {}),
});

export function createStorefrontServer(store: Store, deps: ShopDeps, channel: "mcp" | "demo" = "mcp"): McpServer {
  const server = new McpServer(
    { name: `suede-shelf-${store.id}`, title: `${store.name} on Suede Shelf`, version: "1.0.0" },
    {
      instructions:
        `You are shopping at ${store.name} (${store.sourceUrl}). Prices are in ${store.currency}. ` +
        "Use search_products to find items, then create_checkout with product ids and quantities. " +
        "create_checkout returns a PayPal link: give it to the shopper, because payment only happens after they approve it on PayPal. " +
        "Never claim an order is paid until check_order says paid is true.",
    },
  );

  server.registerTool(
    "search_products",
    {
      title: "Search products",
      description: `Search ${store.name}'s catalog. Returns product ids, names, prices in ${store.currency} and stock status. Leave query empty to browse.`,
      inputSchema: {
        query: z.string().max(200).optional().describe("Words to match against product names and descriptions."),
        max_price: z.number().positive().optional().describe(`Highest unit price to include, in ${store.currency}.`),
        include_out_of_stock: z.boolean().optional().describe("Include sold-out products. Default false."),
      },
      outputSchema: { products: z.array(productShape) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, max_price, include_out_of_stock }) => {
      const found = searchProducts(store, { query, maxPrice: max_price, inStockOnly: !include_out_of_stock });
      const products = found.map((p) => publicProduct(p, store.currency));
      if (found.length === 0) return text(`No products matched${query ? ` "${query}"` : ""}.`, { products });
      return text(`${found.length} product${found.length === 1 ? "" : "s"}:\n${found.map((p) => line(p, store.currency)).join("\n")}`, { products });
    },
  );

  server.registerTool(
    "create_checkout",
    {
      title: "Create PayPal checkout",
      description:
        "Create a PayPal checkout for a cart. Prices come from the store catalog. Returns a PayPal approval link that the shopper " +
        "must open to review and pay. Nothing is charged until they approve.",
      inputSchema: {
        items: z
          .array(
            z.object({
              product_id: z.string().describe("Product id from search_products."),
              quantity: z.number().int().min(1).max(MAX_QUANTITY),
            }),
          )
          .min(1)
          .max(MAX_LINES),
      },
      outputSchema: {
        order_id: z.string(),
        approval_url: z.string(),
        total: z.string(),
        currency: z.string(),
        items: z.array(z.object({ name: z.string(), quantity: z.number(), unit_price: z.string() })),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ items }) => {
      try {
        const checkout = await createCheckout(
          deps,
          store,
          items.map((i) => ({ productId: i.product_id, quantity: i.quantity })),
          channel,
        );
        const { cart } = checkout;
        const summary = cart.lines.map((l) => `${l.quantity} × ${l.name} at ${l.unitPrice}`).join(", ");
        return text(
          `Checkout ready: ${summary}. Total ${cart.total} ${cart.currency}. ` +
            `Ask the shopper to approve payment on PayPal: ${checkout.approvalUrl} (order ${checkout.orderId}).`,
          {
            order_id: checkout.orderId,
            approval_url: checkout.approvalUrl,
            total: cart.total,
            currency: cart.currency,
            items: cart.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit_price: l.unitPrice })),
          },
        );
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "check_order",
    {
      title: "Check order status",
      description: "Check whether the shopper has approved and paid a checkout. Completes the payment once PayPal reports it approved.",
      inputSchema: { order_id: z.string().max(64).describe("Order id returned by create_checkout.") },
      outputSchema: { order_id: z.string(), status: z.string(), paid: z.boolean(), total: z.string(), currency: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ order_id }) => {
      try {
        const state = await settleOrder(deps, order_id, store.id);
        if (!state) return { isError: true, content: [{ type: "text", text: `No order ${order_id} at ${store.name}.` }] };
        const message = state.paid
          ? `Paid: ${state.total} ${state.currency}, order ${state.orderId}.`
          : `Not paid yet (PayPal status ${state.status}). The shopper still needs to approve it on PayPal.`;
        return text(message, { order_id: state.orderId, status: state.status, paid: state.paid, total: state.total, currency: state.currency });
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}
