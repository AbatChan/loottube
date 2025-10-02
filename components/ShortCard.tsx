import React from 'react'
import Link from 'next/link'
import { formatViewCount } from '@/lib/format'

interface ShortCardProps {
  short: {
    id: string
    title: string
    thumbnail: string
    viewCount: string
  }
  width: string
}

export function ShortCard({ short, width }: ShortCardProps) {
  return (
    <div className={`relative flex-shrink-0 ${width}`}>
      <Link 
        href={`/shorts/${short.id}`}
        className="block aspect-[9/16] overflow-hidden rounded-xl relative"
      >
        <img 
          src={short.thumbnail} 
          alt={short.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-medium line-clamp-2 text-sm">
              {short.title}
            </h3>
            <p className="text-white/90 text-sm mt-1">
              {formatViewCount(short.viewCount)} views
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}