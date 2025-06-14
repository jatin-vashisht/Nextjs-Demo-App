import { type NextRequest, NextResponse } from "next/server"
import { getFromKV, putToKV } from "@/lib/cloudflare-kv"

export const runtime = "edge"

export async function GET(request: NextRequest, { params }: { params: { imageId: string } }) {
  const { imageId } = params
  const { searchParams } = new URL(request.url)
  const variant = searchParams.get("variant") || "public"

  const cacheKey = `${imageId}-${variant}`

  try {
    // Check KV cache first
    const cachedUrl = await getFromKV(cacheKey)

    if (cachedUrl) {
      return NextResponse.json(
        {
          imageUrl: cachedUrl,
          imageId,
          variant,
          source: "kv-cache",
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            "CF-Cache-Status": "KV-HIT",
          },
        },
      )
    }

    // Fetch from Cloudflare Images API
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const imageHash = process.env.CLOUDFLARE_IMAGE_HASH

    if (!apiToken || !accountId || !imageHash) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 })
    }

    const apiResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!apiResponse.ok) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const data = await apiResponse.json()

    if (!data.success) {
      return NextResponse.json({ error: "API error" }, { status: 404 })
    }

    const imageUrl = `https://imagedelivery.net/${imageHash}/${imageId}/${variant}`

    // Cache in KV for 24 hours
    await putToKV(cacheKey, imageUrl, 86400)

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
          "CF-Cache-Status": "MISS",
        },
      },
    )
  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
