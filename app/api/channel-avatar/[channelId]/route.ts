import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'
const CACHE_MAX_AGE = 60 * 60 * 24 // 24 hours

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await context.params

  // Handle demo/local channels
  if (channelId === 'demo-channel' || channelId === 'your-channel' || channelId.startsWith('local-')) {
    // Create a simple PNG avatar instead of SVG to avoid redirect issues
    const canvas = `
      <svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">
        <defs>
          <style>
            .bg { fill: #e5e7eb; }
            .person { fill: #9ca3af; }
          </style>
        </defs>
        <circle cx="44" cy="44" r="44" class="bg"/>
        <circle cx="44" cy="35" r="12" class="person"/>
        <path d="M20 70c0-13.3 10.7-24 24-24s24 10.7 24 24" class="person"/>
      </svg>
    `.trim()

    const response = new NextResponse(canvas, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

    return response
  }

  // Always provide fallback avatar for any channel (whether API key exists or not)
  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">
      <defs>
        <style>
          .bg { fill: #e5e7eb; }
          .person { fill: #9ca3af; }
        </style>
      </defs>
      <circle cx="44" cy="44" r="44" class="bg"/>
      <circle cx="44" cy="35" r="12" class="person"/>
      <path d="M20 70c0-13.3 10.7-24 24-24s24 10.7 24 24" class="person"/>
    </svg>
  `.trim()

  if (!API_KEY) {
    return new NextResponse(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const response = await fetch(
      `${BASE_URL}/channels?part=snippet&id=${channelId}&key=${API_KEY}`,
      { next: { revalidate: CACHE_MAX_AGE } }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch channel data')
    }

    const data = await response.json()

    if (!data.items?.[0]?.snippet?.thumbnails?.default?.url) {
      throw new Error('No avatar found')
    }

    // Fetch the actual avatar image
    const avatarUrl = data.items[0].snippet.thumbnails.default.url
    const avatarResponse = await fetch(avatarUrl)

    if (!avatarResponse.ok) {
      throw new Error('Failed to fetch avatar image')
    }

    const avatarBlob = await avatarResponse.blob()

    // Return the image with caching headers
    return new NextResponse(avatarBlob, {
      headers: {
        'Content-Type': avatarResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
      },
    })
  } catch (error) {
    console.error('Error fetching channel avatar:', error)
    // Return fallback SVG instead of 404
    return new NextResponse(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
}