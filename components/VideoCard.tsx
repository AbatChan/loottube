import React, { useState } from 'react'
import Link from 'next/link'
import { formatTimeAgo, formatViewCount, formatDuration } from '@/lib/format'
import { VideoPlaceholder, AvatarPlaceholder } from '@/components/DefaultPlaceholder'

interface VideoCardProps {
  video: {
    id: string
    title: string
    thumbnail: string
    channelTitle: string
    channelId: string
    channelAvatar: string
    viewCount: string
    publishedAt: string
    duration: string
    isLocal?: boolean
  }
}

export function VideoCard({ video }: VideoCardProps) {
  const [thumbnailError, setThumbnailError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const timeAgo = formatTimeAgo(video.publishedAt)

  // Convert channel title to URL-safe format
  const channelNameForUrl = video.channelTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  return (
    <div className="relative">
      <Link 
        href={`/watch/${video.id}`} 
        className="block aspect-video overflow-hidden rounded-xl relative"
      >
        {thumbnailError ? (
          <VideoPlaceholder text={video.title.substring(0, 20)} />
        ) : (
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover"
            onError={() => setThumbnailError(true)}
          />
        )}
        {!video.isLocal && (
          <div className="absolute bottom-2 right-2 px-1 py-0.5 bg-black bg-opacity-80 text-white text-xs rounded">
            {formatDuration(video.duration)}
          </div>
        )}
      </Link>
      <div className="mt-3 flex">
        <Link
          href={`/@${channelNameForUrl}`}
          className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0"
        >
          {avatarError ? (
            <AvatarPlaceholder text={video.channelTitle.charAt(0).toUpperCase()} />
          ) : (
            <img 
              src={video.channelAvatar}
              alt={video.channelTitle}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          )}
        </Link>
        <div className="ml-2 flex-1">
          <Link href={`/watch/${video.id}`}>
            <h3 className="font-medium line-clamp-2 text-sm leading-5">
              {video.title}
            </h3>
          </Link>
          <Link
            href={`/@${channelNameForUrl}`}
            className="text-sm text-muted-foreground mt-1"
          >
            {video.channelTitle}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatViewCount(video.viewCount)} views • {timeAgo}
            {video.isLocal && " • Local"}
          </p>
        </div>
      </div>
    </div>
  )
}