// Wires the app to its environment: database, PayPal and Claude clients.

import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import { PayPalError, createPayPalClient, paypalConfigFromEnv, type PayPalClient } from "./paypal";
import type { ShopDeps } from "./shop";

let paypal: PayPalClient | undefined;

/** Without credentials, browsing still works and payment calls fail with a clear message. */
const unconfiguredPayPal: PayPalClient = {
  createOrder: async () => {
    throw new PayPalError("PayPal is not configured on this deployment.", 503);
  },
  getOrder: async () => {
    throw new PayPalError("PayPal is not configured on this deployment.", 503);
  },
  captureOrder: async () => {
    throw new PayPalError("PayPal is not configured on this deployment.", 503);
  },
};

export function getPayPal(): PayPalClient {
  if (!paypal) {
    const config = paypalConfigFromEnv();
    paypal = config ? createPayPalClient(config) : unconfiguredPayPal;
  }
  return paypal;
}

export function isPayPalConfigured(): boolean {
  return paypalConfigFromEnv() !== null;
}

export function getAnthropic(): Anthropic | null {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

export function baseUrlFor(request: Request): string {
  return process.env.PUBLIC_BASE_URL ?? new URL(request.url).origin;
}

export function shopDeps(request: Request): ShopDeps {
  return { db: getDb(), paypal: getPayPal(), baseUrl: baseUrlFor(request) };
}
