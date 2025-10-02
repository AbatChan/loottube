'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser, type User } from '@/lib/userAuth'
import { NotFound } from '@/components/NotFound'
import { Shorts } from '@/components/Shorts'

interface ShortsPageClientProps {
  shortId?: string
}

export function ShortsPageClient({ shortId }: ShortsPageClientProps) {
  const [shorts, setShorts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser] = useState<User | null>(() => getCurrentUser())

  useEffect(() => {
    async function fetchShorts() {
      try {
        setIsLoading(true)

        // Fetch shorts data
        const response = await fetch('/api/youtube?type=shorts&region=US&category=All', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch shorts data')
        }

        const data = await response.json()
        setShorts(data.shorts || [])
      } catch (error) {
        console.error('Error loading shorts data:', error)
        setShorts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchShorts()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (shortId) {
    // Find specific short
    const targetShort = shorts.find(s => s.id === shortId)
    if (!targetShort) {
      return (
        <NotFound
          type="shorts"
          itemName={shortId}
          onRetry={() => window.location.reload()}
        />
      )
    }
    // Show shorts player starting with the specific short
    return <Shorts shorts={shorts} initialShortId={shortId} onBack={() => window.history.back()} />
  }

  if (shorts.length === 0) {
    return (
      <NotFound
        type="shorts"
        onRetry={() => window.location.reload()}
      />
    )
  }

  // Show shorts feed
  return <Shorts shorts={shorts} onBack={() => window.history.back()} />
}