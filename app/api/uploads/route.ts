import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { addUpload, createUploadId, mapStoredUploadToVideo, readUploads, THUMBNAIL_DIR, UPLOAD_DIR } from '@/lib/uploads'
import { StoredUpload } from '@/lib/upload-constants'
import { getStoredChannelProfile, hasStoredChannelProfile, updateStoredChannelProfile } from '@/lib/channel-profile'
import { getRecommendedFeed, FEED_PRESETS } from '@/lib/feedAlgorithm'

export const runtime = 'nodejs'

// Increase body size limit to 1GB for video uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1gb',
    },
  },
}

// For Next.js 13+ App Router
export const maxDuration = 300 // 5 minutes timeout

// Export the max file size for use in frontend
export const MAX_FILE_SIZE_MB = 1024 // 1GB in MB

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

    // Use WordPress API for uploads
    const wordpressApiUrl = process.env.NEXT_PUBLIC_WORDPRESS_API || 'http://localhost/wordpress/wp-json/loottube/v1'

    // Forward the upload to WordPress
    const wpFormData = new FormData()
    wpFormData.append('file', file)

    const thumbnail = formData.get('thumbnail')
    if (thumbnail instanceof File && thumbnail.size > 0) {
      wpFormData.append('thumbnail', thumbnail)
    }

    // Add metadata
    wpFormData.append('title', formData.get('title') as string || 'Untitled upload')
    wpFormData.append('description', formData.get('description') as string || '')
    wpFormData.append('category', formData.get('category') as string || 'General')
    wpFormData.append('tags', formData.get('tags') as string || '[]')
    wpFormData.append('visibility', formData.get('visibility') as string || 'public')
    wpFormData.append('durationSeconds', formData.get('durationSeconds') as string || '0')
    wpFormData.append('type', formData.get('type') as string || 'video')

    // Pass user/channel info
    if (formData.get('userId')) wpFormData.append('userId', formData.get('userId') as string)
    if (formData.get('channelId')) wpFormData.append('channelId', formData.get('channelId') as string)
    if (formData.get('channelName')) wpFormData.append('channelName', formData.get('channelName') as string)
    if (formData.get('region')) wpFormData.append('region', formData.get('region') as string)

    const uploadResponse = await fetch(`${wordpressApiUrl}/upload`, {
      method: 'POST',
      body: wpFormData,
      // Note: No auth for now, WordPress handles it via is_user_logged_in
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      throw new Error(errorData.message || 'WordPress upload failed')
    }

    const wpData = await uploadResponse.json()

    return NextResponse.json({ record: wpData })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store upload' },
      { status: 500 }
    )
  }
}
