import { CreateStoreForm } from "@/components/CreateStoreForm";
import { Receipt } from "@/components/Receipt";

const steps = [
  ["Paste your store address", "Shelf reads your catalog from Shopify, from schema.org product markup, or with Claude when a page has neither."],
  ["Name the PayPal account that gets paid", "Every order an assistant creates routes payment to that account. You keep your existing checkout too."],
  ["Hand the storefront to any AI assistant", "Claude, ChatGPT and any MCP client connect to one link. They search, build a cart and send your customer a PayPal approval link."],
];

const guarantees = [
  ["Prices come from your catalog", "Assistants choose products and quantities. Totals are computed on the server from your listed prices."],
  ["Customers approve every payment", "An assistant can prepare an order. Money moves only after the customer reviews it and pays on PayPal."],
  ["Merchant-friendly limits", "Out-of-stock items are refused, quantities are capped per order, and every order lands in your PayPal account."],
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div className="min-w-0 space-y-6">
          <p className="font-mono text-sm text-ink-2">Agent checkout for independent stores · PayPal</p>
          <h1 className="display text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.03] font-semibold">
            AI assistants already recommend stores. Let them <span className="text-accent">check out</span> at yours.
          </h1>
          <p className="max-w-xl text-lg text-ink-2">
            Suede Shelf turns your product pages into a storefront that Claude, ChatGPT and any MCP assistant can shop. The assistant builds the cart, your customer approves on PayPal, and the payment lands in your PayPal account.
          </p>
          <div className="rounded-lg border border-rule bg-paper-2 p-5 sm:p-6">
            <h2 className="mb-4 font-medium">Publish your agent storefront</h2>
            <CreateStoreForm />
          </div>
        </div>

        <div className="min-w-0 lg:pt-10">
          <p className="mb-3 font-mono text-xs text-ink-3">Example: an assistant shopping a plant store</p>
          <Receipt
            title="Agent receipt"
            meta="via MCP"
            lines={[
              { label: "› search_products “low-light plant”", tone: "muted" },
              { label: "  Golden Pothos", value: "12.00" },
              { label: "  ZZ Plant", value: "24.00" },
              { label: "› create_checkout", tone: "muted" },
              { label: "  2 × Golden Pothos", value: "24.00" },
              { label: "  Total", value: "24.00 USD" },
              { label: "› customer approves on PayPal", tone: "muted" },
              { label: "› check_order", tone: "muted" },
              { label: "  PAID", value: "captured", tone: "accent" },
            ]}
            footer="Prices from the store catalog. Payment approved by the customer."
          />
        </div>
      </section>

      <section className="border-t border-rule bg-paper-2">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="display mb-6 text-3xl font-semibold">How it works</h2>
            <ol className="space-y-6">
              {steps.map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="font-mono text-sm text-ink-3">0{i + 1}</span>
                  <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="display mb-6 text-3xl font-semibold">What keeps it safe</h2>
            <dl className="divide-y divide-rule border-y border-rule">
              {guarantees.map(([title, body]) => (
                <div key={title} className="py-4">
                  <dt className="font-medium">{title}</dt>
                  <dd className="text-ink-2">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
