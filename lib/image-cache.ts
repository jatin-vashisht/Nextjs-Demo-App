// Client-side image URL cache
const imageUrlCache = new Map<string, string>()

export function getCachedImageUrl(imageId: string, variant = "public"): string | null {
  const cacheKey = `${imageId}-${variant}`
  return imageUrlCache.get(cacheKey) || null
}

export function setCachedImageUrl(imageId: string, variant: string, url: string): void {
  const cacheKey = `${imageId}-${variant}`
  imageUrlCache.set(cacheKey, url)
}

export function clearImageCache(): void {
  imageUrlCache.clear()
}
