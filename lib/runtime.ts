// Wires the app to its environment: database, PayPal and Claude clients.

import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import { createPayPalClient, paypalConfigFromEnv, type PayPalClient } from "./paypal";
import type { ShopDeps } from "./shop";

let paypal: PayPalClient | null | undefined;

export function getPayPal(): PayPalClient | null {
  if (paypal === undefined) {
    const config = paypalConfigFromEnv();
    paypal = config ? createPayPalClient(config) : null;
  }
  return paypal;
}

export function getAnthropic(): Anthropic | null {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

export function baseUrlFor(request: Request): string {
  return process.env.PUBLIC_BASE_URL ?? new URL(request.url).origin;
}

export class NotConfiguredError extends Error {}

export function shopDeps(request: Request): ShopDeps {
  const pp = getPayPal();
  if (!pp) throw new NotConfiguredError("PayPal is not configured on this deployment.");
  return { db: getDb(), paypal: pp, baseUrl: baseUrlFor(request) };
}
