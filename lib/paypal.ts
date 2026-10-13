// Minimal PayPal REST client: OAuth client-credentials, then Orders v2
// create, get and capture. Sandbox unless PAYPAL_ENV=live.

export class PayPalError extends Error {
  constructor(message: string, readonly status: number, readonly issue?: string) {
    super(message);
  }
}

export type PayPalOrder = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: Array<{ href: string; rel: string; method?: string }>;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    amount?: { currency_code: string; value: string };
    payments?: { captures?: Array<{ id: string; status: string; amount?: { currency_code: string; value: string } }> };
  }>;
  payer?: { name?: { given_name?: string }; email_address?: string };
};

export type PayPalConfig = { clientId: string; clientSecret: string; baseUrl: string };

export function paypalConfigFromEnv(env: Record<string, string | undefined> = process.env): PayPalConfig | null {
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const baseUrl = env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  return { clientId, clientSecret, baseUrl };
}

export function approvalUrl(order: PayPalOrder): string | undefined {
  return order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
}

export function createPayPalClient(config: PayPalConfig, fetchImpl: typeof fetch = fetch) {
  let token: { value: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    const res = await fetchImpl(`${config.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!res.ok || !body.access_token) throw new PayPalError("PayPal authentication failed.", res.status);
    token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 300) * 1000 };
    return token.value;
  }

  async function call<T>(method: string, path: string, body?: unknown, requestId?: string): Promise<T> {
    const res = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        "content-type": "application/json",
        prefer: "return=representation",
        ...(requestId ? { "paypal-request-id": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as T & { message?: string; details?: Array<{ issue?: string; description?: string }> };
    if (!res.ok) {
      const detail = json.details?.[0];
      throw new PayPalError(detail?.description ?? json.message ?? `PayPal returned ${res.status}.`, res.status, detail?.issue);
    }
    return json;
  }

  return {
    createOrder: (body: unknown, requestId: string) => call<PayPalOrder>("POST", "/v2/checkout/orders", body, requestId),
    getOrder: (id: string) => call<PayPalOrder>("GET", `/v2/checkout/orders/${encodeURIComponent(id)}`),
    captureOrder: (id: string, requestId: string) =>
      call<PayPalOrder>("POST", `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {}, requestId),
  };
}

export type PayPalClient = ReturnType<typeof createPayPalClient>;
