import React from 'react'
import { VideoGridSkeleton } from './SkeletonLoader'

export function LoadingSpinner() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/brand/logo.svg" 
              alt="be" 
              className="h-12 w-12"
            />
          </div>
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
      <VideoGridSkeleton columns={4} />
    </div>
  )
}