"use client";

import { useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; approvalUrl?: string; orderId?: string };

export function ShopperChat({ storeId, storeName, suggestions }: { storeId: string; storeName: string; suggestions: string[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    const next: Turn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setDraft("");
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/shop`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20).map(({ role, content }) => ({ role, content })) }),
      });
      const body = (await res.json()) as { text?: string; approvalUrl?: string; orderId?: string; error?: string };
      if (!res.ok || !body.text) throw new Error(body.error ?? "The shopper hit a problem. Try again.");
      setTurns([...next, { role: "assistant", content: body.text, approvalUrl: body.approvalUrl, orderId: body.orderId }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The shopper hit a problem. Try again.");
      setTurns(next.slice(0, -1));
      setDraft(message);
    } finally {
      setPending(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }

  const lastCheckout = [...turns].reverse().find((t) => t.approvalUrl);

  return (
    <div className="flex flex-col rounded-lg border border-rule bg-card">
      <div className="max-h-[28rem] min-h-56 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">Ask the assistant to shop {storeName} for you. It searches the catalog, builds a cart, and hands you a PayPal link to approve.</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-rule px-3 py-1.5 text-left text-sm hover:bg-paper-2">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${turn.role === "user" ? "bg-ink text-paper" : "bg-paper-2"}`}>
              {turn.content}
              {turn.approvalUrl ? (
                <a
                  href={turn.approvalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block rounded-md bg-accent px-3 py-2 text-center font-medium text-accent-ink hover:opacity-90"
                >
                  Review and pay on PayPal
                </a>
              ) : null}
            </div>
          </div>
        ))}
        {pending ? <p className="text-sm text-ink-3">The assistant is shopping…</p> : null}
        <div ref={endRef} />
      </div>
      {lastCheckout && !pending ? (
        <div className="border-t border-rule px-4 py-2">
          <button type="button" onClick={() => send("I've approved the payment on PayPal. Is the order paid?")} className="text-sm font-medium text-accent underline underline-offset-4">
            I approved it on PayPal: confirm the order
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="border-t border-rule px-4 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <form
        className="flex gap-2 border-t border-rule p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="shopper-input" className="sr-only">
          Message the shopping assistant
        </label>
        <input
          id="shopper-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Two of your best sellers under $40"
          className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-3 py-2 text-base"
        />
        <button type="submit" disabled={pending || !draft.trim()} className="rounded-md bg-ink px-4 py-2 font-medium text-paper disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
