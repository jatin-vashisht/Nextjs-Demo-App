"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { getCloudflareImageUrl } from "../lib/actions/image-actions"
import { getCachedImageUrl, setCachedImageUrl } from "../lib/image-cache"

interface OptimizedImageProps {
  imageId: string
  variant?: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
}

export function OptimizedImage({
  imageId,
  variant = "public",
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
}: OptimizedImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchImageUrl() {
      // Check cache first
      const cachedUrl = getCachedImageUrl(imageId, variant)
      if (cachedUrl) {
        setImageUrl(cachedUrl)
        setLoading(false)
        return
      }

      try {
        const url = await getCloudflareImageUrl(imageId, variant)
        if (url) {
          setImageUrl(url)
          setCachedImageUrl(imageId, variant, url)
        } else {
          setError(true)
        }
      } catch (err) {
        console.error("Error loading image:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchImageUrl()
  }, [imageId, variant])

  if (loading) {
    return <div className={`bg-gray-200 animate-pulse ${className}`} style={{ width, height }} />
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-300 flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-gray-500 text-sm">Image not found</span>
      </div>
    )
  }

  const imageProps = {
    src: imageUrl,
    alt,
    className,
    priority,
    ...(fill ? { fill: true } : { width, height }),
  }

  return <Image {...imageProps} />
}