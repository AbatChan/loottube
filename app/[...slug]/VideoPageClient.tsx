'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser, type User } from '@/lib/userAuth'
import { NotFound } from '@/components/NotFound'
import { VideoPage } from '@/components/VideoPage'

interface VideoPageClientProps {
  videoId: string
}

export function VideoPageClient({ videoId }: VideoPageClientProps) {
  const [video, setVideo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser] = useState<User | null>(() => getCurrentUser())

  useEffect(() => {
    async function fetchVideo() {
      try {
        setIsLoading(true)

        // Try to fetch video data from API
        const response = await fetch(`/api/videos/${videoId}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch video data')
        }

        const data = await response.json()
        setVideo(data)
      } catch (error) {
        console.error('Error loading video data:', error)
        setVideo(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!video) {
    return (
      <NotFound
        type="video"
        itemName={videoId}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return <VideoPage video={video} />
}