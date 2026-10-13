// Fixed-window rate limits. Redis when configured so limits hold across
// serverless instances; otherwise per-process memory.

import { Redis } from "@upstash/redis";

const memory = new Map<string, { count: number; resetAt: number }>();
let redis: Redis | null | undefined;

function redisClient(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

/** Returns true when the call is within the limit. */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const r = redisClient();
  if (r) {
    const k = `limit:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const count = await r.incr(k);
    if (count === 1) await r.expire(k, windowSeconds);
    return count <= limit;
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
