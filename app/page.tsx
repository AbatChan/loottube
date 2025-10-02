'use client'

import React, { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Home, Search, User, Play, Upload, Sun, Moon, Settings, LogOut, HelpCircle, Globe, Keyboard, DollarSign, FileText, UserCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from '@/components/Logo'
import { AuthForm } from '@/components/AuthForm'
import { getCurrentUser, signOut, AuthResult } from '@/lib/userAuth'
import { NotificationsDialog } from '@/components/NotificationsDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useYouTubeData } from "@/hooks/useYouTubeData"
import { useLocalData } from "@/hooks/useLocalData"
import { UploadDialog } from "./upload-dialog"
import { ChannelPage } from "./channel-page"
import { Shorts } from "../components/Shorts"
import { UserMenu } from "@/components/UserMenu"
import { VideoCard } from "@/components/VideoCard"
import { ShortsSection } from "@/components/ShortsSection"
import { VideoGridSkeleton, ShortsSkeleton } from '@/components/SkeletonLoader'
import { useTheme } from '@/components/ThemeProvider'

const categories = [
  "All",
  ...shuffle([
    "Music", "Gaming", "Movies", "Live", "News", "Sports",
    "Fashion", "Beauty", "Comedy", "Entertainment", "Technology",
    "Vlogs", "Podcasts", "Pets",
    "Science", "DIY", "Finance", "Fitness", "Art"
  ])
]

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export default function Lootube() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showMoreFirstShorts, setShowMoreFirstShorts] = useState(false)
  const [showMoreSecondShorts, setShowMoreSecondShorts] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showChannelPage, setShowChannelPage] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'shorts'>('home')
  const [canScrollCategories, setCanScrollCategories] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const categoriesRef = useRef<HTMLDivElement>(null)
  const firstShortsRef = useRef<HTMLDivElement>(null)
  const secondShortsRef = useRef<HTMLDivElement>(null)

  // YouTube API data
  const {
    videos: youtubeVideos,
    shorts: youtubeShorts,
    isLoading: isYoutubeLoading,
    error: youtubeError
  } = useYouTubeData(selectedCategory)

  // Local data
  const {
    videos: localVideos,
    shorts: localShorts,
    addVideo,
    addShort,
    refreshUploads
  } = useLocalData()

  const localChannelData = useMemo(() => {
    return {
      channel: {
        id: 'your-channel',
        title: 'Your Channel',
        handle: '@yourchannel',
        description: "Welcome to your personal channel feed. Upload videos to see them showcased here.",
        avatar: '/placeholder.svg',
        banner: '/brand/banner.svg',
        subscribers: '0',
        totalViews: localVideos.reduce((acc, video) => acc + parseInt(video.viewCount || '0', 10), 0).toString(),
        videoCount: localVideos.length.toString(),
        joinedAt: null as string | null,
      },
      videos: localVideos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description ?? '',
        thumbnail: video.thumbnail || '/placeholder.svg',
        publishedAt: video.publishedAt,
        viewCount: video.viewCount ?? '0',
        duration: video.duration ?? 'PT0S',
        filePath: video.filePath,
      })),
      shorts: localShorts.map((short) => ({
        id: short.id,
        title: short.title,
        description: short.description ?? '',
        thumbnail: short.thumbnail || '/placeholder.svg',
        publishedAt: short.publishedAt,
        viewCount: short.viewCount ?? '0',
        duration: short.duration ?? 'PT0S',
        filePath: short.filePath,
      })),
    }
  }, [localVideos, localShorts])

  // Combine YouTube and local data with ranking
  const allVideos = useMemo(() => {
    const currentUser = getCurrentUser()
    const combined = [...(localVideos || []), ...(youtubeVideos || [])]

    // Filter out current user's own content
    const filtered = currentUser
      ? combined.filter(v => v.channelId !== currentUser.channelId && v.ownerId !== currentUser.id)
      : combined

    // Sort local videos by ranking algorithm
    const localVids = filtered.filter(v => v.isLocal)
    const youtubeVids = filtered.filter(v => !v.isLocal)

    // Apply ranking to local videos
    const rankedLocal = localVids.map(video => ({
      video,
      rank: calculateRank(video)
    })).sort((a, b) => b.rank - a.rank).map(item => item.video)

    // Interleave ranked local videos with YouTube videos for better discovery
    return [...rankedLocal, ...youtubeVids]
  }, [localVideos, youtubeVideos])

  // Simple ranking function for client-side
  const calculateRank = (video: any) => {
    const views = Number(video.viewCount || 0)
    const likes = Number(video.likeCount || 0)
    const comments = Number(video.commentCount || 0)
    const publishedAt = new Date(video.publishedAt || Date.now()).getTime()
    const ageInHours = (Date.now() - publishedAt) / (1000 * 60 * 60)
    const ageDecay = Math.exp(-ageInHours / 168) // 1 week half-life
    const freshnessBoost = ageInHours < 24 ? 1.5 : 1

    const baseScore = Math.log(1 + views) * Math.log(1 + likes) * Math.log(1 + comments)
    return baseScore * ageDecay * freshnessBoost
  }

  const allShorts = useMemo(() => {
    const currentUser = getCurrentUser()
    const combined = [...(localShorts || []), ...(youtubeShorts || [])]

    // Filter out current user's own content
    return currentUser
      ? combined.filter(s => s.channelId !== currentUser.channelId && s.ownerId !== currentUser.id)
      : combined
  }, [localShorts, youtubeShorts])

  const filteredVideos = useMemo(() => {
    if (!searchQuery) return allVideos
    return allVideos.filter(video =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.channelTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, allVideos])

  const updateSearchInURL = (query: string) => {
    const params = new URLSearchParams(searchParams)
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    const newURL = params.toString() ? `/?${params.toString()}` : '/'
    router.replace(newURL, { scroll: false })
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    updateSearchInURL(query)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setIsSearchOpen(false)
    updateSearchInURL("")
  }

  useEffect(() => {
    // Check if user was previously authenticated
    const currentUser = getCurrentUser();
    if (currentUser) {
      setIsAuthenticated(true);
      console.log('User logged in:', currentUser.email, 'Channel:', currentUser.channelName);
    }

    // Listen for user updates (sign in/out)
    const handleUserUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: any; previousUser: any }>
      const { user } = customEvent.detail
      setIsAuthenticated(!!user)
    }

    window.addEventListener('lootube:user-updated', handleUserUpdate)

    // Read search query from URL params
    const urlSearchQuery = searchParams.get('search')
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery)
    }

    return () => {
      window.removeEventListener('lootube:user-updated', handleUserUpdate)
    }
  }, [searchParams]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    const checkCategoriesScroll = () => {
      if (categoriesRef.current) {
        setCanScrollCategories(
          categoriesRef.current.scrollWidth > categoriesRef.current.clientWidth
        )
      }
    }

    checkCategoriesScroll()
    window.addEventListener('resize', checkCategoriesScroll)
    return () => window.removeEventListener('resize', checkCategoriesScroll)
  }, [])

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200
      categoriesRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setShowAuthDialog(true)
  }

  const handleAuthSubmit = (result: AuthResult) => {
    if (result.success) {
      setIsAuthenticated(true)
      setShowAuthDialog(false)
      if (result.user) {
        console.log('User signed in:', result.user.email, 'Channel:', result.user.channelName)
      }
    }
  }

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signOut()
      setIsAuthenticated(false)
    }
  }

  const handleUploadComplete = (videoData: any) => {
    if (videoData?.isShort) {
      addShort(videoData)
    } else {
      addVideo(videoData)
    }
    refreshUploads()
    setShowUploadDialog(false)
  }

  const gridColumns = isMobile ? 1 : 4
  const firstGridVideos = filteredVideos.slice(0, isMobile ? 5 : 12)
  const remainingVideos = filteredVideos.slice(isMobile ? 5 : 12)
  const showShortsRail = !isMobile && !isYoutubeLoading && allShorts.length > 0
  const showSecondaryShortsRail = !isMobile && !isYoutubeLoading && youtubeShorts.length > 0
  const betweenShortsCount = showShortsRail ? gridColumns * 2 : 0
  const videosBetweenShorts = betweenShortsCount ? remainingVideos.slice(0, betweenShortsCount) : []
  const trailingVideos = betweenShortsCount ? remainingVideos.slice(betweenShortsCount) : remainingVideos

  const renderVideoGridOrFallback = (videos: typeof filteredVideos, rows = 2) => {
    if (isYoutubeLoading) {
      return <VideoGridSkeleton columns={gridColumns} rows={rows} />
    }
    if (videos.length === 0) {
      return null
    }
    return <VideoGrid videos={videos} columns={gridColumns} />
  }

  if (isYoutubeLoading && !localVideos.length && !localShorts.length) {
    const fallbackSections: Array<{ type: 'videos' | 'shorts'; rows?: number }> = [
      { type: 'videos', rows: 3 },
      { type: 'shorts' },
      { type: 'videos', rows: 2 },
      { type: 'shorts' },
      { type: 'videos', rows: 3 },
    ]

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-background/95 px-4 shadow-[0_1px_0_0_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:backdrop-blur dark:bg-background/80 dark:shadow-[0_1px_0_0_rgba(148,163,184,0.2)]">
          {/* Simple header skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-6 w-24 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </header>
        <main className="flex-1 overflow-y-auto space-y-8 p-4">
          {fallbackSections.map((section, index) => {
            if (section.type === 'shorts') {
              if (isMobile) {
                return null
              }
              return <ShortsSkeleton key={`shorts-${index}`} />
            }

            return (
              <VideoGridSkeleton
                key={`videos-${index}`}
                columns={isMobile ? 1 : 4}
                rows={section.rows ?? 2}
              />
            )
          })}
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <style jsx global>{`
        * {
          border-width: 0;
        }
      `}</style>
      {activeTab !== 'shorts' && (
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-background/95 px-4 shadow-[0_1px_0_0_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:backdrop-blur dark:bg-background/80 dark:shadow-[0_1px_0_0_rgba(148,163,184,0.2)]">
          <Link href="/" className="flex items-center space-x-2">
            <Logo variant={isMobile ? 'small' : 'default'} linkWrapper={false} />
          </Link>
          
          {isMobile ? (
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Search className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl sm:rounded-2xl">
                <DialogTitle className="sr-only">Search</DialogTitle>
                <DialogDescription>
                  Search for videos and channels
                </DialogDescription>
                <div className="flex w-full items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search videos..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full rounded-full border border-border/80 bg-background/80 px-4 py-2 pr-10 text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-0 dark:border-white/20 dark:bg-background/60"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                      {searchQuery && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={clearSearch}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear search</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Submit search</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex max-w-xl flex-1 items-center justify-center px-4">
              <div className="relative flex w-full items-center">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-full border border-border/80 bg-background/80 px-4 py-1.5 pr-20 text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-0 dark:border-white/20 dark:bg-background/60"
                />
                <div className="absolute right-1 flex items-center space-x-1">
                  {searchQuery && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearSearch}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear search</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Submit search</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}

          {!isMobile && (
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setShowUploadDialog(true)}>
                          <Upload className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upload video</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <NotificationsDialog />
                </>
              ) : (
                <Button variant="outline" className="rounded-full" onClick={() => handleAuth('signin')}>Sign In</Button>
              )}
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {theme === 'light' ? (
                            <Sun className="h-5 w-5" />
                          ) : theme === 'dark' ? (
                            <Moon className="h-5 w-5" />
                          ) : (
                            <span className="h-5 w-5 flex items-center justify-center">
                              <Sun className="h-4 w-4 dark:hidden" />
                              <Moon className="hidden h-4 w-4 dark:block" />
                            </span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Appearance</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isAuthenticated && <UserMenu theme={theme} setTheme={setTheme} onSignOut={handleSignOut} />}
            </div>
          )}
        </header>
      )}

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {showChannelPage ? (
          <ChannelPage
            channel={localChannelData.channel}
            videos={localChannelData.videos}
            shorts={localChannelData.shorts}
          />
        ) : activeTab === 'shorts' ? (
          <Shorts shorts={allShorts} onBack={() => setActiveTab('home')} />
        ) : (
          <>
            {!(searchQuery && filteredVideos.length === 0) && (
              <div className="relative">
                {canScrollCategories && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
                          onClick={() => scrollCategories('left')}
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Scroll categories left</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <ScrollArea className="w-full whitespace-nowrap py-4">
                  <div ref={categoriesRef} className="flex space-x-2 px-4">
                  {categories.map((category) => (
                      <Button
                        key={category}
                        variant={category === selectedCategory ? "default" : "secondary"}
                        className={`rounded-full flex-shrink-0 ${
                          category === "All" ? "order-first" : ""
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
                {canScrollCategories && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
                          onClick={() => scrollCategories('right')}
                        >
                          <ChevronRight className="h-6 w-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Scroll categories right</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {searchQuery && filteredVideos.length === 0 ? (
              <EmptyState onClear={clearSearch} />
            ) : (
              <>
                {youtubeError && localVideos.length === 0 && (
                  <div className="p-4 text-center text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mx-4 my-2">
                    Couldn't load YouTube videos. Showing local content only.
                  </div>
                )}
                {renderVideoGridOrFallback(firstGridVideos, 3)}

                {isYoutubeLoading && !isMobile && <ShortsSkeleton />}

                {showShortsRail && (
                  <>
                    <ShortsSection
                      title="Shorts"
                      shorts={allShorts.slice(0, 20)}
                      showMore={showMoreFirstShorts}
                      setShowMore={setShowMoreFirstShorts}
                      scrollRef={firstShortsRef}
                      isMobile={isMobile}
                      isTablet={isTablet}
                    />
                    {videosBetweenShorts.length > 0 && renderVideoGridOrFallback(videosBetweenShorts, 2)}
                  </>
                )}

                {showSecondaryShortsRail && (
                  <ShortsSection
                    title="Shorts"
                    shorts={youtubeShorts.slice(10)}
                    showMore={showMoreSecondShorts}
                    setShowMore={setShowMoreSecondShorts}
                    scrollRef={secondShortsRef}
                    isMobile={isMobile}
                    isTablet={isTablet}
                  />
                )}

                {renderVideoGridOrFallback(trailingVideos, showSecondaryShortsRail ? 3 : 2)}
              </>
            )}
          </>
        )}
      </main>

      {isMobile && activeTab !== 'shorts' && (
        <footer className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border/80 bg-background dark:border-white/15">
          <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => setActiveTab('home')}>
            <Home className="h-full w-full" />
            <span className="text-xs mt-1">Home</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => setActiveTab('shorts')}>
            <Play className="h-full w-full" />
            <span className="text-xs mt-1">Shorts</span>
          </Button>
          {isAuthenticated ? (
            <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-full w-full" />
              <span className="text-xs mt-1">Create</span>
            </Button>
          ) : (
            <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => handleAuth('signin')}>
              <User className="h-full w-full" />
              <span className="text-xs mt-1">Sign In</span>
            </Button>
          )}
          {isAuthenticated && (
            <UserMenu
              theme={theme}
              setTheme={setTheme}
              onSignOut={handleSignOut}
              isMobile
            />
          )}
        </footer>
      )}

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] max-h-[80vh] rounded-xl bg-background text-foreground sm:rounded-2xl">
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <DialogTitle>{authMode === 'signin' ? 'Sign In' : 'Sign Up'} to Lootube</DialogTitle>
            <AuthForm
              mode={authMode}
              onSuccess={handleAuthSubmit}
              onToggle={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
            />
          </div>
        </DialogContent>
      </Dialog>

      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}

function VideoGrid({ videos, columns }: { videos: any[], columns: number }) {
  const gridClass =
    columns <= 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : columns === 3
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

  let sanitizedVideos = videos
  if (columns > 1) {
    const fullCount = Math.floor(videos.length / columns) * columns
    if (fullCount >= columns && fullCount !== videos.length) {
      sanitizedVideos = videos.slice(0, fullCount)
    }
  }

  return (
    <div className={`grid gap-4 p-4 ${gridClass}`}>
      {sanitizedVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4 text-center">
      <svg
        className="h-16 w-16 text-gray-400 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h2 className="text-2xl font-semibold mb-2">No results found</h2>
      <p className="text-gray-600 mb-4">
        We couldn't find any videos matching your search. Try different keywords or check for typos.
      </p>
      <Button onClick={onClear} className="rounded-full">Clear search</Button>
    </div>
  )
}

