import { NextResponse } from 'next/server'
import { getStoredChannelProfile, getStoredChannelProfileByHandle, updateStoredChannelProfile } from '@/lib/channel-profile'
import { readUploads, secondsToIsoDuration } from '@/lib/uploads'
import { DEFAULT_CHANNEL } from '@/lib/upload-constants'

const API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelName: string }> }
) {
  // Await params first for Next.js 15 compatibility
  const resolvedParams = await params
  const { channelName } = resolvedParams

  // Remove @ prefix if present
  const cleanChannelName = channelName.startsWith('@') ? channelName.slice(1) : channelName
  const normalizedChannelSegment = cleanChannelName.toLowerCase().replace(/[^a-z0-9._-]/g, '')

  // Get user info from query parameters
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const currentUserChannelName = url.searchParams.get('currentUserChannelName')
  const currentUserHandle = url.searchParams.get('currentUserHandle')

  // Check if this is a local channel (user's own channel or default)
  const sanitizedCurrentUserChannelName = currentUserChannelName
    ? currentUserChannelName.toLowerCase().replace(/[^a-z0-9._-]/g, '')
    : null
  const sanitizedCurrentUserHandle = currentUserHandle
    ? currentUserHandle.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '')
    : null
  const isCurrentUserChannel = Boolean(
    userId && sanitizedCurrentUserHandle && normalizedChannelSegment === sanitizedCurrentUserHandle
  )
  const isDefaultChannel =
    normalizedChannelSegment === 'your-channel' ||
    normalizedChannelSegment === DEFAULT_CHANNEL.title.toLowerCase().replace(/[^a-z0-9._-]/g, '')


  const uploads = await readUploads()

  const resolveLocalChannel = async () => {
    let ownerId: string | undefined
    let profile = null as Awaited<ReturnType<typeof getStoredChannelProfile>> | null

    if (isCurrentUserChannel && userId) {
      profile = await getStoredChannelProfile(userId)
      ownerId = userId

      if (!profile.ownerId || profile.ownerId !== userId) {
        const sanitizedName = currentUserChannelName?.trim()
        const defaultTitle = sanitizedName && sanitizedName.length > 0 ? sanitizedName : profile.title
        const defaultHandle = sanitizedName
          ? `@${sanitizedName.toLowerCase().replace(/[^a-z0-9._-]/g, '')}`
          : profile.handle

        profile = await updateStoredChannelProfile(
          {
            id: profile.id || `channel_${userId}`,
            title: defaultTitle,
            handle: defaultHandle,
            ownerId: userId,
          },
          userId
        )
      }
    } else {
      // Only look for channels that actually exist in our database
      const requestedHandle = channelName.startsWith('@') ? channelName : `@${channelName}`
      const matched = await getStoredChannelProfileByHandle(requestedHandle)
      if (matched) {
        profile = matched.profile
        ownerId = matched.ownerId ?? matched.profile.ownerId
      } else if (isDefaultChannel) {
        // Only return default channel for specific default URLs
        profile = await getStoredChannelProfile()
        ownerId = profile.ownerId
      }
    }

    if (!profile) {
      return null
    }

    const relevantUploads = uploads.filter((upload) => {
      if (ownerId) {
        return upload.ownerId === ownerId
      }
      return !upload.ownerId
    })

    const videosOnly = relevantUploads.filter((item) => item.type === 'video')
    const shortsOnly = relevantUploads.filter((item) => item.type === 'short')
    const totalViewsFromUploads = relevantUploads.reduce((total, item) => total + (item.viewCount ?? 0), 0)

    const videos = videosOnly.map((upload) => ({
      id: upload.id,
      title: upload.title,
      description: upload.description,
      thumbnail: upload.thumbnailPath || '/placeholder.svg',
      publishedAt: upload.createdAt,
      viewCount: (upload.viewCount ?? 0).toString(),
      duration: secondsToIsoDuration(upload.durationSeconds),
    }))

    const shorts = shortsOnly.map((upload) => ({
      id: upload.id,
      title: upload.title,
      description: upload.description,
      thumbnail: upload.thumbnailPath || '/placeholder.svg',
      publishedAt: upload.createdAt,
      viewCount: (upload.viewCount ?? 0).toString(),
      duration: secondsToIsoDuration(upload.durationSeconds),
    }))

    const channelInfo = {
      id: profile.id || ownerId || DEFAULT_CHANNEL.id,
      title: profile.title,
      handle: profile.handle,
      description: profile.description,
      avatar: profile.avatar || '/placeholder.svg',
      banner: profile.banner || '',
      subscribers: profile.subscribers.toString(),
      totalViews: Math.max(profile.totalViews, totalViewsFromUploads).toString(),
      videoCount: videosOnly.length.toString(),
      joinedAt: profile.joinedAt,
      isEditable: Boolean(ownerId && userId && ownerId === userId && isCurrentUserChannel),
      ownerId: ownerId ?? profile.ownerId,
    }

    return { channelInfo, videos, shorts }
  }

  const localResult = await resolveLocalChannel()
  if (localResult) {
    return NextResponse.json({
      channel: localResult.channelInfo,
      videos: localResult.videos,
      shorts: localResult.shorts,
    })
  }

  if (!API_KEY) {
    return new NextResponse('Channel not found', { status: 404 })
  }

  try {
    // First try to find channel by custom URL/handle
    let channelId = ''

    // Search for channel by custom URL
    const searchResponse = await fetch(
      `${BASE_URL}/search?part=snippet&q=${cleanChannelName}&type=channel&maxResults=10&key=${API_KEY}`
    )

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      const foundChannel = searchData.items?.find((item: any) =>
        item.snippet?.customUrl?.toLowerCase().includes(cleanChannelName.toLowerCase()) ||
        item.snippet?.title?.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanChannelName.toLowerCase()
      )

      if (foundChannel) {
        channelId = foundChannel.snippet.channelId || foundChannel.id?.channelId
      }
    }

    if (!channelId) {
      return new NextResponse('Channel not found', { status: 404 })
    }

    // Fetch channel details
    const channelResponse = await fetch(
      `${BASE_URL}/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${API_KEY}`
    )

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel data')
    }

    const channelData = await channelResponse.json()
    const channel = channelData.items?.[0]

    if (!channel) {
      return new NextResponse('Channel not found', { status: 404 })
    }

    const buildContentDetailsMap = async (ids: string[]) => {
      if (!ids.length) return new Map<string, any>()
      const detailsResponse = await fetch(
        `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${ids.join(',')}&key=${API_KEY}`
      )

      if (!detailsResponse.ok) {
        return new Map<string, any>()
      }

      const detailsData = await detailsResponse.json()
      const map = new Map<string, any>()
      detailsData.items?.forEach((item: any) => {
        if (item?.id) {
          map.set(item.id, item)
        }
      })
      return map
    }

    const videosResponse = await fetch(
      `${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${API_KEY}`
    )

    if (!videosResponse.ok) {
      throw new Error('Failed to fetch channel videos')
    }

    const videosData = await videosResponse.json()
    const videoItems = videosData.items || []
    const videoIds = videoItems
      .map((item: any) => item.id?.videoId)
      .filter((id: string | undefined): id is string => Boolean(id))
    const videoDetailsMap = await buildContentDetailsMap(videoIds)

    const shortsResponse = await fetch(
      `${BASE_URL}/search?part=snippet&channelId=${channelId}&q=#shorts&order=date&maxResults=50&type=video&key=${API_KEY}`
    )

    if (!shortsResponse.ok) {
      throw new Error('Failed to fetch channel shorts')
    }

    const shortsData = await shortsResponse.json()
    const shortItems = shortsData.items || []
    const shortIds = shortItems
      .map((item: any) => item.id?.videoId)
      .filter((id: string | undefined): id is string => Boolean(id))
    const shortsDetailsMap = await buildContentDetailsMap(shortIds)

    const channelInfo = {
      id: channel.id,
      title: channel.snippet?.title ?? 'Unknown channel',
      handle: channel.snippet?.customUrl ? `@${channel.snippet.customUrl.replace(/^@/, '')}` : `@${cleanChannelName}`,
      description: channel.snippet?.description ?? '',
      avatar:
        channel.snippet?.thumbnails?.high?.url ||
        channel.snippet?.thumbnails?.medium?.url ||
        channel.snippet?.thumbnails?.default?.url ||
        '/placeholder.svg',
      banner: channel.brandingSettings?.image?.bannerExternalUrl || '',
      subscribers: channel.statistics?.subscriberCount ?? '0',
      totalViews: channel.statistics?.viewCount ?? '0',
      videoCount: channel.statistics?.videoCount ?? '0',
      joinedAt: channel.snippet?.publishedAt ?? null,
      isEditable: false,
    }

    const videos = videoItems.map((item: any) => {
      const id = item.id?.videoId ?? ''
      const details = id ? videoDetailsMap.get(id) : null
      return {
        id,
        title: item.snippet?.title ?? 'Untitled video',
        description: details?.snippet?.description ?? item.snippet?.description ?? '',
        thumbnail:
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '/placeholder.svg',
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        viewCount: details?.statistics?.viewCount ?? '0',
        duration: details?.contentDetails?.duration ?? 'PT0S',
      }
    }).filter((video: any) => Boolean(video.id))

    const shorts = shortItems.map((item: any) => {
      const id = item.id?.videoId ?? ''
      const details = id ? shortsDetailsMap.get(id) : null
      return {
        id,
        title: item.snippet?.title ?? 'Short',
        description: details?.snippet?.description ?? item.snippet?.description ?? '',
        thumbnail:
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          '/placeholder.svg',
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        viewCount: details?.statistics?.viewCount ?? '0',
        duration: details?.contentDetails?.duration ?? 'PT0S',
      }
    }).filter((short: any) => Boolean(short.id))

    return NextResponse.json({
      channel: channelInfo,
      videos,
      shorts,
    })
  } catch (error) {
    console.error('Error fetching channel data:', error)
    // If we can't find the channel in YouTube API, return 404 instead of 500
    return new NextResponse('Channel not found', { status: 404 })
  }
}
