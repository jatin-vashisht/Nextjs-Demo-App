/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

interface CloudflareImageResponse {
  result: {
    id: string
    filename: string
    uploaded: string
    requireSignedURLs: boolean
    variants: string[]
  }
  success: boolean
  errors: any[]
  messages: any[]
}

export async function getCloudflareImageUrl(imageId: string, variant = "public"): Promise<string | null> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const imageHash = process.env.CLOUDFLARE_IMAGE_HASH

  if (!apiToken || !accountId || !imageHash) {
    console.error("Missing Cloudflare credentials")
    return null
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      // Cache for 1 hour
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      console.error(`Cloudflare API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data: CloudflareImageResponse = await response.json()

    if (!data.success) {
      console.error("Cloudflare API returned error:", data.errors)
      return null
    }

    // Construct the image delivery URL using the hash from environment
    return `https://imagedelivery.net/${imageHash}/${imageId}/${variant}`
  } catch (error) {
    console.error("Error fetching Cloudflare image:", error)
    return null
  }
}

// Batch fetch multiple images for better performance
export async function getMultipleCloudflareImageUrls(
  imageIds: Array<{ id: string; variant?: string }>,
): Promise<Record<string, string | null>> {
  const results = await Promise.allSettled(
    imageIds.map(({ id, variant = "public" }) => getCloudflareImageUrl(id, variant).then((url) => ({ id, url }))),
  )

  return results.reduce(
    (acc, result) => {
      if (result.status === "fulfilled") {
        acc[result.value.id] = result.value.url
      }
      return acc
    },
    {} as Record<string, string | null>,
  )
}
