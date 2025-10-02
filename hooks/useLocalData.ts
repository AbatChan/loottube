import { useCallback, useEffect, useState } from 'react'
import { YouTubeVideo } from '@/lib/youtube'
import { getCurrentUser } from '@/lib/userAuth'

interface UploadResponse {
  videos: YouTubeVideo[]
  shorts: YouTubeVideo[]
}

export function useLocalData() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [shorts, setShorts] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refreshUploads = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get current user to send with request
      const currentUser = getCurrentUser()
      const url = new URL('/api/uploads', window.location.origin)
      if (currentUser) {
        url.searchParams.set('userId', currentUser.id)
        url.searchParams.set('channelId', currentUser.channelId)
        url.searchParams.set('channelName', currentUser.channelName)
      }

      // Add smart algorithm parameters
      if (typeof window !== 'undefined') {
        // Get user's selected location
        const userLocation = localStorage.getItem('lootube_location')
        if (userLocation) {
          url.searchParams.set('userRegion', userLocation)
        }

        // Pass user ID for personalization
        if (currentUser) {
          url.searchParams.set('requestUserId', currentUser.id)
        }

        // Use balanced feed mode by default
        url.searchParams.set('feedMode', 'balanced')
      }

      const response = await fetch(url.toString(), { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load uploads')
      }
      const data = (await response.json()) as UploadResponse
      setVideos(data.videos || [])
      setShorts(data.shorts || [])
      setError(null)
    } catch (err) {
      console.error('Error loading uploads:', err)
      setError(err instanceof Error ? err : new Error('Unknown upload error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUploads()
  }, [refreshUploads])

  const addVideo = useCallback((video: YouTubeVideo) => {
    setVideos((prev) => [video, ...prev])
  }, [])

  const addShort = useCallback((short: YouTubeVideo) => {
    setShorts((prev) => [short, ...prev])
  }, [])

  return {
    videos,
    shorts,
    addVideo,
    addShort,
    refreshUploads,
    isLoading,
    error,
  }
}
