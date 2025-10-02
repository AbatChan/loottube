'use client'

import { use } from 'react'
import { ChannelPageClient } from './ChannelPageClient'
import { ShortsPageClient } from './ShortsPageClient'
import { VideoPageClient } from './VideoPageClient'
import { NotFound } from '@/components/NotFound'

interface PageProps {
  params: Promise<{
    slug: string[]
  }>
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params)
  const { slug } = resolvedParams

  if (!slug || slug.length === 0) {
    return <NotFound type="page" />
  }

  const [firstSegment, ...rest] = slug

  // Handle /shorts route
  if (firstSegment === 'shorts') {
    if (rest.length === 0) {
      // /shorts - show shorts feed
      return <ShortsPageClient />
    } else if (rest.length === 1) {
      // /shorts/[shortId] - show specific short
      return <ShortsPageClient shortId={rest[0]} />
    }
    return <NotFound type="shorts" />
  }

  // Note: /watch routes are handled by the dedicated /app/watch/[videoId] route

  // Handle channel routes (/@channelName)
  if (firstSegment.startsWith('@') && rest.length === 0) {
    return <ChannelPageClient channelName={firstSegment} />
  }

  // Default to channel for backwards compatibility
  if (rest.length === 0) {
    return <ChannelPageClient channelName={firstSegment} />
  }

  return <NotFound type="page" />
}