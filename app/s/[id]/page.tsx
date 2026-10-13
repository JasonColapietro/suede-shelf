import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyField } from "@/components/CopyField";
import { Receipt } from "@/components/Receipt";
import { ShopperChat } from "@/components/ShopperChat";
import { getDb, type OrderRecord } from "@/lib/db";
import { publicOrigin } from "@/lib/origin";
import type { Store } from "@/lib/types";

export const metadata: Metadata = { title: "Agent storefront · Suede Shelf", robots: { index: false } };

const SOURCE_LABEL = { shopify: "Shopify catalog", "json-ld": "schema.org product markup", ai: "read by Claude from the page" } as const;

const STATUS: Record<string, { label: string; tone: "accent" | "warn" | "muted" }> = {
  COMPLETED: { label: "PAID", tone: "accent" },
  APPROVED: { label: "APPROVED", tone: "warn" },
  PAYER_ACTION_REQUIRED: { label: "AWAITING CUSTOMER", tone: "muted" },
  CREATED: { label: "AWAITING CUSTOMER", tone: "muted" },
  VOIDED: { label: "VOIDED", tone: "muted" },
};

function suggestionsFor(store: Store): string[] {
  const inStock = store.products.filter((p) => p.available);
  const cheapest = [...inStock].sort((a, b) => Number(a.price) - Number(b.price))[0];
  const out = ["What do you sell?"];
  if (cheapest) out.push(`Buy one ${cheapest.name}`);
  if (inStock.length > 1) out.push(`Gift ideas under ${Math.ceil(Number(cheapest?.price ?? 20) * 3)} ${store.currency}`);
  return out;
}

function OrderReceipts({ orders, currency }: { orders: OrderRecord[]; currency: string }) {
  if (orders.length === 0) {
    return <p className="rounded-lg border border-dashed border-rule p-4 text-sm text-ink-2">No agent orders yet. Ask the assistant to buy something and its receipt prints here.</p>;
  }
  return (
    <div className="space-y-6">
      {orders.map((o) => {
        const status = STATUS[o.status] ?? { label: o.status, tone: "muted" as const };
        return (
          <Receipt
            key={o.orderId}
            title={`Order ${o.orderId.slice(-6)}`}
            meta={o.channel === "mcp" ? "external agent" : "demo shopper"}
            lines={[
              ...o.items.map((i) => ({ label: `${i.quantity} × ${i.name}` })),
              { label: "Total", value: `${o.total} ${o.currency ?? currency}` },
              { label: status.label, value: new Date(o.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }), tone: status.tone },
            ]}
          />
        );
      })}
    </div>
  );
}

async function StoreConsole({ id }: { id: string }) {
  const db = getDb();
  const store = await db.getStore(id);
  if (!store) notFound();
  const [orders, origin] = await Promise.all([db.listOrders(store.id, 8), publicOrigin()]);
  const endpoint = `${origin}/api/mcp/${store.id}`;
  const inStock = store.products.filter((p) => p.available).length;

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <section className="space-y-3">
        <p className="font-mono text-sm text-ink-2">Agent storefront is live</p>
        <h1 className="display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight font-semibold">{store.name}</h1>
        <p className="text-ink-2">
          {store.products.length} products ({inStock} in stock) from{" "}
          <a href={store.sourceUrl} className="underline underline-offset-4" rel="noopener noreferrer" target="_blank">
            {new URL(store.sourceUrl).hostname}
          </a>
          , {SOURCE_LABEL[store.source]}. Payments go to {store.payeeEmail} in {store.currency}.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <h2 className="display text-2xl font-semibold">Connect an AI assistant</h2>
          <CopyField label="MCP storefront URL (Streamable HTTP)" value={endpoint} />
          <ol className="list-decimal space-y-2 pl-5 text-ink-2">
            <li>In Claude, open Settings, then Connectors, and add a custom connector with this URL.</li>
            <li>In any other MCP client, add it as a remote server. No sign-in is needed to browse or create a checkout.</li>
            <li>Ask the assistant to shop. It gets three tools: search_products, create_checkout and check_order.</li>
          </ol>
        </div>
        <div className="min-w-0 space-y-4">
          <h2 className="display text-2xl font-semibold">Try it here</h2>
          <ShopperChat storeId={store.id} storeName={store.name} suggestions={suggestionsFor(store)} />
          <p className="text-sm text-ink-3">The demo assistant is Claude, connected to this same MCP storefront. Pay with a PayPal Sandbox buyer account.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <h2 className="display mb-4 text-2xl font-semibold">Catalog agents can buy from</h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {store.products.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.url ? (
                      <a href={p.url} className="hover:underline" rel="noopener noreferrer" target="_blank">
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                  </p>
                  {p.description ? <p className="line-clamp-1 text-sm text-ink-3">{p.description}</p> : null}
                </div>
                <p className="shrink-0 font-mono text-sm">
                  {p.available ? `${p.price} ${store.currency}` : <span className="text-ink-3">sold out</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h2 className="display mb-4 text-2xl font-semibold">Agent receipts</h2>
          <OrderReceipts orders={orders} currency={store.currency} />
        </div>
      </section>
    </main>
  );
}

export default function StorePage({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-ink-2 sm:px-6">Opening the storefront…</p>}>
      {params.then(({ id }) => (
        <StoreConsole id={id} />
      ))}
    </Suspense>
  );
}
