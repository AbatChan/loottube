import { cn } from "@/lib/utils"

interface RelatedVideoCardSkeletonProps {
  className?: string
}

export function RelatedVideoCardSkeleton({ className }: RelatedVideoCardSkeletonProps) {
  return (
    <div className={cn("flex gap-3 rounded-xl p-2", className)}>
      <div className="h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
