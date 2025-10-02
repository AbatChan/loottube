import { useState, useEffect } from 'react'
import { getPopularVideos, getShorts, YouTubeVideo } from '@/lib/youtube'

export function useYouTubeData(selectedCategory: string = 'All') {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [shorts, setShorts] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [videosData, shortsData] = await Promise.all([
          getPopularVideos(selectedCategory),
          getShorts(selectedCategory)
        ])

        setVideos(videosData.videos)
        setShorts(shortsData.shorts)
      } catch (err) {
        console.error('Error fetching YouTube data:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedCategory])

  return { videos, shorts, isLoading, error }
}