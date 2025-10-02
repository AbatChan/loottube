import React from 'react'
import Link from 'next/link'
import { Home, Search, User, Play, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NotFoundProps {
  type: 'channel' | 'video' | 'shorts' | 'page'
  itemName?: string
  searchQuery?: string
  onRetry?: () => void
}

export function NotFound({ type, itemName, searchQuery, onRetry }: NotFoundProps) {
  const getContent = () => {
    switch (type) {
      case 'channel':
        return {
          icon: <User className="w-10 h-10 text-muted-foreground" />,
          title: 'Channel not found',
          description: `The channel "${itemName}" doesn't exist or may have been removed.`
        }
      case 'video':
        return {
          icon: <Video className="w-10 h-10 text-muted-foreground" />,
          title: 'Video not found',
          description: `The video "${itemName || 'you\'re looking for'}" doesn't exist or may have been removed.`
        }
      case 'shorts':
        return {
          icon: <Play className="w-10 h-10 text-muted-foreground" />,
          title: 'Short not found',
          description: `The short "${itemName || 'you\'re looking for'}" doesn't exist or may have been removed.`
        }
      default:
        return {
          icon: <Home className="w-10 h-10 text-muted-foreground" />,
          title: 'Page not found',
          description: 'The page you\'re looking for doesn\'t exist or may have been moved.'
        }
    }
  }

  const content = getContent()
  const handleSearch = () => {
    if (searchQuery) {
      window.location.href = `/?search=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
        {content.icon}
      </div>

      <h1 className="text-2xl font-bold mb-2 text-foreground">
        {content.title}
      </h1>

      <p className="text-muted-foreground mb-8 max-w-md">
        {content.description}
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/">
          <Button className="flex items-center gap-2 rounded-full">
            <Home className="w-4 h-4" />
            Go to Home
          </Button>
        </Link>

        {searchQuery && (
          <Button variant="outline" onClick={handleSearch} className="flex items-center gap-2 rounded-full">
            <Search className="w-4 h-4" />
            Search for "{searchQuery}"
          </Button>
        )}

        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="rounded-full">
            Try again
          </Button>
        )}
      </div>

      <div className="mt-12 p-6 bg-muted/50 rounded-lg max-w-md">
        <h3 className="font-semibold mb-2 text-foreground">Looking for something specific?</h3>
        <p className="text-sm text-muted-foreground">
          You can browse trending videos, search for content, or explore different categories from the homepage.
        </p>
      </div>
    </div>
  )
}