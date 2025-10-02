"use client"

export function ShortsViewerSkeleton() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full flex-col items-center justify-center sm:h-[90%] sm:w-[455px] lg:w-[503px]">
        <div className="absolute inset-0 rounded-none bg-white/10 sm:rounded-[32px] animate-pulse" />
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-4 text-white sm:rounded-[32px]">
          <div className="flex justify-between">
            <div className="h-10 w-10 rounded-full bg-white/30 animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-white/30 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-white/40 animate-pulse" />
            <div className="h-3 w-28 rounded bg-white/30 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/30 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-white/30 animate-pulse" />
                <div className="h-3 w-24 rounded bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 right-6 z-20 flex flex-col items-center gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
