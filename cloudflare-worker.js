// Cloudflare Worker for edge caching and image optimization
export default {
  async fetch(request, env, ctx) {
    // Only allow GET requests for security
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url)
    const cacheKey = new Request(url.toString(), request)
    const cache = caches.default

    // Check if we have a cached response
    let response = await cache.match(cacheKey)

    if (response) {
      // Add cache hit header
      response = new Response(response.body, response)
      response.headers.set("CF-Cache-Status", "HIT")
      return response
    }

    // Handle image requests
    if (url.pathname.startsWith("/api/images/")) {
      // Extract and validate imageId
      const imageId = url.pathname.split("/").pop()
      if (!imageId || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
        return new Response(
          JSON.stringify({ error: "Invalid image ID format" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        )
      }
      
      const variant = url.searchParams.get("variant") || "public"

      try {
        // Verify required environment variables
        if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_IMAGE_HASH || !env.CLOUDFLARE_API_TOKEN) {
          throw new Error("Missing required Cloudflare configuration")
        }

        // Check if KV namespace is available
        if (!env.IMAGE_CACHE) {
          throw new Error("IMAGE_CACHE KV namespace not available")
        }

        // Check KV storage first
        const cachedImageUrl = await env.IMAGE_CACHE.get(`${imageId}-${variant}`)

        if (cachedImageUrl) {
          response = new Response(
            JSON.stringify({
              imageUrl: cachedImageUrl,
              imageId,
              variant,
              source: "kv-cache",
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=3600",
                "CF-Cache-Status": "KV-HIT",
              },
            },
          )
        } else {
          // Fetch from Cloudflare Images API
          const apiResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
            {
              headers: {
                Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                "Content-Type": "application/json",
              },
            },
          )

          if (apiResponse.ok) {
            // Verify the image exists in Cloudflare Images
            const data = await apiResponse.json()
            if (!data.success) {
              return new Response(
                JSON.stringify({
                  error: "Image not found in Cloudflare Images",
                  details: data.errors || []
                }),
                {
                  status: 404,
                  headers: {
                    "Content-Type": "application/json",
                  },
                }
              )
            }
            
            const imageUrl = `https://imagedelivery.net/${env.CLOUDFLARE_IMAGE_HASH}/${imageId}/${variant}`

            // Store in KV with 24 hour expiration
            ctx.waitUntil(
              env.IMAGE_CACHE.put(`${imageId}-${variant}`, imageUrl, {
                expirationTtl: 86400,
              }),
            )

            response = new Response(
              JSON.stringify({
                imageUrl,
                imageId,
                variant,
                source: "api",
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "public, max-age=3600",
                  "CF-Cache-Status": "MISS",
                },
              },
            )
          } else {
            response = new Response(
              JSON.stringify({
                error: "Image not found",
              }),
              {
                status: 404,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )
          }
        }

        // Cache the response
        ctx.waitUntil(cache.put(cacheKey, response.clone()))
        return response
      } catch (error) {
        console.error("Worker error:", error);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            message: error.message || "Unknown error occurred",
            code: error.code || "UNKNOWN_ERROR"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          },
        )
      }
    }

    // For other requests, fetch from origin
    response = await fetch(request)

    // Cache successful responses
    if (response.status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()))
    }

    return response
  },
}
