import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { addUpload, createUploadId, mapStoredUploadToVideo, readUploads, THUMBNAIL_DIR, UPLOAD_DIR } from '@/lib/uploads'
import { StoredUpload } from '@/lib/upload-constants'
import { getStoredChannelProfile, hasStoredChannelProfile, updateStoredChannelProfile } from '@/lib/channel-profile'
import { getRecommendedFeed, FEED_PRESETS } from '@/lib/feedAlgorithm'

export const runtime = 'nodejs'

// Increase body size limit to 100MB for video uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
}

// For Next.js 13+ App Router
export const maxDuration = 300 // 5 minutes timeout

async function saveFile(file: File, directory: string, id: string) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const ext = path.extname(file.name) || (file.type.includes('video') ? '.mp4' : '.png')
  const fileName = `${id}${ext}`
  const filePath = path.join(directory, fileName)
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(filePath, buffer)
  return `/upload${directory === UPLOAD_DIR ? '' : '/thumbnails'}/${fileName}`
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== 'string') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const channelId = searchParams.get('channelId')
    const channelName = searchParams.get('channelName')
    const userRegion = searchParams.get('userRegion') // User's selected region
    const requestUserId = searchParams.get('requestUserId') // For personalization
    const feedMode = searchParams.get('feedMode') as keyof typeof FEED_PRESETS // 'balanced', 'trending', etc.
    const useAlgorithm = searchParams.get('algorithm') !== 'false' // Default to true

    // For now, return empty arrays on Vercel (file system not available)
    // TODO: Connect to WordPress API
    const uploads = []

  // Use provided channel info or fallback to default profile
  let channelInfo
  if (userId && channelId && channelName) {
    channelInfo = {
      id: channelId,
      title: channelName,
      avatar: '/placeholder.svg',
    }
  } else {
    const profile = await getStoredChannelProfile()
    channelInfo = {
      id: profile.id,
      title: profile.title,
      avatar: profile.avatar,
    }
  }

  const filteredUploads = uploads.filter((upload) => {
    if (userId) {
      return upload.ownerId === userId
    }
    return true
  })

  // Apply smart feed algorithm if enabled
  let processedVideos = filteredUploads.filter((upload) => upload.type === 'video')
  let processedShorts = filteredUploads.filter((upload) => upload.type === 'short')

  if (useAlgorithm) {
    const feedConfig = feedMode && FEED_PRESETS[feedMode] ? FEED_PRESETS[feedMode] : undefined

    processedVideos = getRecommendedFeed(processedVideos, {
      userRegion,
      userId: requestUserId || undefined,
      customConfig: feedConfig,
    })

    processedShorts = getRecommendedFeed(processedShorts, {
      userRegion,
      userId: requestUserId || undefined,
      customConfig: feedConfig,
    })
  }

  const videos = processedVideos.map((upload) => mapStoredUploadToVideo(upload, channelInfo))
  const shorts = processedShorts.map((upload) => mapStoredUploadToVideo(upload, channelInfo))

  return NextResponse.json({ videos, shorts })
  } catch (error) {
    console.error('Error in GET /api/uploads:', error)
    // Return empty arrays instead of failing
    return NextResponse.json({ videos: [], shorts: [] })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 })
    }

    const title = (formData.get('title') as string) || 'Untitled upload'
    const description = (formData.get('description') as string) || ''
    const category = (formData.get('category') as string) || 'General'
    const tagsRaw = (formData.get('tags') as string) || '[]'
    const tags = JSON.parse(tagsRaw) as string[]
    const visibility = (formData.get('visibility') as string) || 'public'
    const durationSeconds = parseNumber(formData.get('durationSeconds'), 0)
    const rawType = (formData.get('type') as string) || 'video'
    const type = rawType === 'short' ? 'short' : 'video'
    const id = createUploadId(type)

    const filePath = await saveFile(file, UPLOAD_DIR, id)
    let thumbnailPath: string | null = null
    const thumbnail = formData.get('thumbnail')
    if (thumbnail instanceof File && thumbnail.size > 0) {
      thumbnailPath = await saveFile(thumbnail, THUMBNAIL_DIR, id)
    }

    const createdAt = new Date().toISOString()
    const ownerId = (formData.get('userId') as string) || undefined
    const channelId = (formData.get('channelId') as string) || undefined
    const channelName = (formData.get('channelName') as string) || undefined
    const region = (formData.get('region') as string) || undefined // Creator's region

    const storedRecord: StoredUpload = {
      id,
      title,
      description,
      category,
      tags,
      visibility: visibility as 'public' | 'unlisted' | 'private',
      filePath,
      thumbnailPath,
      durationSeconds,
      type,
      createdAt,
      viewCount: 0,
      likeCount: 0,
      dislikeCount: 0,
      commentCount: 0,
      ownerId,
      channelId,
      region,
    }

    const record = await addUpload(storedRecord)

    // Get channel info from form data or use default
    let channelInfo
    if (channelId && channelName) {
      channelInfo = {
        id: channelId,
        title: channelName,
        avatar: '/placeholder.svg',
      }
    } else {
      const profile = await getStoredChannelProfile()
      channelInfo = {
        id: profile.id,
        title: profile.title,
        avatar: profile.avatar,
      }
    }

    if (!channelInfo.id && channelId) {
      channelInfo.id = channelId
    }

    if (ownerId && channelName && !(await hasStoredChannelProfile(ownerId))) {
      const sanitizedName = channelName.toLowerCase().replace(/[^a-z0-9._-]/g, '')
      await updateStoredChannelProfile(
        {
          id: channelId || `channel_${ownerId}`,
          title: channelName,
          handle: `@${sanitizedName || ownerId}`,
          ownerId,
        },
        ownerId
      )
    }

    const normalized = mapStoredUploadToVideo(record, channelInfo)

    return NextResponse.json({ record: normalized })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to store upload' },
      { status: 500 }
    )
  }
}
