import { CreateStoreInput, StoreSetupError, createStore } from "@/lib/create-store";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/limit";
import { getAnthropic } from "@/lib/runtime";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await allow(`create:${clientIp(request)}`, 10, 3600))) {
    return Response.json({ error: "Too many stores created from this network. Try again in an hour." }, { status: 429 });
  }
  const parsed = CreateStoreInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter your store's web address and the PayPal email that should receive payments." }, { status: 400 });
  }
  try {
    const store = await createStore(parsed.data, { db: getDb(), anthropic: getAnthropic() });
    return Response.json({ id: store.id, name: store.name, products: store.products.length, source: store.source }, { status: 201 });
  } catch (error) {
    if (error instanceof StoreSetupError) return Response.json({ error: error.message }, { status: 422 });
    console.error("store setup failed", error);
    return Response.json({ error: "Something went wrong reading that store. Try again in a moment." }, { status: 500 });
  }
}
