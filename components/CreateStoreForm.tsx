"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

export function CreateStoreForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: form.get("url"), payeeEmail: form.get("payeeEmail"), currency: form.get("currency") }),
      });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? "Something went wrong. Try again.");
      router.push(`/s/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPending(false);
    }
  }

  const field = "w-full rounded-md border border-rule bg-card px-3 py-2.5 text-base text-ink placeholder:text-ink-3 focus:border-ink-2";

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-describedby={error ? "create-error" : undefined}>
      <div className="space-y-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          Store web address
        </label>
        <input id="url" name="url" required inputMode="url" autoComplete="url" placeholder="yourshop.com/collections/all" className={field} />
        <p className="text-sm text-ink-3">A page that lists your products. Shopify stores and pages with product markup read instantly.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <div className="space-y-1.5">
          <label htmlFor="payeeEmail" className="text-sm font-medium">
            PayPal email that receives payments <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id="payeeEmail" name="payeeEmail" type="email" autoComplete="email" placeholder="you@business.example.com" className={field} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="currency" className="text-sm font-medium">
            Currency
          </label>
          <select id="currency" name="currency" defaultValue="USD" className={field}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-ink-3">This deployment runs on PayPal Sandbox. Enter a sandbox business email to receive test payments there, or leave it blank to use the demo merchant account.</p>
      {error ? (
        <p id="create-error" role="alert" className="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-ink px-4 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Reading your catalog…" : "Publish my agent storefront"}
      </button>
    </form>
  );
}
