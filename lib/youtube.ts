export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  channelId: string
  channelAvatar: string
  publishedAt: string
  viewCount: string
  duration: string
  commentCount?: string
  isShort?: boolean
  isLocal?: boolean
  filePath?: string
  ownerId?: string
}

import { getUserRegion } from './geolocation'

// Constants
const REGIONS = ['US', 'GB', 'IN', 'CA', 'AU']
const CATEGORY_IDS = {
  All: '',
  Music: '10',
  Gaming: '20',
  Sports: '17',
  Entertainment: '24',
  News: '25',
  Education: '27',
  Science: '28',
  Technology: '28',
  Comedy: '23',
  Movies: '1',
  Animation: '31',
  Pets: '15',
  Vlogs: '22',
  Live: '',
  Podcasts: '', // Use search instead
  DIY: '26', // Howto & Style
  Finance: '', // Use search for better results
  Fitness: '', // Use search for better results
  Art: '', // Use search for better results
} as const

function getHighestResThumbnail(thumbnails: any) {
  return thumbnails.maxres?.url || 
         thumbnails.standard?.url || 
         thumbnails.high?.url || 
         thumbnails.medium?.url || 
         thumbnails.default?.url
}

function getRandomRegion(): string {
  return REGIONS[Math.floor(Math.random() * REGIONS.length)]
}

async function fetchFromAPI(type: 'videos' | 'shorts', params: Record<string, string> = {}) {
  try {
    const searchParams = new URLSearchParams({ type, ...params }).toString()
    const response = await fetch(`/api/youtube?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'force-cache', // Enable client-side caching for faster page loads
      next: { revalidate: 600 }, // Revalidate every 10 minutes to match server cache
    })

    if (!response.ok) {
      console.warn(`YouTube API proxy returned ${response.status}`)
      return { items: [] }
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching from API:', error)
    return { items: [] }
  }
}

export async function getPopularVideos(category: string = 'All'): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    const categoryId = CATEGORY_IDS[category as keyof typeof CATEGORY_IDS] ?? ''
    const params: Record<string, string> = {}
    if (categoryId) {
      params.categoryId = categoryId
    }

    // Get user's region based on their location
    const { regionCode } = await getUserRegion()
    params.region = regionCode
    params.category = category

    const data = await fetchFromAPI('videos', params)
    
    const videos = data.items?.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: getHighestResThumbnail(item.snippet.thumbnails),
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: `/api/channel-avatar/${item.snippet.channelId}`,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || '0',
      duration: item.contentDetails?.duration || 'PT0S',
      commentCount: item.statistics?.commentCount || '0',
      isShort: false,
      isLocal: false,
    })) || []

    return {
      videos,
      nextPageToken: data.nextPageToken,
    }
  } catch (error) {
    console.error('Error getting popular videos:', error)
    return { videos: [] }
  }
}

export async function getShorts(category: string = 'All'): Promise<{ shorts: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    const categoryId = CATEGORY_IDS[category as keyof typeof CATEGORY_IDS] ?? ''

    // Get user's region based on their location
    const { regionCode } = await getUserRegion()
    const params: Record<string, string> = { region: regionCode, category }

    if (categoryId) {
      params.categoryId = categoryId
      params.category = category
    }

    const data = await fetchFromAPI('shorts', params)
    
    const shorts = data.items?.map((item: any) => {
      const resolvedId = typeof item.id === 'object' && item.id !== null ? (item.id.videoId || item.id.playlistId || item.id.channelId || '') : item.id

      return {
        id: resolvedId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: getHighestResThumbnail(item.snippet.thumbnails),
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelAvatar: `/api/channel-avatar/${item.snippet.channelId}`,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.statistics?.viewCount || '0',
        duration: item.contentDetails?.duration || 'PT0S',
        commentCount: item.statistics?.commentCount || '0',
        isShort: true,
        isLocal: false,
      }
    })
      ?.filter((short: YouTubeVideo) => Boolean(short.id)) || []

    return {
      shorts,
      nextPageToken: data.nextPageToken,
    }
  } catch (error) {
    console.error('Error getting shorts:', error)
    return { shorts: [] }
  }
}
