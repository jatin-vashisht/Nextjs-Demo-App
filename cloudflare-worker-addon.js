// Additional Cloudflare Worker code to add KV caching
// This should be added to your existing OpenNext worker

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Handle image API requests with KV caching
    if (url.pathname.startsWith("/api/images/")) {
      const pathParts = url.pathname.split("/")
      const imageId = pathParts[pathParts.length - 1]
      const variant = url.searchParams.get("variant") || "public"
      const cacheKey = `${imageId}-${variant}`

      try {
        // Check KV cache first
        if (env.IMAGE_CACHE) {
          const cachedUrl = await env.IMAGE_CACHE.get(cacheKey)

          if (cachedUrl) {
            return new Response(
              JSON.stringify({
                imageUrl: cachedUrl,
                imageId,
                variant,
                source: "kv-cache",
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                  "CF-Cache-Status": "KV-HIT",
                },
              },
            )
          }
        }

        // If not in cache, let the request continue to Next.js
        const response = await fetch(request)

        // If successful, cache the result
        if (response.ok && env.IMAGE_CACHE) {
          const data = await response.clone().json()
          if (data.imageUrl) {
            ctx.waitUntil(
              env.IMAGE_CACHE.put(cacheKey, data.imageUrl, {
                expirationTtl: 86400, // 24 hours
              }),
            )
          }
        }

        return response
      } catch (error) {
        console.error("KV cache error:", error)
        // Fall back to normal request
        return fetch(request)
      }
    }

    // For all other requests, use the default OpenNext handler
    return fetch(request)
  },
}
