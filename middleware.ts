import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Add cache headers for image API routes
  if (request.nextUrl.pathname.startsWith("/api/images/")) {
    const response = NextResponse.next()

    // Set cache headers for edge caching
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
    response.headers.set("CDN-Cache-Control", "public, s-maxage=86400")

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/images/:path*",
}
