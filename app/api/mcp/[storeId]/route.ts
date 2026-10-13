// The public MCP storefront: https://<host>/api/mcp/<storeId>
// Streamable HTTP, stateless, JSON responses.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/limit";
import { NotConfiguredError, shopDeps } from "@/lib/runtime";
import { createStorefrontServer } from "@/lib/storefront-mcp";

export const maxDuration = 30;

function rpcError(status: number, message: string) {
  return Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status });
}

async function handle(request: Request, ctx: RouteContext<"/api/mcp/[storeId]">) {
  // Browsers send Origin; agent clients don't. Refuse cross-site browser calls (DNS-rebinding guard).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return rpcError(403, "Origin not allowed.");
  if (!(await allow(`mcp:${clientIp(request)}`, 120, 60))) return rpcError(429, "Too many requests. Slow down.");

  const { storeId } = await ctx.params;
  const store = await getDb().getStore(storeId);
  if (!store) return rpcError(404, `No store ${storeId}.`);

  let deps;
  try {
    deps = shopDeps(request);
  } catch (error) {
    if (error instanceof NotConfiguredError) return rpcError(503, error.message);
    throw error;
  }

  const server = createStorefrontServer(store, deps);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
