import { type NextRequest, NextResponse } from "next/server"

// Remove edge runtime - use Node.js runtime for OpenNext compatibility
// export const runtime = "edge"

export async function GET(request: NextRequest, context: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await context.params
  const { searchParams } = new URL(request.url)
  const variant = searchParams.get("variant") || "public"

  try {
    // Get environment variables
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const imageHash = process.env.CLOUDFLARE_IMAGE_HASH

    if (!apiToken || !accountId || !imageHash) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 })
    }

    // For now, we'll construct the URL directly since we can't use KV in Node.js runtime
    // In production, this will be handled by the Cloudflare Worker
    const imageUrl = `https://imagedelivery.net/${imageHash}/${imageId}/${variant}`

    // Verify the image exists by calling the API
    const apiResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!apiResponse.ok) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // Define the type for Cloudflare API response
    interface CloudflareApiResponse {
      success: boolean;
      result?: Record<string, unknown>;
      errors?: Array<{ code: number; message: string }>;
    }

    const data = await apiResponse.json() as CloudflareApiResponse

    if (!data.success) {
      return NextResponse.json({ error: "API error" }, { status: 404 })
    }

    return NextResponse.json(
      {
        imageUrl,
        imageId,
        variant,
        source: "api",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    )
  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
