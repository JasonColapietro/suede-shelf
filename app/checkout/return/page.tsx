import Link from "next/link";
import { Suspense } from "react";
import { Receipt } from "@/components/Receipt";
import { getDb } from "@/lib/db";
import { PayPalError } from "@/lib/paypal";
import { getPayPal, isPayPalConfigured } from "@/lib/runtime";
import { settleOrder } from "@/lib/shop";

async function Settle({ token }: { token: string | undefined }) {
  const paypal = getPayPal();
  if (!token || !isPayPalConfigured()) return <p className="text-ink-2">This link is missing its PayPal order. Return to the store and ask the assistant to check the order.</p>;

  const db = getDb();
  let state;
  try {
    state = await settleOrder({ db, paypal, baseUrl: "" }, token);
  } catch (error) {
    const reason = error instanceof PayPalError ? error.message : "PayPal did not respond.";
    return <p className="text-danger">We could not complete this payment: {reason} Nothing was charged that PayPal has not confirmed.</p>;
  }
  const record = await db.getOrder(token);
  if (!state || !record) return <p className="text-ink-2">We could not find that order.</p>;
  const store = await db.getStore(record.storeId);

  return (
    <div className="space-y-8">
      <h1 className="display text-[clamp(2rem,4.5vw,3rem)] leading-tight font-semibold">{state.paid ? "Payment complete." : "Payment not completed yet."}</h1>
      <Receipt
        title={store?.name ?? "Order"}
        meta={`Order ${state.orderId.slice(-6)}`}
        lines={[
          ...record.items.map((i) => ({ label: `${i.quantity} × ${i.name}` })),
          { label: "Total", value: `${state.total} ${state.currency}` },
          state.paid ? { label: "PAID via PayPal", value: state.captureId?.slice(-8), tone: "accent" as const } : { label: `PayPal status: ${state.status}`, tone: "warn" as const },
        ]}
        footer={state.paid ? "Your assistant can confirm this order with check_order." : "Approve the payment on PayPal to finish the order."}
      />
      {store ? (
        <Link href={`/s/${store.id}`} className="inline-block rounded-md bg-ink px-4 py-3 font-medium text-paper">
          Back to {store.name}
        </Link>
      ) : null}
    </div>
  );
}

export default function ReturnPage({ searchParams }: PageProps<"/checkout/return">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <Suspense fallback={<p className="text-ink-2">Confirming your payment with PayPal…</p>}>
        {searchParams.then((q) => (
          <Settle token={typeof q.token === "string" ? q.token : undefined} />
        ))}
      </Suspense>
    </main>
  );
}
