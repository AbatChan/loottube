import { Suspense } from 'react'
import { Shorts } from '@/components/Shorts'
import { ShortsViewerSkeleton } from '@/components/ShortsViewerSkeleton'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

interface RawShortResponse {
  id: string
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    channelId?: string
    publishedAt?: string
    thumbnails?: Record<string, { url?: string }>
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
  contentDetails?: {
    duration?: string
  }
  filePath?: string
  isLocal?: boolean
  ownerId?: string
  channel?: {
    title?: string
    thumbnails?: Record<string, { url?: string }>
    statistics?: {
      subscriberCount?: string
    }
  }
}

const selectThumbnail = (thumbnails?: Record<string, { url?: string }>) => {
  if (!thumbnails) return '/placeholder.svg'
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    '/placeholder.svg'
  )
}

const normalizeShort = (raw: RawShortResponse) => {
  const channelTitle = raw.channel?.title || raw.snippet?.channelTitle || 'Channel'
  const channelAvatar =
    raw.channel?.thumbnails?.high?.url ||
    raw.channel?.thumbnails?.medium?.url ||
    raw.channel?.thumbnails?.default?.url
  return {
    id: raw.id,
    title: raw.snippet?.title || 'Short',
    description: raw.snippet?.description || '',
    thumbnail: selectThumbnail(raw.snippet?.thumbnails),
    viewCount: raw.statistics?.viewCount || '0',
    likes: raw.statistics?.likeCount || '0',
    commentCount: raw.statistics?.commentCount || '0',
    filePath: raw.isLocal ? raw.filePath : undefined,
    channelTitle,
    channelAvatar,
    channelId: raw.snippet?.channelId || channelTitle,
    channel: {
      title: channelTitle,
      avatar: channelAvatar,
      subscribers: raw.channel?.statistics?.subscriberCount,
    },
    publishedAt: raw.snippet?.publishedAt,
    isLocal: raw.isLocal ?? false,
    ownerId: raw.ownerId,
  }
}

async function getShortsData(shortId: string, baseUrl: string) {
  try {
    // Fetch the requested short with related shorts
    const url = `${baseUrl}/api/shorts/${shortId}?include=related`
    const shortResponse = await fetch(url, {
      cache: 'no-store'
    })

    if (!shortResponse.ok) {
      if (shortResponse.status === 404) {
        notFound()
      }
      // Don't throw for other errors, let the client handle it
      console.warn(`Shorts fetch failed with status ${shortResponse.status}`)
      return null
    }

    const shortsData = await shortResponse.json()
    const shortsList = Array.isArray(shortsData) ? shortsData : [shortsData]

    return {
      shorts: shortsList.map((item: RawShortResponse) => normalizeShort(item)),
      initialShortId: shortId
    }
  } catch (error) {
    console.error('Error loading shorts:', error)
    // Return null instead of throwing to prevent server error
    return null
  }
}

interface PageProps {
  params: Promise<{ shortId: string }>
}

export default async function ShortsPage(props: PageProps) {
  const params = await props.params
  const shortId = params.shortId
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`
  const shortsData = await getShortsData(shortId, baseUrl)

  // If shorts data couldn't be fetched, show not found
  if (!shortsData) {
    notFound()
  }

  return (
    <Suspense fallback={<ShortsViewerSkeleton />}>
      <Shorts shorts={shortsData.shorts} initialShortId={shortsData.initialShortId} />
    </Suspense>
  )
}
