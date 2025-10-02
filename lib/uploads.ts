import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { StoredUpload, DEFAULT_CHANNEL } from './upload-constants'

const DATA_DIR = path.join(process.cwd(), 'data')
const METADATA_FILE = path.join(DATA_DIR, 'uploads.json')
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'upload')
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails')

async function ensurePaths() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true })
}

export async function readUploads(): Promise<StoredUpload[]> {
  try {
    await ensurePaths()
    const raw = await fs.readFile(METADATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as StoredUpload[]
    }
    return []
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function writeUploads(data: StoredUpload[]): Promise<void> {
  await ensurePaths()
  await fs.writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

export async function addUpload(record: StoredUpload): Promise<StoredUpload> {
  const uploads = await readUploads()
  uploads.unshift(record)
  await writeUploads(uploads.slice(0, 200))
  return record
}

export async function getUploadById(id: string): Promise<StoredUpload | undefined> {
  const uploads = await readUploads()
  return uploads.find((upload) => upload.id === id)
}

export async function deleteUpload(id: string): Promise<boolean> {
  try {
    const uploads = await readUploads()
    const upload = uploads.find((u) => u.id === id)

    if (!upload) {
      return false
    }

    // Delete physical files
    if (upload.filePath) {
      const fullPath = path.join(process.cwd(), 'public', upload.filePath)
      try {
        await fs.unlink(fullPath)
      } catch (error) {
        console.error(`Failed to delete file: ${fullPath}`, error)
      }
    }

    if (upload.thumbnailPath) {
      const thumbPath = path.join(process.cwd(), 'public', upload.thumbnailPath)
      try {
        await fs.unlink(thumbPath)
      } catch (error) {
        console.error(`Failed to delete thumbnail: ${thumbPath}`, error)
      }
    }

    // Remove from metadata
    const updatedUploads = uploads.filter((u) => u.id !== id)
    await writeUploads(updatedUploads)

    return true
  } catch (error) {
    console.error('Error deleting upload:', error)
    return false
  }
}

export async function deleteBulkUploads(ids: string[]): Promise<{ success: string[], failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] }

  for (const id of ids) {
    const deleted = await deleteUpload(id)
    if (deleted) {
      results.success.push(id)
    } else {
      results.failed.push(id)
    }
  }

  return results
}

export function secondsToIsoDuration(totalSeconds: number) {
  const duration = Math.max(0, Math.round(totalSeconds))
  if (duration === 0) {
    return 'PT0S'
  }
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60
  if (hours > 0) {
    return `PT${hours}H${minutes}M${seconds}S`
  }
  if (minutes > 0) {
    return `PT${minutes}M${seconds}S`
  }
  return `PT${seconds}S`
}

// YouTube-like ranking algorithm implementation
export function calculateVideoRank(upload: StoredUpload, currentTime = Date.now()): number {
  const ageInHours = (currentTime - new Date(upload.createdAt).getTime()) / (1000 * 60 * 60)
  const ageDecay = Math.exp(-ageInHours / 168) // Half-life of 1 week

  // Engagement metrics
  const engagementRate = upload.viewCount > 0 ?
    (upload.likeCount + upload.commentCount * 2) / upload.viewCount : 0

  // CTR simulation (view-to-impression ratio)
  const ctrBoost = Math.min(engagementRate * 10, 1)

  // Watch time estimation (longer videos get slight boost if they have good engagement)
  const watchTimeBoost = upload.durationSeconds > 60 ?
    Math.min(upload.durationSeconds / 600, 2) * engagementRate : 1

  // Like-to-dislike ratio
  const totalVotes = upload.likeCount + upload.dislikeCount
  const likeRatio = totalVotes > 0 ? upload.likeCount / totalVotes : 0.5

  // Freshness boost for new content
  const freshnessBoost = ageInHours < 24 ? 1.5 : 1

  // Category popularity (some categories perform better)
  const categoryBoosts: Record<string, number> = {
    'Entertainment': 1.2,
    'Music': 1.3,
    'Gaming': 1.1,
    'Comedy': 1.2,
    'Education': 1.1,
    'general': 1.0
  }
  const categoryBoost = categoryBoosts[upload.category] || 1.0

  // Final ranking score
  const baseScore = Math.log(1 + upload.viewCount) *
                   Math.log(1 + upload.likeCount) *
                   Math.log(1 + upload.commentCount)

  return baseScore *
         ageDecay *
         (1 + ctrBoost) *
         watchTimeBoost *
         likeRatio *
         freshnessBoost *
         categoryBoost
}

// Enhanced content recommendation algorithm
export function getRelatedUploads(targetUpload: StoredUpload, allUploads: StoredUpload[], limit = 12): StoredUpload[] {
  const related = allUploads
    .filter(upload =>
      upload.id !== targetUpload.id &&
      upload.visibility === 'public'
    )
    .map(upload => {
      let score = 0

      // Category match (highest weight)
      if (upload.category === targetUpload.category) {
        score += 10
      }

      // Tag overlap
      const tagOverlap = upload.tags.filter(tag =>
        targetUpload.tags.includes(tag)
      ).length
      score += tagOverlap * 3

      // Title similarity (basic keyword matching)
      const targetWords = targetUpload.title.toLowerCase().split(' ')
      const uploadWords = upload.title.toLowerCase().split(' ')
      const titleOverlap = targetWords.filter(word =>
        uploadWords.includes(word) && word.length > 3
      ).length
      score += titleOverlap * 2

      // Similar duration (for videos)
      if (targetUpload.type === upload.type) {
        const durationDiff = Math.abs(targetUpload.durationSeconds - upload.durationSeconds)
        if (durationDiff < 300) { // Within 5 minutes
          score += 2
        }
      }

      // Popularity boost
      const popularityScore = Math.log(1 + upload.viewCount + upload.likeCount)
      score += popularityScore * 0.5

      // Recency boost
      const ageInDays = (Date.now() - new Date(upload.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (ageInDays < 7) {
        score += 2
      }

      return { upload, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.upload)

  return related
}

export interface ChannelOverride {
  id: string
  title: string
  avatar: string
}

export function mapStoredUploadToVideo(upload: StoredUpload, channel?: ChannelOverride) {
  const durationIso = secondsToIsoDuration(upload.durationSeconds)

  const channelTitle = channel?.title ?? DEFAULT_CHANNEL.title
  const channelId = channel?.id ?? DEFAULT_CHANNEL.id
  const channelAvatar = channel?.avatar ?? DEFAULT_CHANNEL.avatar

  return {
    id: upload.id,
    title: upload.title,
    description: upload.description,
    thumbnail: upload.thumbnailPath || '/placeholder.svg',
    channelTitle,
    channelId,
    channelAvatar,
    publishedAt: upload.createdAt,
    viewCount: ((upload.viewCount ?? 0)).toString(),
    duration: durationIso,
    isLocal: true,
    isShort: upload.type === 'short',
    filePath: upload.filePath,
    category: upload.category || 'General',
    tags: upload.tags || [],
    visibility: upload.visibility || 'public',
    likeCount: upload.likeCount ?? 0,
    dislikeCount: upload.dislikeCount ?? 0,
    commentCount: upload.commentCount ?? 0,
    ownerId: upload.ownerId,
  }
}

export function createUploadId(type: 'video' | 'short') {
  return `${type === 'short' ? 'short' : 'video'}_${randomUUID()}`
}

export { UPLOAD_DIR, THUMBNAIL_DIR }
