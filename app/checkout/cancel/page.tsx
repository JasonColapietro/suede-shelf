import Link from "next/link";
import { Suspense } from "react";

export default function CancelPage({ searchParams }: PageProps<"/checkout/cancel">) {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-14 sm:px-6">
      <h1 className="display text-[clamp(2rem,4.5vw,3rem)] leading-tight font-semibold">Checkout cancelled. Nothing was charged.</h1>
      <p className="text-ink-2">Ask the assistant to create a new checkout whenever you are ready.</p>
      <Suspense fallback={null}>
        {searchParams.then((q) =>
          typeof q.store === "string" && /^[a-z0-9-]{1,64}$/.test(q.store) ? (
            <Link href={`/s/${q.store}`} className="inline-block rounded-md bg-ink px-4 py-3 font-medium text-paper">
              Back to the store
            </Link>
          ) : null,
        )}
      </Suspense>
    </main>
  );
}
