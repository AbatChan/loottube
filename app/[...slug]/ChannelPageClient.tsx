'use client'

import { useEffect, useState } from 'react'
import { ChannelPage } from '@/app/channel-page'
import { getCurrentUser, type User } from '@/lib/userAuth'
import { NotFound } from '@/components/NotFound'

interface ChannelData {
  channel: {
    id: string
    title: string
    handle: string
    description: string
    avatar: string
    banner: string
    subscribers: string
    totalViews: string
    videoCount: string
    joinedAt: string | null
    isEditable?: boolean
    ownerId?: string
  }
  videos: Array<{
    id: string
    title: string
    description: string
    thumbnail: string
    publishedAt: string
    viewCount: string
    duration: string
  }>
  shorts: Array<{
    id: string
    title: string
    description: string
    thumbnail: string
    publishedAt: string
    viewCount: string
    duration: string
  }>
}

interface ChannelPageClientProps {
  channelName: string
}


export function ChannelPageClient({ channelName }: ChannelPageClientProps) {
  const [channelData, setChannelData] = useState<ChannelData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser] = useState<User | null>(() => getCurrentUser())

  useEffect(() => {
    async function fetchChannelData() {
      try {
        setIsLoading(true)

        // Get current user to send user-specific info for local channels
        const url = new URL(`/api/channels/${channelName}`, window.location.origin)

        if (currentUser) {
          url.searchParams.set('userId', currentUser.id)
          url.searchParams.set('currentUserChannelName', currentUser.channelName)
          if (currentUser.channelHandle) {
            url.searchParams.set('currentUserHandle', currentUser.channelHandle)
          }
        }

        const response = await fetch(url.toString(), {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch channel data')
        }

        const data = await response.json()
        setChannelData(data)
      } catch (error) {
        // Channel not found - this is expected behavior, will show 404 page
        setChannelData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChannelData()
  }, [channelName, currentUser])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!channelData) {
    return (
      <NotFound
        type="channel"
        itemName={channelName}
        searchQuery={channelName.replace(/^@/, '')}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <ChannelPage
      channel={channelData.channel}
      videos={channelData.videos}
      shorts={channelData.shorts}
      currentUserId={currentUser?.id}
    />
  )
}
