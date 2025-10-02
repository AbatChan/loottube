import { Suspense } from 'react'
import { VideoPageSkeleton } from '@/components/VideoPageSkeleton'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { WatchClient } from './WatchClient'

async function getVideoData(videoId: string, baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/videos/${videoId}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      if (response.status === 404) {
        notFound()
      }
      // Don't throw for other errors, let the client handle it
      console.warn(`Video fetch failed with status ${response.status}`)
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error loading video:', error)
    // Return null instead of throwing to prevent server error
    return null
  }
}

interface PageProps {
  params: Promise<{ videoId: string }>
}

export default async function WatchPage(props: PageProps) {
  const params = await props.params
  const videoId = params.videoId
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3002'
  const protocol = headersList.get('x-forwarded-proto') ?? 'http'
  const baseUrl = `${protocol}://${host}`
  const videoData = await getVideoData(videoId, baseUrl)

  // If video data couldn't be fetched, show not found
  if (!videoData) {
    notFound()
  }

  return (
    <Suspense fallback={<VideoPageSkeleton />}>
      <WatchClient video={videoData} />
    </Suspense>
  )
}
