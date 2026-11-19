/**
 * Cloud KV / Redis Persistence for Serverless Environments (Vercel / AWS Lambda)
 * Works out-of-the-box when UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN
 * or KV_REST_API_URL & KV_REST_API_TOKEN are configured.
 */

export function isKVConfigured(): boolean {
  return !!(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
}

export async function getFromKV<T>(key: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.result === null || data.result === undefined) return null;

    if (typeof data.result === 'string') {
      try {
        return JSON.parse(data.result) as T;
      } catch {
        return data.result as T;
      }
    }
    return data.result as T;
  } catch (err) {
    console.warn('[Cloud KV Read Error]:', err);
    return null;
  }
}

export async function saveToKV<T>(key: string, value: T): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  try {
    const serialized = JSON.stringify(value);
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serialized),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Cloud KV Save Error]:', err);
    return false;
  }
}
