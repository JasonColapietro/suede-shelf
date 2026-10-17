import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { shopperSystem, type ChatTurn, type ShopperReply } from "./ai";
import { createStorefrontServer } from "./storefront-mcp";
import type { ShopDeps } from "./shop";
import type { Store } from "./types";

export const NEBIUS_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const NEBIUS_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const Completion = z.object({ choices: z.array(z.object({
  finish_reason: z.string(),
  message: z.object({ content: z.string().nullable().optional(), tool_calls: z.array(z.object({
    id: z.string().min(1), type: z.literal("function"),
    function: z.object({ name: z.string(), arguments: z.string() }),
  })).max(8).nullish() }),
})).min(1) });

export async function runNebiusShopper(
  config: { apiKey: string; model?: string; fetch?: typeof fetch },
  store: Store, deps: ShopDeps, history: ChatTurn[],
): Promise<ShopperReply> {
  const model = config.model ?? NEBIUS_MODEL;
  if (!/^nvidia\/nemotron/i.test(model)) throw new Error("Select an NVIDIA Nemotron model for the Nebius shopper.");
  const server = createStorefrontServer(store, deps, "demo");
  const client = new Client({ name: "suede-shelf-nebius", version: "1.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  let checkout: Pick<ShopperReply, "approvalUrl" | "orderId"> = {};
  const signal = AbortSignal.timeout(45000);
  try {
    await Promise.all([server.connect(a), client.connect(b)]);
    const { tools } = await client.listTools();
    const allowed = new Set(tools.map(t => t.name));
    const messages: Record<string, unknown>[] = [{ role: "system", content: shopperSystem(store) }, ...history];
    const seen = new Set<string>();
    let checkoutAttempted = false;
    for (let turn = 0; turn < 8; turn++) {
      signal.throwIfAborted();
      const response = await (config.fetch ?? fetch)(NEBIUS_URL, {
        method: "POST", signal,
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 4000,
          tools: tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
          tool_choice: "auto", parallel_tool_calls: false,
        }),
      });
      // Provider bodies can contain request data. Keep them out of logs/errors.
      if (!response.ok) throw new Error(`Nebius request failed (${response.status}).`);
      const choice = Completion.parse(await response.json()).choices[0];
      if (!["stop", "tool_calls"].includes(choice.finish_reason)) throw new Error("Nebius did not finish its response.");
      const message = choice.message;
      if (!message.tool_calls?.length) return { text: message.content?.trim() || "Please ask about a product in this store.", ...checkout };
      messages.push({ role: "assistant", ...message });
      for (const call of message.tool_calls) {
        let result: unknown;
        try {
          if (seen.has(call.id)) throw new Error("Repeated tool call.");
          seen.add(call.id);
          if (!allowed.has(call.function.name)) throw new Error("Unknown tool.");
          const args = z.record(z.string(), z.unknown()).parse(JSON.parse(call.function.arguments));
          if (call.function.name === "create_checkout") {
            if (checkoutAttempted) throw new Error("Checkout already attempted. Use the existing link or ask the shopper to retry.");
            checkoutAttempted = true;
          }
          const response = await client.callTool({ name: call.function.name, arguments: args });
          result = response;
          const data = response.structuredContent as { approval_url?: string; order_id?: string } | undefined;
          if (call.function.name === "create_checkout" && !response.isError && data?.approval_url) {
            checkout = { approvalUrl: data.approval_url, orderId: data.order_id };
          }
        } catch {
          result = { isError: true, content: [{ type: "text", text: "Tool call rejected. Check the tool schema; only one checkout attempt is allowed per reply." }] };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
    return { text: checkout.approvalUrl ? "Your checkout is ready. Review and approve it on PayPal; payment is not yet confirmed." : "Please narrow your request to a product or budget so I can finish helping.", ...checkout };
  } catch (error) {
    if (checkout.approvalUrl) return { text: "Your checkout is ready. Review and approve it on PayPal; payment is not yet confirmed.", ...checkout };
    throw error;
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
  }
}
