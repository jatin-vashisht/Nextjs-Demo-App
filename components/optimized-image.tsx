"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

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
      try {
        const response = await fetch(`/api/images/${imageId}?variant=${variant}`)

        if (response.ok) {
          interface ImageResponse {
            imageUrl: string;
          }
          
          const data = await response.json() as ImageResponse;
          setImageUrl(data.imageUrl)
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
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="Loading image..."
      />
    )
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`bg-gray-300 flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="Image not found"
      >
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
