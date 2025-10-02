import { NextRequest, NextResponse } from 'next/server'
import { getUploadById, mapStoredUploadToVideo, readUploads, writeUploads, secondsToIsoDuration, getRelatedUploads, calculateVideoRank } from '@/lib/uploads'
import { DEFAULT_CHANNEL } from '@/lib/upload-constants'
import { getStoredChannelProfile } from '@/lib/channel-profile'
import { getCachedValue, setCachedValue } from '@/lib/serverCache'
import { getOrFetchChannel, batchFetchChannels } from '@/lib/channelCache'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

async function fetchFromYouTube(endpoint: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams({ key: API_KEY ?? '', ...params })
  const url = `${BASE_URL}/${endpoint}?${searchParams.toString()}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

function buildMockVideo(videoId: string) {
  return {
    id: videoId,
    snippet: {
      title: `Video ${videoId}`,
      description: 'This is a placeholder video description. Configure YOUTUBE_API_KEY to fetch real data.',
      thumbnails: {
        default: { url: '/placeholder.svg' },
        medium: { url: '/placeholder.svg' },
        high: { url: '/placeholder.svg' },
        standard: { url: '/placeholder.svg' },
        maxres: { url: '/placeholder.svg' },
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
    channel: {
      title: 'Demo Channel',
      thumbnails: {
        default: { url: '/placeholder.svg' },
        medium: { url: '/placeholder.svg' },
        high: { url: '/placeholder.svg' },
      },
      statistics: {
        subscriberCount: '0',
        videoCount: '0',
      },
    },
    relatedVideos: [],
    comments: [],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const resolvedParams = await params
  const videoId = resolvedParams.videoId

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
  }

  // Check cache first for faster response
  const cacheKey = `video:${videoId}`
  const cached = await getCachedValue<any>(cacheKey, CACHE_TTL_MS)
  if (cached) {
    console.info(`[Video API] cache hit for video: ${videoId}`)
    return NextResponse.json(cached)
  }

  const localUpload = await getUploadById(videoId)
  if (localUpload && localUpload.type === 'video') {
    const uploads = await readUploads()
    const ownerId = localUpload.ownerId
    const profile = await getStoredChannelProfile(ownerId)
    const channelInfo = {
      id: profile.id,
      title: profile.title,
      avatar: profile.avatar,
    }

    // Use intelligent related videos algorithm
    const relevantUploads = ownerId
      ? uploads.filter((upload) => upload.ownerId === ownerId)
      : uploads
    const relatedUploads = getRelatedUploads(localUpload, relevantUploads, 12)
    const related = relatedUploads.map((upload) => mapStoredUploadToVideo(upload, channelInfo))

    const durationIso = secondsToIsoDuration(localUpload.durationSeconds)
    const thumbnail = localUpload.thumbnailPath || '/placeholder.svg'
    const responseBody = {
      id: localUpload.id,
      snippet: {
        title: localUpload.title,
        description: localUpload.description,
        thumbnails: {
          default: { url: thumbnail },
          medium: { url: thumbnail },
          high: { url: thumbnail },
        },
        channelTitle: profile.title,
        channelId: profile.id,
        publishedAt: localUpload.createdAt,
      },
      statistics: {
        viewCount: String(localUpload.viewCount || 0),
        likeCount: String(localUpload.likeCount || 0),
        commentCount: String(localUpload.commentCount || 0),
      },
      contentDetails: {
        duration: durationIso,
      },
      channel: {
        title: profile.title,
        thumbnails: {
          default: { url: profile.avatar },
          medium: { url: profile.avatar },
          high: { url: profile.avatar },
        },
        statistics: {
          subscriberCount: profile.subscribers.toString(),
          videoCount: uploads.filter((item) => item.type === 'video').length.toString(),
        },
      },
      relatedVideos: related,
      comments: [],
      isLocal: true,
      filePath: localUpload.filePath,
    }

    return NextResponse.json(responseBody)
  }

  if (!API_KEY) {
    return new NextResponse('Video not found', { status: 404 })
  }

  try {
    const videoData = await fetchFromYouTube('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId,
    })

    const videoItem = videoData.items?.[0]
    if (!videoItem) {
      return new NextResponse('Video not found', { status: 404 })
    }

    const channelId = videoItem.snippet?.channelId
    let channelItem: any = null
    if (channelId) {
      // Use enhanced channel caching
      channelItem = await getOrFetchChannel(channelId, async () => {
        const channelData = await fetchFromYouTube('channels', {
          part: 'snippet,statistics',
          id: channelId,
        })
        return channelData.items?.[0] ?? null
      })
    }

    // Fetch comments
    let comments: any[] = []
    try {
      const commentsData = await fetchFromYouTube('commentThreads', {
        part: 'snippet,replies',
        videoId: videoId,
        maxResults: '20',
        order: 'relevance'
      })

      comments = (commentsData.items || []).map((item: any) => ({
        id: item.id,
        authorDisplayName: item.snippet.topLevelComment.snippet.authorDisplayName,
        authorProfileImageUrl: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
        authorChannelUrl: item.snippet.topLevelComment.snippet.authorChannelUrl,
        textDisplay: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        totalReplyCount: item.snippet.totalReplyCount || 0,
        replies: (item.replies?.comments || []).slice(0, 3).map((reply: any) => ({
          id: reply.id,
          authorDisplayName: reply.snippet.authorDisplayName,
          authorProfileImageUrl: reply.snippet.authorProfileImageUrl,
          textDisplay: reply.snippet.textDisplay,
          likeCount: reply.snippet.likeCount,
          publishedAt: reply.snippet.publishedAt
        }))
      }))
    } catch (error) {
      console.warn('Could not fetch comments:', error)
    }

    // Get related videos using smart content-based recommendations
    let relatedData = { items: [] }
    try {
      // Extract keywords from current video for better recommendations
      const videoTitle = videoItem.snippet?.title || ''
      const videoTags = videoItem.snippet?.tags || []
      const channelTitle = videoItem.snippet?.channelTitle || ''

      // Create search query based on video content
      let searchQuery = ''
      if (videoTags.length > 0) {
        // Use first few tags for better relevance
        searchQuery = videoTags.slice(0, 3).join(' ')
      } else {
        // Fall back to extracting keywords from title
        const titleWords = videoTitle.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(' ')
          .filter(word => word.length > 3 && !['with', 'from', 'this', 'that', 'video', 'tutorial'].includes(word))
          .slice(0, 3)
          .join(' ')
        searchQuery = titleWords || channelTitle
      }

      if (searchQuery.trim()) {
        // Use search for content-based recommendations
        relatedData = await fetchFromYouTube('search', {
          part: 'snippet',
          maxResults: '12',
          q: searchQuery,
          type: 'video',
          order: 'relevance',
          regionCode: 'US'
        })
      } else {
        // Fallback to popular videos
        relatedData = await fetchFromYouTube('videos', {
          part: 'snippet',
          chart: 'mostPopular',
          maxResults: '12',
          regionCode: 'US'
        })
      }
    } catch (error) {
      console.warn('Could not fetch related videos:', error)
    }

    const relatedVideos = (relatedData.items || []).map((item: any) => ({
      id: typeof item.id === 'string' ? item.id : item.id?.videoId || item.id?.playlistId || item.id?.channelId || '',
      title: item.snippet?.title ?? 'Related video',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || '/placeholder.svg',
      channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
    })).filter((video: any) => Boolean(video.id) && typeof video.id === 'string' && video.id !== videoId)

    const relatedIds = relatedVideos.map((related) => related.id).filter(Boolean)
    let relatedDetailsMap = new Map<string, any>()

    if (relatedIds.length > 0) {
      const detailsData = await fetchFromYouTube('videos', {
        part: 'contentDetails,statistics',
        id: relatedIds.join(','),
      })

      if (detailsData.items) {
        for (const item of detailsData.items) {
          if (item?.id) {
            relatedDetailsMap.set(item.id, item)
          }
        }
      }

      // Batch fetch channel data for related videos
      const relatedChannelIds = relatedVideos
        .map(video => video.channelId)
        .filter((id, index, arr) => id && arr.indexOf(id) === index) // unique IDs only

      if (relatedChannelIds.length > 0) {
        await batchFetchChannels(relatedChannelIds, async (ids) => {
          const channelData = await fetchFromYouTube('channels', {
            part: 'snippet,statistics',
            id: ids.join(','),
          })
          return channelData.items || []
        })
      }
    }

    const enrichedRelatedVideos = relatedVideos.map((video: any) => {
      const details = relatedDetailsMap.get(video.id)
      return {
        ...video,
        viewCount: details?.statistics?.viewCount ?? '0',
        duration: details?.contentDetails?.duration ?? 'PT0S',
      }
    })

    const responseBody = {
      id: videoItem.id,
      snippet: videoItem.snippet,
      statistics: videoItem.statistics ?? {
        viewCount: '0',
        likeCount: '0',
        commentCount: '0',
      },
      contentDetails: videoItem.contentDetails ?? { duration: 'PT0S' },
      channel: channelItem ? {
        title: channelItem.snippet?.title ?? 'Unknown channel',
        thumbnails: channelItem.snippet?.thumbnails ?? {
          default: { url: '/placeholder.svg' },
          medium: { url: '/placeholder.svg' },
          high: { url: '/placeholder.svg' },
        },
        statistics: channelItem.statistics ?? {
          subscriberCount: '0',
          videoCount: '0',
        },
      } : undefined,
      relatedVideos: enrichedRelatedVideos,
      comments: comments,
    }

    // Only cache successful responses (don't cache if we have fallback/mock data)
    if (videoItem && videoItem.snippet && !videoItem.snippet.title?.includes('Video ' + videoId)) {
      await setCachedValue(cacheKey, responseBody)
      console.info(`[Video API] cached successful response for video: ${videoId}`)
    } else {
      console.info(`[Video API] not caching mock/fallback data for video: ${videoId}`)
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    console.error('Error loading video data:', error)
    // Return 404 for API errors instead of dummy data
    return new NextResponse('Video not found', { status: 404 })
  }
}

// PATCH endpoint for updating video metrics
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const resolvedParams = await params
  const videoId = resolvedParams.videoId

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { action, value } = body

    const uploads = await readUploads()
    const uploadIndex = uploads.findIndex((upload) => upload.id === videoId)

    if (uploadIndex === -1) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const upload = uploads[uploadIndex]

    // Handle different metric update actions
    switch (action) {
      case 'incrementView':
        upload.viewCount = (upload.viewCount || 0) + 1
        break

      case 'incrementLike':
        upload.likeCount = (upload.likeCount || 0) + 1
        break

      case 'decrementLike':
        upload.likeCount = Math.max(0, (upload.likeCount || 0) - 1)
        break

      case 'incrementDislike':
        upload.dislikeCount = (upload.dislikeCount || 0) + 1
        break

      case 'decrementDislike':
        upload.dislikeCount = Math.max(0, (upload.dislikeCount || 0) - 1)
        break

      case 'incrementComment':
        upload.commentCount = (upload.commentCount || 0) + 1
        break

      case 'decrementComment':
        upload.commentCount = Math.max(0, (upload.commentCount || 0) - 1)
        break

      case 'setMetrics':
        // Bulk update all metrics
        if (typeof value?.viewCount === 'number') upload.viewCount = value.viewCount
        if (typeof value?.likeCount === 'number') upload.likeCount = value.likeCount
        if (typeof value?.dislikeCount === 'number') upload.dislikeCount = value.dislikeCount
        if (typeof value?.commentCount === 'number') upload.commentCount = value.commentCount
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    uploads[uploadIndex] = upload
    await writeUploads(uploads)

    // Clear cache for this video
    const cacheKey = `video:${videoId}`
    await setCachedValue(cacheKey, null)

    return NextResponse.json({
      success: true,
      metrics: {
        viewCount: upload.viewCount,
        likeCount: upload.likeCount,
        dislikeCount: upload.dislikeCount,
        commentCount: upload.commentCount,
      },
    })
  } catch (error) {
    console.error('Error updating video metrics:', error)
    return NextResponse.json(
      { error: 'Failed to update metrics' },
      { status: 500 }
    )
  }
}
