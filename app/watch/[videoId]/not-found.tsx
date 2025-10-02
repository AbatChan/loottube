'use client'

import { NotFound } from '@/components/NotFound'

export default function VideoNotFound() {
  return (
    <NotFound
      type="video"
      onRetry={() => window.location.reload()}
    />
  )
}