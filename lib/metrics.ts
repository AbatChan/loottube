// Client-side helper functions for updating video/short metrics on the server

type MetricAction =
  | 'incrementView'
  | 'incrementLike'
  | 'decrementLike'
  | 'incrementDislike'
  | 'decrementDislike'
  | 'incrementComment'
  | 'decrementComment'
  | 'setMetrics'

interface MetricsResponse {
  success: boolean
  metrics: {
    viewCount: number
    likeCount: number
    dislikeCount: number
    commentCount: number
  }
}

async function updateMetric(
  id: string,
  type: 'video' | 'short',
  action: MetricAction,
  value?: any
): Promise<MetricsResponse | null> {
  try {
    const endpoint = type === 'video' ? `/api/videos/${id}` : `/api/shorts/${id}`
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, value }),
    })

    if (!response.ok) {
      console.error(`Failed to update ${type} metric:`, await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Error updating ${type} metric:`, error)
    return null
  }
}

// Video metric functions
export async function incrementVideoView(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'incrementView')
}

export async function incrementVideoLike(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'incrementLike')
}

export async function decrementVideoLike(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'decrementLike')
}

export async function incrementVideoDislike(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'incrementDislike')
}

export async function decrementVideoDislike(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'decrementDislike')
}

export async function incrementVideoComment(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'incrementComment')
}

export async function decrementVideoComment(videoId: string): Promise<MetricsResponse | null> {
  return updateMetric(videoId, 'video', 'decrementComment')
}

// Short metric functions
export async function incrementShortView(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'incrementView')
}

export async function incrementShortLike(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'incrementLike')
}

export async function decrementShortLike(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'decrementLike')
}

export async function incrementShortDislike(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'incrementDislike')
}

export async function decrementShortDislike(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'decrementDislike')
}

export async function incrementShortComment(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'incrementComment')
}

export async function decrementShortComment(shortId: string): Promise<MetricsResponse | null> {
  return updateMetric(shortId, 'short', 'decrementComment')
}

// Helper to determine if a video/short is local (uploaded by user)
export function isLocalContent(id: string): boolean {
  return id.startsWith('video_') || id.startsWith('short_')
}