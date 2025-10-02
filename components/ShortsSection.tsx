import React, { useRef, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { ShortCard } from "./ShortCard"

interface ShortsSectionProps {
  title: string
  shorts: Array<{
    id: string
    title: string
    thumbnail: string
    channelTitle: string
    channelAvatar: string
    viewCount: string
    publishedAt: string
  }>
  showMore: boolean
  setShowMore: (showMore: boolean) => void
  scrollRef: React.RefObject<HTMLDivElement>
  isMobile: boolean
  isTablet: boolean
}

export function ShortsSection({
  title,
  shorts,
  showMore,
  setShowMore,
  scrollRef,
  isMobile,
  isTablet
}: ShortsSectionProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        setCanScrollLeft(scrollRef.current.scrollLeft > 0)
        setCanScrollRight(
          scrollRef.current.scrollLeft < 
          scrollRef.current.scrollWidth - scrollRef.current.clientWidth
        )
      }
    }

    const element = scrollRef.current
    if (element) {
      element.addEventListener('scroll', checkScroll)
      checkScroll()
    }

    return () => {
      if (element) {
        element.removeEventListener('scroll', checkScroll)
      }
    }
  }, [scrollRef, shorts, showMore])

  const scrollShorts = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const shortWidth = isMobile ? 'w-[160px]' : isTablet ? 'w-[200px]' : 'w-[240px]'

  return (
    <div className="relative my-8">
      <div className="mb-4 flex items-center justify-between px-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollShorts('left')}
            disabled={!canScrollLeft}
            className={cn(!canScrollLeft && "opacity-50")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollShorts('right')}
            disabled={!canScrollRight}
            className={cn(!canScrollRight && "opacity-50")}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto px-4 pb-4 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {shorts.slice(0, showMore ? shorts.length : 10).map((short) => (
          <ShortCard key={short.id} short={short} width={shortWidth} />
        ))}
      </div>
      {shorts.length > 10 && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowMore(!showMore)}
            className="flex items-center space-x-2 rounded-full px-4 py-2"
          >
            {showMore ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Show more</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
