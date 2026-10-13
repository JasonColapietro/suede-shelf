// Fetches a merchant-supplied URL server-side without becoming an SSRF gadget:
// every hop, redirects included, is re-checked against the resolved IP, and
// bodies are capped. Ported from Suede Signal's audit engine.

import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 4 * 1024 * 1024;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SuedeShelf/1.0; +https://suedeai.ai)",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9",
};

function privateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return a >= 224;
}

function privateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (/^fe[89ab]/.test(lower) || /^f[cd]/.test(lower)) return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? privateIPv4(mapped[1]) : false;
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return privateIPv4(ip);
  if (net.isIPv6(ip)) return privateIPv6(ip);
  return true;
}

export type Resolver = (host: string) => Promise<string[]>;

const dnsResolver: Resolver = async (host) => (await lookup(host, { all: true })).map((a) => a.address);

async function assertPublicHost(hostname: string, resolve: Resolver): Promise<void> {
  const bare = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (bare === "localhost" || bare.endsWith(".localhost")) throw new Error("blocked host");
  const addresses = net.isIP(bare) ? [bare] : await resolve(bare);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("blocked host");
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BYTES) {
      out += decoder.decode(value.subarray(0, value.byteLength - (received - MAX_BYTES)));
      await reader.cancel().catch(() => {});
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

export type FetchResult = { ok: boolean; status: number; text: string; finalUrl: string };

export async function safeFetch(
  url: string,
  { fetchImpl = fetch, resolve = dnsResolver, timeoutMs = 10_000 }: { fetchImpl?: typeof fetch; resolve?: Resolver; timeoutMs?: number } = {},
): Promise<FetchResult> {
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const parsed = new URL(current);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") break;
      await assertPublicHost(parsed.hostname, resolve);
      const res = await fetchImpl(current, {
        headers: HEADERS,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      return { ok: res.ok, status: res.status, text: await readCapped(res), finalUrl: current };
    }
  } catch {
    // Blocked host, DNS failure, timeout or malformed URL: all read as unreachable.
  }
  return { ok: false, status: 0, text: "", finalUrl: current };
}
