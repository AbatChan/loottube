import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const UPLOADS_JSON = path.join(UPLOADS_DIR, 'uploads.json')

interface Upload {
  id: string
  type: 'video' | 'short'
  title: string
  description: string
  category: string
  tags: string[]
  visibility: string
  filePath: string
  thumbnailPath?: string
  uploadedAt: string
  durationSeconds: number
  userId?: string
  channelId?: string
  channelTitle?: string
  statistics?: {
    viewCount?: string
    likeCount?: string
    dislikeCount?: string
    commentCount?: string
  }
}

export async function GET() {
  try {
    // Read local uploads
    let localShorts: Upload[] = []
    try {
      const uploadsData = await fs.readFile(UPLOADS_JSON, 'utf-8')
      const uploads: Upload[] = JSON.parse(uploadsData)
      localShorts = uploads.filter(upload => upload.type === 'short')
    } catch (error) {
      // uploads.json doesn't exist yet or is invalid
      localShorts = []
    }

    // Fetch YouTube shorts
    let youtubeShorts: any[] = []
    try {
      const apiKey = process.env.YOUTUBE_API_KEY
      if (apiKey) {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=20&key=${apiKey}`,
          { next: { revalidate: 86400 } } // 24 hours
        )

        if (response.ok) {
          const data = await response.json()
          if (data.items) {
            youtubeShorts = data.items.map((item: any) => ({
              id: item.id.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
              channelTitle: item.snippet.channelTitle,
              channelId: item.snippet.channelId,
              publishedAt: item.snippet.publishedAt,
              snippet: item.snippet,
            }))
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch YouTube shorts:', error)
    }

    // Transform local shorts to match the expected format
    const transformedLocalShorts = localShorts.map(upload => ({
      id: upload.id,
      title: upload.title,
      description: upload.description,
      filePath: upload.filePath,
      thumbnail: upload.thumbnailPath,
      channelTitle: upload.channelTitle || 'Local Channel',
      channelId: upload.channelId || upload.userId,
      publishedAt: upload.uploadedAt,
      isLocal: true,
      ownerId: upload.userId,
      statistics: upload.statistics,
      snippet: {
        title: upload.title,
        description: upload.description,
        channelTitle: upload.channelTitle,
        channelId: upload.channelId || upload.userId,
        publishedAt: upload.uploadedAt,
      },
    }))

    // Combine local and YouTube shorts
    const allShorts = [...transformedLocalShorts, ...youtubeShorts]

    return NextResponse.json(allShorts)
  } catch (error) {
    console.error('Error fetching shorts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shorts' },
      { status: 500 }
    )
  }
}
