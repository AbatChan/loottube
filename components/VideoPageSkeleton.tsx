"use client"

import { RelatedVideoCardSkeleton } from "@/components/RelatedVideoCardSkeleton"

export function VideoPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-background/95 px-4 shadow-[0_1px_0_0_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:backdrop-blur dark:bg-background/80 dark:shadow-[0_1px_0_0_rgba(148,163,184,0.2)]">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="hidden w-full max-w-xl items-center space-x-2 px-4 sm:flex">
          <div className="h-10 w-full rounded-full bg-muted animate-pulse" />
        </div>
        <div className="hidden items-center space-x-2 sm:flex">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex items-center space-x-2 sm:hidden">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
      <main className="mt-6 w-full flex-1 px-4 pb-12 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-6">
          <section className="space-y-4">
            <div className="aspect-video w-full rounded-xl bg-muted animate-pulse" />
            <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="flex items-center gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 w-24 rounded-full bg-muted animate-pulse"
                  />
                ))}
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <div className="h-10 w-24 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="space-y-3 rounded-lg bg-muted/30 p-4">
              <div className="flex gap-3">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-16 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-5 w-36 rounded bg-muted animate-pulse" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-full rounded bg-muted animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 lg:hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <RelatedVideoCardSkeleton key={index} />
              ))}
            </div>
          </section>
          <aside className="mt-12 hidden w-full max-w-[400px] space-y-3 lg:mt-0 lg:block">
            {Array.from({ length: 6 }).map((_, index) => (
              <RelatedVideoCardSkeleton key={index} />
            ))}
          </aside>
        </div>
      </main>
    </div>
  )
}
