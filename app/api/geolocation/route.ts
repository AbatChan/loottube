import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get client IP from headers
    const forwarded = request.headers.get('x-forwarded-for')
    let clientIP = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')

    // If localhost or no IP detected, let ipapi.co detect the server's public IP
    // This will work for localhost development - it detects YOUR actual location
    const isLocalhost = !clientIP || clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === '::ffff:127.0.0.1'

    const url = isLocalhost
      ? 'https://ipapi.co/json/'  // Auto-detect user's real IP
      : `https://ipapi.co/${clientIP}/json/`

    // Fetch geolocation data from ipapi.co
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lootube-App/1.0'
      }
    })

    if (!response.ok) {
      console.warn('[Geolocation API] Failed to fetch IP data:', response.status)
      return NextResponse.json({ country_code: null })
    }

    const data = await response.json()

    return NextResponse.json({
      country_code: data.country_code || null,
      country_name: data.country_name || null,
      ip: data.ip || null
    })
  } catch (error) {
    console.error('[Geolocation API] Error:', error)
    return NextResponse.json({ country_code: null })
  }
}
