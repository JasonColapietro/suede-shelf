import { z } from "zod";
import { runShopper } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/limit";
import { NotConfiguredError, getAnthropic, shopDeps } from "@/lib/runtime";

export const maxDuration = 60;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "Conversation must start and end with the shopper."),
});

export async function POST(request: Request, ctx: RouteContext<"/api/stores/[id]/shop">) {
  const { id } = await ctx.params;
  if (!(await allow(`shop:${clientIp(request)}`, 30, 3600)) || !(await allow(`shop-store:${id}`, 200, 86400))) {
    return Response.json({ error: "The demo shopper is busy. Try again later, or connect your own AI assistant to the MCP endpoint." }, { status: 429 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Send a message to the shopper." }, { status: 400 });

  const store = await getDb().getStore(id);
  if (!store) return Response.json({ error: "Store not found." }, { status: 404 });

  const anthropic = getAnthropic();
  if (!anthropic) return Response.json({ error: "The AI shopper is not configured on this deployment." }, { status: 503 });

  try {
    const reply = await runShopper(anthropic, store, shopDeps(request), parsed.data.messages);
    return Response.json(reply);
  } catch (error) {
    if (error instanceof NotConfiguredError) return Response.json({ error: error.message }, { status: 503 });
    console.error("shopper failed", error);
    return Response.json({ error: "The shopper hit a problem. Try again." }, { status: 502 });
  }
}
