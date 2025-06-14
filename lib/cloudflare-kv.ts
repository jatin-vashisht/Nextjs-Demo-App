/* eslint-disable @typescript-eslint/no-explicit-any */
// Types for Cloudflare KV in the edge runtime

// Edge runtime compatible KV operations
export async function getFromKV(key: string): Promise<string | null> {
  try {
    // In edge runtime, access KV through the global binding
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      // Fallback for development
      return null
    }

    // This will be available in Cloudflare Workers environment
    const kv = (globalThis as any).IMAGE_CACHE as KVNamespace
    if (!kv) return null

    return await kv.get(key)
  } catch (error) {
    console.error("KV get error:", error)
    return null
  }
}

export async function putToKV(key: string, value: string, ttl = 86400): Promise<void> {
  try {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
      return
    }

    const kv = (globalThis as any).IMAGE_CACHE as KVNamespace
    if (!kv) return

    await kv.put(key, value, { expirationTtl: ttl })
  } catch (error) {
    console.error("KV put error:", error)
  }
}
