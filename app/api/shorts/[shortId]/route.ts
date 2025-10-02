import { NextRequest, NextResponse } from 'next/server'
import { getUploadById, readUploads, writeUploads, secondsToIsoDuration } from '@/lib/uploads'
import { getStoredChannelProfile } from '@/lib/channel-profile'
import { getCachedValue, setCachedValue } from '@/lib/serverCache'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

type CommentThread = {
  id: string
  authorDisplayName: string
  authorProfileImageUrl: string
  textDisplay: string
  likeCount: number
  publishedAt: string
  replies: Array<{
    id: string
    authorDisplayName: string
    authorProfileImageUrl: string
    textDisplay: string
    likeCount: number
    publishedAt: string
  }>
}

function buildMockShort(shortId: string) {
  return {
    id: shortId,
    snippet: {
      title: `Short Video ${shortId}`,
      description: 'This is a placeholder short. Configure YOUTUBE_API_KEY to fetch real data.',
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
      viewCount: '1000',
      likeCount: '100',
      commentCount: '10',
    },
    contentDetails: {
      duration: 'PT45S',
    },
    isShort: true,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(shortId)}?autoplay=1&playsinline=1&loop=1&playlist=${encodeURIComponent(shortId)}&enablejsapi=1&mute=1`,
    comments: buildMockComments(),
  }
}

function buildMockComments(): CommentThread[] {
  return Array.from({ length: 3 }).map((_, index) => ({
    id: `mock-comment-${index}`,
    authorDisplayName: `Viewer ${index + 1}`,
    authorProfileImageUrl: '/placeholder.svg',
    textDisplay: 'This is a mock comment. Configure YOUTUBE_API_KEY to load live discussion.',
    likeCount: Math.floor(Math.random() * 25),
    publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
    replies: [],
  }))
}

async function fetchAllShorts(requestedShortId: string): Promise<any[]> {
  const allShorts: any[] = []

  // First, try to fetch the requested short specifically (could be local or YouTube)
  const localUpload = await getUploadById(requestedShortId)
  if (localUpload && localUpload.type === 'short') {
    const profile = await getStoredChannelProfile(localUpload.ownerId)
    const thumbnail = localUpload.thumbnailPath || '/placeholder.svg'
    allShorts.push({
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
        duration: secondsToIsoDuration(localUpload.durationSeconds),
      },
      isShort: true,
      isLocal: true,
      filePath: localUpload.filePath,
      ownerId: localUpload.ownerId,
      channel: {
        title: profile.title,
        thumbnails: {
          default: { url: profile.avatar },
          medium: { url: profile.avatar },
          high: { url: profile.avatar },
        },
        statistics: {
          subscriberCount: profile.subscribers.toString(),
          videoCount: '0',
        },
      },
    })
  } else if (API_KEY) {
    // Try fetching from YouTube
    try {
      const response = await fetch(
        `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${requestedShortId}&key=${API_KEY}`
      )
      if (response.ok) {
        const data = await response.json()
        const short = data.items?.[0]
        if (short) {
          allShorts.push({
            id: short.id,
            snippet: short.snippet,
            statistics: short.statistics,
            contentDetails: short.contentDetails,
            isShort: true,
            embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(short.id)}?autoplay=1&playsinline=1&loop=1&playlist=${encodeURIComponent(short.id)}&enablejsapi=1&mute=1`,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching requested short from YouTube:', error)
    }
  }

  // Fetch other local shorts
  try {
    const uploads = await readUploads()
    const localShorts = uploads
      .filter(upload => upload.type === 'short' && upload.id !== requestedShortId)
      .map(async upload => {
        const profile = await getStoredChannelProfile(upload.ownerId)
        const thumbnail = upload.thumbnailPath || '/placeholder.svg'
        return {
          id: upload.id,
          snippet: {
            title: upload.title,
            description: upload.description,
            thumbnails: {
              default: { url: thumbnail },
              medium: { url: thumbnail },
              high: { url: thumbnail },
            },
            channelTitle: profile.title,
            channelId: profile.id,
            publishedAt: upload.createdAt,
          },
          statistics: {
            viewCount: String(upload.viewCount || 0),
            likeCount: String(upload.likeCount || 0),
            commentCount: String(upload.commentCount || 0),
          },
          contentDetails: {
            duration: secondsToIsoDuration(upload.durationSeconds),
          },
          isShort: true,
          isLocal: true,
          filePath: upload.filePath,
          ownerId: upload.ownerId,
          channel: {
            title: profile.title,
            thumbnails: {
              default: { url: profile.avatar },
              medium: { url: profile.avatar },
              high: { url: profile.avatar },
            },
            statistics: {
              subscriberCount: profile.subscribers.toString(),
              videoCount: '0',
            },
          },
        }
      })

    const resolvedLocalShorts = await Promise.all(localShorts)
    allShorts.push(...resolvedLocalShorts)
  } catch (error) {
    console.error('Failed to fetch local shorts:', error)
  }

  // Fetch other YouTube shorts using a specific search query
  if (API_KEY) {
    try {
      const response = await fetch(
        `${BASE_URL}/search?part=snippet&type=video&videoDuration=short&q=shorts&maxResults=50&key=${API_KEY}`,
        { cache: 'no-store' }
      )

      if (response.ok) {
        const data = await response.json()

        // Get unique channel IDs
        const channelIds = [...new Set(
          (data.items || [])
            .filter((item: any) => item.snippet?.channelId)
            .map((item: any) => item.snippet.channelId)
        )]

        // Fetch channel details in batches
        let channelData: Record<string, any> = {}
        if (channelIds.length > 0) {
          try {
            const channelsResponse = await fetch(
              `${BASE_URL}/channels?part=snippet&id=${channelIds.join(',')}&key=${API_KEY}`
            )
            if (channelsResponse.ok) {
              const channelsJson = await channelsResponse.json()
              channelData = (channelsJson.items || []).reduce((acc: any, channel: any) => {
                acc[channel.id] = {
                  title: channel.snippet.title,
                  avatar: channel.snippet.thumbnails?.high?.url ||
                          channel.snippet.thumbnails?.medium?.url ||
                          channel.snippet.thumbnails?.default?.url
                }
                return acc
              }, {})
            }
          } catch (error) {
            console.error('[fetchAllShorts] Failed to fetch channel data:', error)
          }
        }

        const youtubeShorts = (data.items || [])
          .filter((item: any) => item.id?.videoId && item.id.videoId !== requestedShortId)
          .map((item: any) => {
            const channelInfo = channelData[item.snippet?.channelId] || {}
            return {
              id: item.id.videoId,
              snippet: item.snippet,
              statistics: {
                viewCount: '0',
                likeCount: '0',
                commentCount: '0',
              },
              isShort: true,
              embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(item.id.videoId)}?autoplay=1&playsinline=1&loop=1&playlist=${encodeURIComponent(item.id.videoId)}&enablejsapi=1&mute=1`,
              channel: channelInfo.title ? {
                title: channelInfo.title,
                avatar: channelInfo.avatar,
                thumbnails: {
                  default: { url: channelInfo.avatar },
                  medium: { url: channelInfo.avatar },
                  high: { url: channelInfo.avatar },
                }
              } : undefined
            }
          })

        allShorts.push(...youtubeShorts)
      } else {
        const errorText = await response.text()
        console.error('[fetchAllShorts] YouTube API error:', response.status, errorText)
      }
    } catch (error) {
      console.error('[fetchAllShorts] Failed to fetch YouTube shorts:', error)
    }
  }

  return allShorts
}

async function fetchShortComments(shortId: string): Promise<CommentThread[]> {
  if (!API_KEY) {
    return buildMockComments()
  }

  try {
    const response = await fetch(
      `${BASE_URL}/commentThreads?part=snippet,replies&videoId=${shortId}&maxResults=20&key=${API_KEY}`
    )

    if (!response.ok) {
      console.warn('Failed to fetch short comments', await response.text())
      return []
    }

    const data = await response.json()
    return (data.items || []).map((item: any) => {
      const snippet = item.snippet?.topLevelComment?.snippet
      if (!snippet) {
        return null
      }

      const replies = (item.replies?.comments || []).map((reply: any) => {
        const replySnippet = reply.snippet
        return {
          id: reply.id,
          authorDisplayName: replySnippet?.authorDisplayName ?? 'Viewer',
          authorProfileImageUrl: replySnippet?.authorProfileImageUrl ?? '/placeholder.svg',
          textDisplay: replySnippet?.textDisplay ?? '',
          likeCount: Number(replySnippet?.likeCount ?? 0),
          publishedAt: replySnippet?.publishedAt ?? new Date().toISOString(),
        }
      })

      return {
        id: item.id,
        authorDisplayName: snippet.authorDisplayName ?? 'Viewer',
        authorProfileImageUrl: snippet.authorProfileImageUrl ?? '/placeholder.svg',
        textDisplay: snippet.textDisplay ?? '',
        likeCount: Number(snippet.likeCount ?? 0),
        publishedAt: snippet.publishedAt ?? new Date().toISOString(),
        replies,
      }
    }).filter(Boolean) as CommentThread[]
  } catch (error) {
    console.error('Error fetching short comments:', error)
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const resolvedParams = await params
  const shortId = resolvedParams.shortId

  if (!shortId) {
    return NextResponse.json({ error: 'Short ID is required' }, { status: 400 })
  }

  const include = request.nextUrl.searchParams.get('include')?.split(',') ?? []
  const includeComments = include.includes('comments')
  const includeRelated = include.includes('related')

  // Check cache first for faster response
  const cacheKey = `short:${shortId}`
  const cached = await getCachedValue<any>(cacheKey, CACHE_TTL_MS)

  // If includeRelated is requested, fetch and return array of shorts
  if (includeRelated) {
    // Check cache for related shorts feed
    const relatedCacheKey = `shorts:related:${shortId}`
    const cachedRelated = await getCachedValue<any[]>(relatedCacheKey, CACHE_TTL_MS)

    if (cachedRelated) {
      return NextResponse.json(cachedRelated)
    }

    // Fetch all shorts (local + YouTube)
    const allShorts = await fetchAllShorts(shortId)

    // Cache the related shorts feed
    await setCachedValue(relatedCacheKey, allShorts)

    return NextResponse.json(allShorts)
  }

  if (cached) {
    if (includeComments && !cached.comments) {
      const comments = await fetchShortComments(shortId)
      return NextResponse.json({ ...cached, comments })
    }
    return NextResponse.json(cached)
  }

  const localUpload = await getUploadById(shortId)
  if (localUpload && localUpload.type === 'short') {
    const profile = await getStoredChannelProfile(localUpload.ownerId)
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
        duration: secondsToIsoDuration(localUpload.durationSeconds),
      },
      isShort: true,
      isLocal: true,
      filePath: localUpload.filePath,
      ownerId: localUpload.ownerId,
      channel: {
        title: profile.title,
        thumbnails: {
          default: { url: profile.avatar },
          medium: { url: profile.avatar },
          high: { url: profile.avatar },
        },
        statistics: {
          subscriberCount: profile.subscribers.toString(),
          videoCount: '0',
        },
      },
      embedUrl: null,
      comments: includeComments ? [] : undefined,
    }

    // Cache local uploads too
    await setCachedValue(cacheKey, responseBody)

    return NextResponse.json(responseBody)
  }

  if (!API_KEY) {
    const mock = buildMockShort(shortId)
    if (!includeComments) {
      delete (mock as any).comments
    }
    return NextResponse.json(mock)
  }

  try {
    const shortResponse = await fetch(
      `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${shortId}&key=${API_KEY}`
    )

    if (!shortResponse.ok) {
      throw new Error('Failed to fetch short data')
    }

    const data = await shortResponse.json()
    const short = data.items?.[0]

    if (!short) {
      return NextResponse.json(buildMockShort(shortId))
    }

    const channelId = short.snippet?.channelId
    let channelData: any = null

    if (channelId) {
      const channelResponse = await fetch(
        `${BASE_URL}/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`
      )

      if (channelResponse.ok) {
        const channelJson = await channelResponse.json()
        channelData = channelJson.items?.[0] ?? null
      }
    }

    const responseBody = {
      id: short.id,
      snippet: short.snippet,
      statistics: short.statistics,
      contentDetails: short.contentDetails,
      isShort: true,
      channel: channelData
        ? {
            title: channelData.snippet?.title ?? short.snippet?.channelTitle ?? 'Unknown channel',
            thumbnails: channelData.snippet?.thumbnails ?? {
              default: { url: '/placeholder.svg' },
              medium: { url: '/placeholder.svg' },
              high: { url: '/placeholder.svg' },
            },
            statistics: channelData.statistics ?? {
              subscriberCount: '0',
              videoCount: '0',
            },
          }
        : undefined,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(shortId)}?autoplay=1&playsinline=1&loop=1&playlist=${encodeURIComponent(shortId)}&enablejsapi=1&mute=1`,
    }

    if (includeComments) {
      const comments = await fetchShortComments(shortId)
      Object.assign(responseBody, { comments })
    }

    // Only cache successful API responses
    if (short && short.snippet && !short.snippet.title?.includes('Short Video ' + shortId)) {
      await setCachedValue(cacheKey, responseBody)
    }

    return NextResponse.json(responseBody)
  } catch (error) {
    console.error('Error fetching short data:', error)
    // Don't cache error responses
    return NextResponse.json(buildMockShort(shortId))
  }
}

// PATCH endpoint for updating short metrics
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const resolvedParams = await params
  const shortId = resolvedParams.shortId

  if (!shortId) {
    return NextResponse.json({ error: 'Short ID is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { action, value } = body

    const uploads = await readUploads()
    const uploadIndex = uploads.findIndex((upload) => upload.id === shortId)

    if (uploadIndex === -1) {
      return NextResponse.json({ error: 'Short not found' }, { status: 404 })
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

    // Clear cache for this short
    const cacheKey = `short:${shortId}`
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
    console.error('Error updating short metrics:', error)
    return NextResponse.json(
      { error: 'Failed to update metrics' },
      { status: 500 }
    )
  }
}
