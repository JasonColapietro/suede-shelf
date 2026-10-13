// Store and order persistence. Upstash Redis (or Vercel KV) when configured,
// otherwise an in-process map for local development and tests.

import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { Store } from "./types";

export type OrderRecord = {
  orderId: string;
  storeId: string;
  status: string;
  total: string;
  currency: string;
  items: Array<{ name: string; quantity: number }>;
  createdAt: string;
  /** Who created the checkout: an external agent over MCP, or the on-page demo shopper. */
  channel: "mcp" | "demo";
};

export interface Db {
  saveStore(store: Store): Promise<void>;
  getStore(id: string): Promise<Store | null>;
  saveOrder(order: OrderRecord): Promise<void>;
  getOrder(orderId: string): Promise<OrderRecord | null>;
  listOrders(storeId: string, limit?: number): Promise<OrderRecord[]>;
}

const RETENTION_SECONDS = 60 * 60 * 24 * 90;

export function newStoreId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${slug || "store"}-${randomBytes(4).toString("hex")}`;
}

export function memoryDb(): Db {
  const stores = new Map<string, Store>();
  const orders = new Map<string, OrderRecord>();
  return {
    async saveStore(store) {
      stores.set(store.id, structuredClone(store));
    },
    async getStore(id) {
      const s = stores.get(id);
      return s ? structuredClone(s) : null;
    },
    async saveOrder(order) {
      orders.set(order.orderId, { ...order });
    },
    async getOrder(orderId) {
      const o = orders.get(orderId);
      return o ? { ...o } : null;
    },
    async listOrders(storeId, limit = 20) {
      return [...orders.values()]
        .filter((o) => o.storeId === storeId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}

export function redisDb(redis: Redis): Db {
  return {
    async saveStore(store) {
      await redis.set(`store:${store.id}`, store, { ex: RETENTION_SECONDS });
    },
    async getStore(id) {
      return (await redis.get<Store>(`store:${id}`)) ?? null;
    },
    async saveOrder(order) {
      await redis.set(`order:${order.orderId}`, order, { ex: RETENTION_SECONDS });
      await redis.zadd(`store:${order.storeId}:orders`, { score: Date.parse(order.createdAt), member: order.orderId });
      await redis.expire(`store:${order.storeId}:orders`, RETENTION_SECONDS);
    },
    async getOrder(orderId) {
      return (await redis.get<OrderRecord>(`order:${orderId}`)) ?? null;
    },
    async listOrders(storeId, limit = 20) {
      const ids = await redis.zrange<string[]>(`store:${storeId}:orders`, 0, limit - 1, { rev: true });
      if (ids.length === 0) return [];
      const rows = await redis.mget<(OrderRecord | null)[]>(...ids.map((id) => `order:${id}`));
      return rows.filter((r): r is OrderRecord => r !== null);
    },
  };
}

// Kept on globalThis: Next.js can load route handlers and pages as separate
// module instances, and the in-memory fallback must be one store for both.
const holder = globalThis as typeof globalThis & { __suedeShelfDb?: Db };

export function getDb(env: Record<string, string | undefined> = process.env): Db {
  if (holder.__suedeShelfDb) return holder.__suedeShelfDb;
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  holder.__suedeShelfDb = url && token ? redisDb(new Redis({ url, token })) : memoryDb();
  return holder.__suedeShelfDb;
}
