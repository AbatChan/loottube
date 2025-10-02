import React from 'react'
import { cn } from "@/lib/utils"

export function SkeletonThumbnail({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "aspect-video w-full rounded-xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export function SkeletonText({ className, width, height = "h-4", ...props }: React.HTMLAttributes<HTMLDivElement> & { width?: string, height?: string }) {
  return (
    <div
      className={cn(
        `${height} ${width || "w-full"} rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse`,
        className
      )}
      {...props}
    />
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col">
      <SkeletonThumbnail />
      <div className="mt-3 flex">
        <SkeletonAvatar />
        <div className="ml-2 flex-1 space-y-2">
          <SkeletonText width="w-3/4" />
          <SkeletonText width="w-1/2" />
          <SkeletonText width="w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function ChannelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-44 w-full rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse md:h-60" />
      <div className="flex items-start gap-6">
        <SkeletonAvatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background" />
        <div className="space-y-3 w-full max-w-xl">
          <SkeletonText width="w-64" height="h-7" />
          <SkeletonText width="w-40" />
          <div className="flex gap-4">
            <SkeletonText width="w-24" />
            <SkeletonText width="w-20" />
            <SkeletonText width="w-16" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
            <div className="h-10 w-24 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="h-10 w-20 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
          <div className="h-10 w-20 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
          <div className="h-10 w-20 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
          <div className="h-10 w-20 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <div className="h-96 w-full rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <VideoCardSkeleton />
              <VideoCardSkeleton />
              <VideoCardSkeleton />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-40 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
              <div className="h-40 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ShortsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col">
          <div className="aspect-[9/16] w-full rounded-xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function VideoGridSkeleton({ columns = 4, rows = 2 }: { columns?: number; rows?: number }) {
  const gridClass =
    columns <= 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

  const effectiveColumns = columns <= 1 ? 1 : columns
  const placeholderCount = Math.max(effectiveColumns * rows, rows)

  return (
    <div className={`grid gap-4 p-4 ${gridClass}`}>
      {Array.from({ length: placeholderCount }).map((_, index) => (
        <VideoCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function RelatedVideosSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <SkeletonText width="w-48" height="h-6" />
          <div className="grid gap-4">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="h-20 w-32 flex-shrink-0 rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-full" height="h-4" />
                  <SkeletonText width="w-2/3" height="h-3" />
                  <SkeletonText width="w-1/2" height="h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
