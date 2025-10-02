import React, { useState } from 'react'
import Link from 'next/link'
import { formatDuration, formatTimeAgo, formatViewCount } from '@/lib/format'
import { VideoPlaceholder } from '@/components/DefaultPlaceholder'
import { RelatedVideo } from '@/types'

interface RelatedVideoCardProps {
  video: RelatedVideo
}

export function RelatedVideoCard({ video }: RelatedVideoCardProps) {
  const [thumbnailError, setThumbnailError] = useState(false)
  const viewsLabel = video.viewCount ? `${formatViewCount(video.viewCount)} views` : null
  const metaLabel = [viewsLabel, formatTimeAgo(video.publishedAt)].filter(Boolean).join(' • ')
  const durationLabel = video.duration && video.duration !== 'PT0S'
    ? formatDuration(video.duration)
    : null

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group flex gap-3 rounded-xl p-2 transition hover:bg-muted/40"
    >
      <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg">
        {thumbnailError ? (
          <VideoPlaceholder text={video.title.substring(0, 12)} />
        ) : (
          <img
            src={video.thumbnail || '/placeholder.svg'}
            alt={video.title}
            className="h-full w-full object-cover"
            onError={() => setThumbnailError(true)}
          />
        )}
        {durationLabel && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {durationLabel}
          </span>
        )}
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="line-clamp-2 text-sm font-medium group-hover:text-primary">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
        <p className="text-xs text-muted-foreground">{metaLabel}</p>
      </div>
    </Link>
  )
}
