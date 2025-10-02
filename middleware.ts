import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // Handle /@channelName URLs
  if (url.pathname.startsWith('/@')) {
    // Extract channel name (remove the @ prefix)
    const channelName = url.pathname.slice(2) // Remove '/@'

    // Skip if it's an empty channel name or contains invalid characters for routes
    if (!channelName || channelName.includes('.')) {
      return NextResponse.next()
    }

    // Rewrite to our actual route structure [channelName]
    url.pathname = `/${channelName}`

    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}