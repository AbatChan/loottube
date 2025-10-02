import { getCachedValue, setCachedValue } from './serverCache'

const CHANNEL_CACHE_TTL = 1000 * 60 * 60 * 2 // 2 hours - longer than video cache

export interface CachedChannel {
  id: string
  snippet: {
    title: string
    description?: string
    thumbnails: {
      default?: { url: string }
      medium?: { url: string }
      high?: { url: string }
    }
  }
  statistics: {
    subscriberCount: string
    videoCount: string
    viewCount?: string
  }
}

export async function getCachedChannel(channelId: string): Promise<CachedChannel | null> {
  const cacheKey = `channel:${channelId}`
  return await getCachedValue<CachedChannel>(cacheKey, CHANNEL_CACHE_TTL)
}

export async function setCachedChannel(channelId: string, channelData: CachedChannel): Promise<void> {
  const cacheKey = `channel:${channelId}`
  await setCachedValue(cacheKey, channelData)
  console.info(`[Channel Cache] Cached channel: ${channelId}`)
}

export async function getOrFetchChannel(
  channelId: string,
  fetchFunction: () => Promise<any>
): Promise<CachedChannel | null> {
  // First try cache
  const cached = await getCachedChannel(channelId)
  if (cached) {
    console.info(`[Channel Cache] Cache hit for channel: ${channelId}`)
    return cached
  }

  // Fetch from API
  try {
    console.info(`[Channel Cache] Cache miss, fetching channel: ${channelId}`)
    const apiData = await fetchFunction()

    if (apiData && apiData.snippet) {
      const channelData: CachedChannel = {
        id: channelId,
        snippet: {
          title: apiData.snippet.title || 'Unknown Channel',
          description: apiData.snippet.description,
          thumbnails: apiData.snippet.thumbnails || {
            default: { url: '/placeholder.svg' },
            medium: { url: '/placeholder.svg' },
            high: { url: '/placeholder.svg' }
          }
        },
        statistics: {
          subscriberCount: apiData.statistics?.subscriberCount || '0',
          videoCount: apiData.statistics?.videoCount || '0',
          viewCount: apiData.statistics?.viewCount || '0'
        }
      }

      await setCachedChannel(channelId, channelData)
      return channelData
    }
  } catch (error) {
    console.warn(`[Channel Cache] Failed to fetch channel ${channelId}:`, error)
  }

  return null
}

// Batch fetch multiple channels efficiently
export async function batchFetchChannels(
  channelIds: string[],
  fetchFunction: (ids: string[]) => Promise<any[]>
): Promise<Map<string, CachedChannel>> {
  const result = new Map<string, CachedChannel>()
  const uncachedIds: string[] = []

  // Check cache for each channel
  for (const channelId of channelIds) {
    const cached = await getCachedChannel(channelId)
    if (cached) {
      result.set(channelId, cached)
    } else {
      uncachedIds.push(channelId)
    }
  }

  // Fetch uncached channels in batch
  if (uncachedIds.length > 0) {
    try {
      console.info(`[Channel Cache] Batch fetching ${uncachedIds.length} channels`)
      const apiChannels = await fetchFunction(uncachedIds)

      for (const apiData of apiChannels) {
        if (apiData && apiData.id && apiData.snippet) {
          const channelData: CachedChannel = {
            id: apiData.id,
            snippet: {
              title: apiData.snippet.title || 'Unknown Channel',
              description: apiData.snippet.description,
              thumbnails: apiData.snippet.thumbnails || {
                default: { url: '/placeholder.svg' },
                medium: { url: '/placeholder.svg' },
                high: { url: '/placeholder.svg' }
              }
            },
            statistics: {
              subscriberCount: apiData.statistics?.subscriberCount || '0',
              videoCount: apiData.statistics?.videoCount || '0',
              viewCount: apiData.statistics?.viewCount || '0'
            }
          }

          await setCachedChannel(apiData.id, channelData)
          result.set(apiData.id, channelData)
        }
      }
    } catch (error) {
      console.warn('[Channel Cache] Batch fetch failed:', error)
    }
  }

  return result
}