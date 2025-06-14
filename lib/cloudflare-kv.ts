/* eslint-disable @typescript-eslint/no-unused-vars */
// Types for Cloudflare KV in the edge runtime


// Simplified version without edge runtime dependencies
export async function getFromKV(key: string): Promise<string | null> {
  // This will be handled by the Cloudflare Worker in production
  // For now, return null to always fetch from API
  return null
}

export async function putToKV(key: string, value: string, ttl = 86400): Promise<void> {
  // This will be handled by the Cloudflare Worker in production
  // For now, this is a no-op
  return
}
