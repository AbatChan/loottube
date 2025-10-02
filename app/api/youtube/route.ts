import { NextResponse } from 'next/server'
import { getCachedValue, setCachedValue } from '@/lib/serverCache'
import { saveFallbackData, loadFallbackData, generateFallbackKey, cleanupOldFallbackData } from '@/lib/fallbackData'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

export const runtime = 'nodejs'

const buildMockVideos = () => {
  const items = Array.from({ length: 12 }).map((_, index) => ({
    id: `mock-video-${index + 1}`,
    snippet: {
      title: `Mock Video ${index + 1}`,
      description: 'Fallback video description. Configure YOUTUBE_API_KEY for live data.',
      thumbnails: {
        default: { url: '/placeholder.svg' },
        medium: { url: '/placeholder.svg' },
        high: { url: '/placeholder.svg' },
      },
      channelTitle: 'Demo Channel',
      channelId: 'demo-channel',
      publishedAt: new Date().toISOString(),
    },
    statistics: {
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
    },
    contentDetails: {
      duration: 'PT0S',
    },
  }))

  return { items }
}

const buildMockShorts = () => {
  const items = Array.from({ length: 12 }).map((_, index) => ({
    id: `mock-short-${index + 1}`,
    snippet: {
      title: `Mock Short ${index + 1}`,
      description: 'Fallback short description. Configure YOUTUBE_API_KEY for live data.',
      thumbnails: {
        default: { url: '/placeholder.svg' },
        medium: { url: '/placeholder.svg' },
        high: { url: '/placeholder.svg' },
      },
      channelTitle: 'Demo Shorts Channel',
      channelId: 'demo-shorts-channel',
      publishedAt: new Date().toISOString(),
    },
    statistics: {
      viewCount: '0',
      likeCount: '0',
    },
    contentDetails: {
      duration: 'PT15S',
    },
  }))

  return { items }
}

async function fetchFromYouTube(endpoint: string, params: Record<string, string> = {}) {
  const queryParams = new URLSearchParams({
    key: API_KEY!,
    ...params,
  }).toString()

  const url = `${BASE_URL}/${endpoint}?${queryParams}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }

    return response.json()
  } catch (error) {
    console.error('YouTube API error:', error)
    throw error
  }
}

async function saveSuccessfulResponse(cacheKey: string, fallbackKey: string, data: any) {
  await setCachedValue(cacheKey, data)
  await saveFallbackData(fallbackKey, data)
  console.info(`[YouTube API] cached response for key: ${cacheKey}`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const category = searchParams.get('category') || 'All'
  const categoryId = searchParams.get('categoryId') || ''
  const region = searchParams.get('region') || 'US'

  const cacheKey = `${type || 'videos'}:${categoryId}:${category}:${region}`
  const fallbackKey = generateFallbackKey(type as 'videos' | 'shorts' || 'videos', category, region, categoryId)

  // Cleanup old fallback data occasionally (1% chance)
  if (Math.random() < 0.01) {
    cleanupOldFallbackData().catch(console.warn)
  }

  const mockFallback = type === 'shorts' ? buildMockShorts() : buildMockVideos()

  // If no API key, try cache then fallback data then mock
  if (!API_KEY) {
    const cached = await getCachedValue<any>(cacheKey, CACHE_TTL_MS)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Try to load fallback data instead of using mock data
    const fallbackData = await loadFallbackData(fallbackKey)
    if (fallbackData) {
      console.info(`[YouTube API] Using fallback data for key: ${fallbackKey}`)
      return NextResponse.json(fallbackData)
    }

    console.info(`[YouTube API] Using mock data for key: ${fallbackKey}`)
    return NextResponse.json(mockFallback)
  }

  const cached = await getCachedValue<any>(cacheKey, CACHE_TTL_MS)
  if (cached) {
    console.info(`[YouTube API] cache hit for key: ${cacheKey}`)
    return NextResponse.json(cached)
  }

  console.info(`[YouTube API] cache miss for key: ${cacheKey}, fetching from YouTube`)

  try {
    if (type === 'videos') {
      // If we have a category ID, use mostPopular with category filter
      if (categoryId) {
        const params: any = {
          part: 'snippet,statistics,contentDetails',
          chart: 'mostPopular',
          maxResults: '50',
          regionCode: region,
          videoCategoryId: categoryId
        }

        const data = await fetchFromYouTube('videos', params)
        await saveSuccessfulResponse(cacheKey, fallbackKey, data)
        return NextResponse.json(data)
      }
      // If no category ID but specific category, use search
      else if (category !== 'All') {
        // Create better search queries for specific categories
        const searchQueries: Record<string, string> = {
          'Fitness': 'workout fitness exercise training',
          'Finance': 'finance money investing trading business',
          'Art': 'art drawing painting creative tutorial',
          'Podcasts': 'podcast interview talk show',
          'Live': 'live stream streaming'
        }

        const searchQuery = searchQueries[category] || category.toLowerCase()

        const searchData = await fetchFromYouTube('search', {
          part: 'snippet',
          maxResults: '50',
          q: searchQuery,
          type: 'video',
          order: 'relevance',
          regionCode: region
        })

        if (searchData.items?.length > 0) {
          const videoIds = searchData.items
            .map((item: any) => item.id.videoId)
            .join(',')

          const videoData = await fetchFromYouTube('videos', {
            part: 'snippet,statistics,contentDetails',
            id: videoIds,
          })

          await saveSuccessfulResponse(cacheKey, fallbackKey, videoData)
          console.info(`[YouTube API] cached search response for key: ${cacheKey}`)
          return NextResponse.json(videoData)
        }
      }
      // Default to most popular for 'All' category
      else {
        const params: any = {
          part: 'snippet,statistics,contentDetails',
          chart: 'mostPopular',
          maxResults: '50',
          regionCode: region
        }

        const data = await fetchFromYouTube('videos', params)
        await saveSuccessfulResponse(cacheKey, fallbackKey, data)
        return NextResponse.json(data)
      }
    }

    if (type === 'shorts') {
      // Build search query for shorts
      let searchQuery = '#shorts'
      if (category !== 'All') {
        searchQuery = `#shorts ${category.toLowerCase()}`
      }

      const searchData = await fetchFromYouTube('search', {
        part: 'snippet',
        maxResults: '50',
        q: searchQuery,
        type: 'video',
        videoDuration: 'short',
        order: 'relevance',
        regionCode: region
      })

      if (searchData.items?.length > 0) {
        const videoIds = searchData.items
          .map((item: any) => item.id.videoId)
          .join(',')

        const videoData = await fetchFromYouTube('videos', {
          part: 'snippet,statistics,contentDetails',
          id: videoIds,
        })

        await saveSuccessfulResponse(cacheKey, fallbackKey, videoData)
        console.info(`[YouTube API] cached shorts response for key: ${cacheKey}`)
        return NextResponse.json(videoData)
      }

      // If no shorts found, save empty result as fallback and return mock
      const emptyResult = { items: [] }
      await saveSuccessfulResponse(cacheKey, fallbackKey, emptyResult)
      return NextResponse.json(mockFallback)
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[YouTube API] error:', error)

    // Try to load fallback data when API fails
    const fallbackData = await loadFallbackData(fallbackKey)
    if (fallbackData) {
      console.info(`[YouTube API] Using fallback data after API error for key: ${fallbackKey}`)
      return NextResponse.json(fallbackData)
    }

    console.info(`[YouTube API] Using mock data after API error for key: ${fallbackKey}`)
    return NextResponse.json(mockFallback)
  }
}