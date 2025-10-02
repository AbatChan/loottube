'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { formatDuration, formatTimeAgo, formatViewCount } from '@/lib/format'
import { BannerPlaceholder, AvatarPlaceholder } from '@/components/DefaultPlaceholder'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Pencil, Sparkles, Upload, BarChart3, Download, Edit3, Trash2, Plus, CheckSquare, Square, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { UploadDialog } from '@/app/upload-dialog'
import { isChannelSubscribed, toggleChannelSubscription } from '@/lib/client-interactions'
import { updateStoredUserChannelDetails } from '@/lib/userAuth'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type RecentSubscriber = {
  id: string
  name: string
  avatar?: string
  subscribedAt?: string
}

interface ChannelPageProps {
  channel: {
    id: string
    title: string
    handle: string
    description: string
    avatar: string
    banner: string
    subscribers: string
    totalViews: string
    videoCount: string
    joinedAt: string | null
    isEditable?: boolean
    ownerId?: string
  }
  videos: Array<{
    id: string
    title: string
    description: string
    thumbnail: string
    publishedAt: string
    viewCount: string
    duration: string
    ownerId?: string
  }>
  shorts: Array<{
    id: string
    title: string
    description: string
    thumbnail: string
    publishedAt: string
    viewCount: string
    duration: string
    ownerId?: string
  }>
  recentSubscribers?: RecentSubscriber[]
  currentUserId?: string | null
  currentUserChannelId?: string | null
}

const formatJoinedDate = (date: string | null) => {
  if (!date) return 'Joined date unavailable'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  } catch (_) {
    return 'Joined date unavailable'
  }
}

const ANALYTICS_COLORS = [
  '#2563eb',
  '#06b6d4',
  '#ec4899',
  '#f97316',
  '#a855f7',
  '#22c55e',
  '#0ea5e9',
  '#f9a8d4',
]

const toRadians = (angle: number) => (angle * Math.PI) / 180

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const rad = toRadians(angle - 90)
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

const describeDonutSegment = (
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle)
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle)
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

type AnalyticsSlice = {
  id: string
  title: string
  viewCount: number
  publishedAt: string
  type: 'video' | 'short' | 'other'
  isAggregate?: boolean
}

const parseNumericString = (value: string) => {
  const numeric = Number(String(value ?? '0').replace(/[^0-9]/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

const VideoListItem = ({
  id,
  title,
  thumbnail,
  publishedAt,
  viewCount,
  duration,
  isSelected,
  onToggleSelect,
  isEditable,
}: ChannelPageProps['videos'][number] & {
  isSelected: boolean
  onToggleSelect?: (id: string, next?: boolean) => void
  isEditable: boolean
}) => {
  const formattedViews = `${formatViewCount(viewCount)} views`
  const publishedLabel = formatTimeAgo(publishedAt)
  const durationLabel = duration && duration !== 'PT0S' ? formatDuration(duration) : null

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-2xl border p-4 transition-all duration-200",
        "hover:shadow-md dark:border-white/10",
        isSelected
          ? 'border-primary/60 bg-primary/5 shadow-sm ring-2 ring-primary/20 dark:bg-primary/10'
          : 'border-border/60 bg-card/80 dark:bg-card/60'
      )}
    >
      {isEditable && (
        <div className="pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect?.(id, checked === true)}
          />
        </div>
      )}

      <Link href={`/watch/${id}`} className="flex-shrink-0">
        <div className="relative w-40 aspect-video overflow-hidden rounded-xl bg-muted shadow-sm">
          <Image
            src={thumbnail || '/placeholder.svg'}
            alt={title}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
          {durationLabel && (
            <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/90 px-1.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              {durationLabel}
            </span>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 pt-1">
        <Link href={`/watch/${id}`}>
          <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          {formattedViews} • {publishedLabel}
        </p>
      </div>
    </div>
  )
}

const ShortListItem = ({
  id,
  title,
  thumbnail,
  publishedAt,
  viewCount,
  duration,
  isSelected,
  onToggleSelect,
  isEditable,
}: ChannelPageProps['shorts'][number] & {
  isSelected: boolean
  onToggleSelect?: (id: string, next?: boolean) => void
  isEditable: boolean
}) => {
  const formattedViews = `${formatViewCount(viewCount)} views`
  const publishedLabel = formatTimeAgo(publishedAt)

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-2xl border p-4 transition-all duration-200",
        "hover:shadow-md dark:border-white/10",
        isSelected
          ? 'border-primary/60 bg-primary/5 shadow-sm ring-2 ring-primary/20 dark:bg-primary/10'
          : 'border-border/60 bg-card/80 dark:bg-card/60'
      )}
    >
      {isEditable && (
        <div className="pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect?.(id, checked === true)}
          />
        </div>
      )}

      <Link href={`/shorts/${id}`} className="flex-shrink-0">
        <div className="relative w-24 aspect-[9/16] overflow-hidden rounded-xl bg-muted shadow-sm">
          <Image
            src={thumbnail || '/placeholder.svg'}
            alt={title}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      </Link>

      <div className="flex-1 min-w-0 pt-1">
        <Link href={`/shorts/${id}`}>
          <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
            {title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          {formattedViews} • {publishedLabel}
        </p>
      </div>
    </div>
  )
}

const ShortGridCard = ({
  id,
  title,
  thumbnail,
  viewCount,
}: ChannelPageProps['shorts'][number]) => {
  const formattedViews = `${formatViewCount(viewCount)} views`

  return (
    <Link
      href={`/shorts/${id}`}
      className="group relative flex aspect-[9/16] w-full flex-col overflow-hidden rounded-2xl bg-muted shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Image
        src={thumbnail || '/placeholder.svg'}
        alt={title}
        fill
        sizes="(max-width: 768px) 45vw, 220px"
        className="object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
        <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/80">{formattedViews}</p>
      </div>
    </Link>
  )
}

const VideoCarouselItem = ({
  id,
  title,
  thumbnail,
  duration,
  viewCount,
  publishedAt,
}: ChannelPageProps['videos'][number]) => {
  const durationLabel = duration && duration !== 'PT0S' ? formatDuration(duration) : null

  return (
    <Link
      href={`/watch/${id}`}
      className="group flex w-60 shrink-0 flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background/80"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={thumbnail || '/placeholder.svg'}
          alt={title}
          fill
          sizes="240px"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {durationLabel && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
            {durationLabel}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="line-clamp-2 text-sm font-semibold text-foreground transition group-hover:text-primary">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatViewCount(viewCount)} views • {formatTimeAgo(publishedAt)}
        </p>
      </div>
    </Link>
  )
}

const VideoCarousel = ({ items }: { items: ChannelPageProps['videos'] }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollBy = (offset: number) => {
    const container = containerRef.current
    if (!container) return
    container.scrollBy({ left: offset, behavior: 'smooth' })
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll videos left"
        onClick={() => scrollBy(-320)}
        className="absolute left-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-lg transition hover:text-foreground lg:flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-1 py-2 pr-6"
      >
        {items.map((video) => (
          <VideoCarouselItem key={video.id} {...video} />
        ))}
      </div>
      <button
        type="button"
        aria-label="Scroll videos right"
        onClick={() => scrollBy(320)}
        className="absolute right-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-lg transition hover:text-foreground lg:flex"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

type ChannelTab = 'home' | 'videos' | 'shorts' | 'about' | 'analytics' | 'playlists' | 'watchlater'

export function ChannelPage({
  channel,
  videos,
  shorts,
  recentSubscribers = [],
  currentUserId,
}: ChannelPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialTab = useMemo<ChannelTab>(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam === 'videos' || tabParam === 'shorts' || tabParam === 'about' || tabParam === 'analytics' || tabParam === 'playlists' || tabParam === 'watchlater') {
      return tabParam
    }
    return 'home'
  }, [searchParams])

  const [tabValue, setTabValue] = useState<ChannelTab>(initialTab)
  const [currentChannel, setCurrentChannel] = useState(channel)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState({
    title: channel.title ?? '',
    handle: channel.handle?.replace(/^@/, '') ?? '',
    description: channel.description ?? '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(channel.avatar)
  const [bannerPreview, setBannerPreview] = useState(channel.banner)
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'>('idle')
  const [handleMessage, setHandleMessage] = useState<string | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [baseSubscriberCount, setBaseSubscriberCount] = useState(() => {
    const normalized = Number(String(channel.subscribers ?? '0').replace(/,/g, ''))
    return Number.isFinite(normalized) ? normalized : 0
  })
  const [subscriberCount, setSubscriberCount] = useState(baseSubscriberCount)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [showSparkle, setShowSparkle] = useState(false)
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [selectedShorts, setSelectedShorts] = useState<Set<string>>(new Set())
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false)
  const [playlists, setPlaylists] = useState<Array<{ id: string; title: string }>>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [pendingVideoIds, setPendingVideoIds] = useState<string[]>([])
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [bulkEditType, setBulkEditType] = useState<'video' | 'short'>('video')
  const [bulkEditIds, setBulkEditIds] = useState<string[]>([])
  const [bulkEditVisibility, setBulkEditVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [userPlaylists, setUserPlaylists] = useState<Array<{ id: string; title: string; description: string; videoIds: string[]; createdAt: string; visibility: string }>>([])
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false)
  const [viewingPlaylist, setViewingPlaylist] = useState<{ id: string; title: string; description: string; videoIds: string[]; createdAt: string; visibility: string } | null>(null)
  const [playlistVideos, setPlaylistVideos] = useState<Array<{ id: string; title: string; thumbnail: string; isShort: boolean }>>([])
  const [watchLaterVideos, setWatchLaterVideos] = useState<Array<{ id: string; title: string; thumbnail: string; isShort: boolean }>>([])
  const [watchLaterLoaded, setWatchLaterLoaded] = useState(false)
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({})
  const [playlistsVideosCache, setPlaylistsVideosCache] = useState<Record<string, Array<{ id: string; title: string; thumbnail: string; isShort: boolean }>>>({})
  const [selectedPlaylistItems, setSelectedPlaylistItems] = useState<Record<string, Set<string>>>({})
  const [selectedWatchLaterItems, setSelectedWatchLaterItems] = useState<Set<string>>(new Set())

  const updateVideoSelection = (id: string, force?: boolean) => {
    setSelectedVideos((prev) => {
      const nextSet = new Set(prev)
      const shouldSelect = typeof force === 'boolean' ? force : !nextSet.has(id)
      if (shouldSelect) {
        nextSet.add(id)
      } else {
        nextSet.delete(id)
      }
      return nextSet
    })
  }

  const updateShortSelection = (id: string, force?: boolean) => {
    setSelectedShorts((prev) => {
      const nextSet = new Set(prev)
      const shouldSelect = typeof force === 'boolean' ? force : !nextSet.has(id)
      if (shouldSelect) {
        nextSet.add(id)
      } else {
        nextSet.delete(id)
      }
      return nextSet
    })
  }

  const clearVideoSelection = () => setSelectedVideos(new Set())
  const clearShortSelection = () => setSelectedShorts(new Set())

  const allVideosSelected = videos.length > 0 && selectedVideos.size === videos.length
  const allShortsSelected = shorts.length > 0 && selectedShorts.size === shorts.length

  const toggleSelectAllVideos = () => {
    if (allVideosSelected) {
      clearVideoSelection()
      return
    }
    setSelectedVideos(new Set(videos.map((video) => video.id)))
  }

  const toggleSelectAllShorts = () => {
    if (allShortsSelected) {
      clearShortSelection()
      return
    }
    setSelectedShorts(new Set(shorts.map((short) => short.id)))
  }

  const describeSelection = (count: number, noun: string) => {
    if (count === 1) return `1 ${noun}`
    return `${count} ${noun}s`
  }

  const selectedVideosCount = selectedVideos.size
  const selectedShortsCount = selectedShorts.size

  const handleBulkVideoAction = async (action: 'edit' | 'download' | 'delete' | 'playlist') => {
    if (selectedVideos.size === 0) return
    const label = describeSelection(selectedVideos.size, 'video')

    switch (action) {
      case 'delete': {
        const confirmed = confirm(`Delete ${label}? This cannot be undone.`)
        if (!confirmed) return

        try {
          const ids = Array.from(selectedVideos)
          const response = await fetch('/api/uploads/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          })

          if (!response.ok) {
            throw new Error('Failed to delete')
          }

          const result = await response.json()
          alert(`Successfully deleted ${result.deleted} video(s). ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`)

          // Clear selection and reload data
          setSelectedVideos(new Set())
          window.location.reload()
        } catch (error) {
          console.error('Bulk delete error:', error)
          alert('Failed to delete videos. Please try again.')
        }
        break
      }
      case 'edit': {
        setBulkEditType('video')
        setBulkEditIds(Array.from(selectedVideos))
        setShowBulkEditDialog(true)
        break
      }
      case 'download': {
        const ids = Array.from(selectedVideos)
        const uploads = await Promise.all(
          ids.map(async (id) => {
            const response = await fetch(`/api/uploads/${id}`)
            if (response.ok) {
              return await response.json()
            }
            return null
          })
        )

        for (const upload of uploads) {
          if (upload && upload.filePath) {
            const link = document.createElement('a')
            link.href = upload.filePath
            link.download = `${upload.title || 'video'}.mp4`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        alert(`Started downloading ${uploads.filter(u => u).length} video(s).`)
        break
      }
      case 'playlist': {
        setPendingVideoIds(Array.from(selectedVideos))
        setShowPlaylistDialog(true)
        break
      }
    }
  }

  const handleBulkShortAction = async (action: 'edit' | 'download' | 'delete' | 'playlist') => {
    if (selectedShorts.size === 0) return
    const label = describeSelection(selectedShorts.size, 'short')

    switch (action) {
      case 'delete': {
        const confirmed = confirm(`Delete ${label}? This cannot be undone.`)
        if (!confirmed) return

        try {
          const ids = Array.from(selectedShorts)
          const response = await fetch('/api/uploads/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          })

          if (!response.ok) {
            throw new Error('Failed to delete')
          }

          const result = await response.json()
          alert(`Successfully deleted ${result.deleted} short(s). ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`)

          // Clear selection and reload data
          setSelectedShorts(new Set())
          window.location.reload()
        } catch (error) {
          console.error('Bulk delete error:', error)
          alert('Failed to delete shorts. Please try again.')
        }
        break
      }
      case 'edit': {
        setBulkEditType('short')
        setBulkEditIds(Array.from(selectedShorts))
        setShowBulkEditDialog(true)
        break
      }
      case 'download': {
        const ids = Array.from(selectedShorts)
        const uploads = await Promise.all(
          ids.map(async (id) => {
            const response = await fetch(`/api/uploads/${id}`)
            if (response.ok) {
              return await response.json()
            }
            return null
          })
        )

        for (const upload of uploads) {
          if (upload && upload.filePath) {
            const link = document.createElement('a')
            link.href = upload.filePath
            link.download = `${upload.title || 'short'}.mp4`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        alert(`Started downloading ${uploads.filter(u => u).length} short(s).`)
        break
      }
      case 'playlist': {
        setPendingVideoIds(Array.from(selectedShorts))
        setShowPlaylistDialog(true)
        break
      }
    }
  }

  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam === 'videos' || tabParam === 'shorts' || tabParam === 'about' || tabParam === 'analytics' || tabParam === 'playlists' || tabParam === 'watchlater') {
      setTabValue(tabParam)
    } else {
      setTabValue('home')
    }
  }, [searchParams])

  useEffect(() => {
    setCurrentChannel(channel)
  }, [channel])

  useEffect(() => {
    setSelectedVideos((prev) => {
      if (prev.size === 0) return prev
      const validIds = new Set(videos.map((video) => video.id))
      let changed = false
      const filtered = new Set<string>()
      prev.forEach((id) => {
        if (validIds.has(id)) {
          filtered.add(id)
        } else {
          changed = true
        }
      })
      return changed ? filtered : prev
    })
  }, [videos])

  useEffect(() => {
    setSelectedShorts((prev) => {
      if (prev.size === 0) return prev
      const validIds = new Set(shorts.map((short) => short.id))
      let changed = false
      const filtered = new Set<string>()
      prev.forEach((id) => {
        if (validIds.has(id)) {
          filtered.add(id)
        } else {
          changed = true
        }
      })
      return changed ? filtered : prev
    })
  }, [shorts])

  useEffect(() => {
    if (!isEditOpen) {
      setFormValues({
        title: currentChannel.title ?? '',
        handle: currentChannel.handle?.replace(/^@/, '') ?? '',
        description: currentChannel.description ?? '',
      })
      setAvatarPreview(currentChannel.avatar)
      setBannerPreview(currentChannel.banner)
      setAvatarFile(null)
      setBannerFile(null)
      setFormError(null)
      setHandleStatus('idle')
      setHandleMessage(null)
    }
  }, [currentChannel, isEditOpen])

  useEffect(() => {
    if (showPlaylistDialog) {
      fetchPlaylists()
    }
  }, [showPlaylistDialog])

  useEffect(() => {
    if (tabValue === 'playlists' && !playlistsLoaded && currentUserId) {
      loadUserPlaylists()
    }
  }, [tabValue, playlistsLoaded, currentUserId])

  useEffect(() => {
    if (tabValue === 'playlists' && playlistsLoaded && userPlaylists.length > 0) {
      // Auto-load first 4 videos for each playlist
      userPlaylists
        .filter(p => p.title !== 'Watch Later')
        .forEach(playlist => {
          if (playlist.videoIds.length > 0 && !playlistsVideosCache[playlist.id]) {
            loadPlaylistVideos(playlist.id, playlist.videoIds.slice(0, 4))
          }
        })
    }
  }, [tabValue, playlistsLoaded, userPlaylists])

  useEffect(() => {
    if (tabValue === 'watchlater' && !watchLaterLoaded && currentUserId) {
      loadWatchLater()
    }
  }, [tabValue, watchLaterLoaded, currentUserId])

  const loadUserPlaylists = async () => {
    try {
      const userId = currentUserId
      if (!userId) return

      const response = await fetch(`/api/playlists?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserPlaylists(data)
        setPlaylistsLoaded(true)
      }
    } catch (error) {
      console.error('Error loading playlists:', error)
    }
  }

  const loadWatchLater = async () => {
    try {
      const userId = currentUserId
      if (!userId) return

      const response = await fetch(`/api/playlists?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        const watchLaterPlaylist = data.find((p: any) => p.title === 'Watch Later')

        if (watchLaterPlaylist && watchLaterPlaylist.videoIds.length > 0) {
          // Fetch video details for each video ID
          const videoDetailsPromises = watchLaterPlaylist.videoIds.map(async (id: string) => {
            // First check if it's a local video/short
            const localVideo = videos.find(v => v.id === id)
            if (localVideo) {
              return {
                id: localVideo.id,
                title: localVideo.title,
                thumbnail: localVideo.thumbnail,
                isShort: false
              }
            }

            const localShort = shorts.find(s => s.id === id)
            if (localShort) {
              return {
                id: localShort.id,
                title: localShort.title,
                thumbnail: localShort.thumbnail,
                isShort: true
              }
            }

            // If not local, fetch from API
            try {
              const videoResponse = await fetch(`/api/videos/${id}`)
              if (videoResponse.ok) {
                const videoData = await videoResponse.json()
                return {
                  id: videoData.id,
                  title: videoData.snippet?.title || 'Untitled',
                  thumbnail: videoData.snippet?.thumbnails?.medium?.url || videoData.snippet?.thumbnails?.default?.url || '/placeholder.svg',
                  isShort: videoData.contentDetails?.duration ? videoData.contentDetails.duration.includes('PT') && parseInt(videoData.contentDetails.duration.match(/\d+/)?.[0] || '0') <= 60 : false
                }
              }
            } catch (err) {
              console.error(`Error fetching video ${id}:`, err)
            }

            return null
          })

          const watchLaterVids = (await Promise.all(videoDetailsPromises))
            .filter(Boolean) as Array<{ id: string; title: string; thumbnail: string; isShort: boolean }>

          setWatchLaterVideos(watchLaterVids)
        }
        setWatchLaterLoaded(true)
      }
    } catch (error) {
      console.error('Error loading Watch Later:', error)
    }
  }

  const loadPlaylistVideos = async (playlistId: string, videoIds: string[]) => {
    if (playlistsVideosCache[playlistId]) {
      return playlistsVideosCache[playlistId]
    }

    const videoDetailsPromises = videoIds.map(async (id: string) => {
      const localVideo = videos.find(v => v.id === id)
      if (localVideo) {
        return {
          id: localVideo.id,
          title: localVideo.title,
          thumbnail: localVideo.thumbnail,
          isShort: false
        }
      }

      const localShort = shorts.find(s => s.id === id)
      if (localShort) {
        return {
          id: localShort.id,
          title: localShort.title,
          thumbnail: localShort.thumbnail,
          isShort: true
        }
      }

      try {
        const videoResponse = await fetch(`/api/videos/${id}`)
        if (videoResponse.ok) {
          const videoData = await videoResponse.json()
          return {
            id: videoData.id,
            title: videoData.snippet?.title || 'Untitled',
            thumbnail: videoData.snippet?.thumbnails?.medium?.url || videoData.snippet?.thumbnails?.default?.url || '/placeholder.svg',
            isShort: videoData.contentDetails?.duration ? videoData.contentDetails.duration.includes('PT') && parseInt(videoData.contentDetails.duration.match(/\d+/)?.[0] || '0') <= 60 : false
          }
        }
      } catch (err) {
        console.error(`Error fetching video ${id}:`, err)
      }

      return null
    })

    const vids = (await Promise.all(videoDetailsPromises))
      .filter(Boolean) as Array<{ id: string; title: string; thumbnail: string; isShort: boolean }>

    setPlaylistsVideosCache(prev => ({ ...prev, [playlistId]: vids }))
    return vids
  }

  const togglePlaylistExpansion = async (playlistId: string, videoIds: string[]) => {
    if (!expandedPlaylists[playlistId]) {
      await loadPlaylistVideos(playlistId, videoIds)
    }
    setExpandedPlaylists(prev => ({ ...prev, [playlistId]: !prev[playlistId] }))
  }

  const updatePlaylistItemSelection = (playlistId: string, videoId: string, force?: boolean) => {
    setSelectedPlaylistItems((prev) => {
      const playlistSelections = new Set(prev[playlistId] || [])
      const shouldSelect = typeof force === 'boolean' ? force : !playlistSelections.has(videoId)

      if (shouldSelect) {
        playlistSelections.add(videoId)
      } else {
        playlistSelections.delete(videoId)
      }

      return { ...prev, [playlistId]: playlistSelections }
    })
  }

  const updateWatchLaterItemSelection = (videoId: string, force?: boolean) => {
    setSelectedWatchLaterItems((prev) => {
      const nextSet = new Set(prev)
      const shouldSelect = typeof force === 'boolean' ? force : !nextSet.has(videoId)

      if (shouldSelect) {
        nextSet.add(videoId)
      } else {
        nextSet.delete(videoId)
      }

      return nextSet
    })
  }

  const handleRemoveFromPlaylist = async (playlistId: string) => {
    const selectedIds = selectedPlaylistItems[playlistId]
    if (!selectedIds || selectedIds.size === 0) {
      toast.error('No items selected')
      return
    }

    const userId = currentUserId
    if (!userId) {
      toast.error('Please sign in')
      return
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}/remove-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoIds: Array.from(selectedIds)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove videos from playlist')
      }

      toast.success(`Removed ${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'items'} from playlist`)

      // Clear selections
      setSelectedPlaylistItems(prev => ({ ...prev, [playlistId]: new Set() }))

      // Reload playlists and refresh cache
      await loadPlaylists()
      const playlist = userPlaylists.find(p => p.id === playlistId)
      if (playlist) {
        const remainingIds = playlist.videoIds.filter(id => !selectedIds.has(id))
        if (remainingIds.length > 0) {
          const isExpanded = expandedPlaylists[`${playlistId}_videos`] || expandedPlaylists[`${playlistId}_shorts`]
          await loadPlaylistVideos(playlistId, remainingIds.slice(0, isExpanded ? remainingIds.length : 4))
        } else {
          setPlaylistsVideosCache(prev => ({ ...prev, [playlistId]: [] }))
        }
      }
    } catch (error) {
      console.error('Error removing from playlist:', error)
      toast.error('Failed to remove items from playlist')
    }
  }

  const handleRemoveFromWatchLater = async () => {
    if (selectedWatchLaterItems.size === 0) {
      toast.error('No items selected')
      return
    }

    const userId = currentUserId
    if (!userId) {
      toast.error('Please sign in')
      return
    }

    try {
      const watchLaterPlaylist = userPlaylists.find(p => p.title === 'Watch Later')
      if (!watchLaterPlaylist) {
        throw new Error('Watch Later playlist not found')
      }

      const response = await fetch(`/api/playlists/${watchLaterPlaylist.id}/remove-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoIds: Array.from(selectedWatchLaterItems)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove videos from Watch Later')
      }

      toast.success(`Removed ${selectedWatchLaterItems.size} ${selectedWatchLaterItems.size === 1 ? 'item' : 'items'} from Watch Later`)

      // Clear selections and reload
      setSelectedWatchLaterItems(new Set())
      await loadPlaylists()
      await loadWatchLater()
    } catch (error) {
      console.error('Error removing from Watch Later:', error)
      toast.error('Failed to remove items from Watch Later')
    }
  }

  const handleViewPlaylist = async (playlist: typeof userPlaylists[0]) => {
    setViewingPlaylist(playlist)

    if (playlist.videoIds.length === 0) {
      setPlaylistVideos([])
      return
    }

    // Fetch video details for videos in this playlist
    const videoDetailsPromises = playlist.videoIds.map(async (id: string) => {
      // First check if it's a local video/short
      const localVideo = videos.find(v => v.id === id)
      if (localVideo) {
        return {
          id: localVideo.id,
          title: localVideo.title,
          thumbnail: localVideo.thumbnail,
          isShort: false
        }
      }

      const localShort = shorts.find(s => s.id === id)
      if (localShort) {
        return {
          id: localShort.id,
          title: localShort.title,
          thumbnail: localShort.thumbnail,
          isShort: true
        }
      }

      // If not local, fetch from API
      try {
        const videoResponse = await fetch(`/api/videos/${id}`)
        if (videoResponse.ok) {
          const videoData = await videoResponse.json()
          return {
            id: videoData.id,
            title: videoData.snippet?.title || 'Untitled',
            thumbnail: videoData.snippet?.thumbnails?.medium?.url || videoData.snippet?.thumbnails?.default?.url || '/placeholder.svg',
            isShort: videoData.contentDetails?.duration ? videoData.contentDetails.duration.includes('PT') && parseInt(videoData.contentDetails.duration.match(/\d+/)?.[0] || '0') <= 60 : false
          }
        }
      } catch (err) {
        console.error(`Error fetching video ${id}:`, err)
      }

      return null
    })

    const playlistVids = (await Promise.all(videoDetailsPromises))
      .filter(Boolean) as Array<{ id: string; title: string; thumbnail: string; isShort: boolean }>

    setPlaylistVideos(playlistVids)
  }

  const fetchPlaylists = async () => {
    try {
      const userId = currentUserId
      if (!userId) return

      const response = await fetch(`/api/playlists?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return

    const userId = currentUserId
    if (!userId) return

    setIsCreatingPlaylist(true)
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: newPlaylistName,
          description: '',
          visibility: 'private',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create playlist')
      }

      const newPlaylist = await response.json()
      setPlaylists([...playlists, newPlaylist])
      setSelectedPlaylist(newPlaylist.id)
      setNewPlaylistName('')
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert('Failed to create playlist. Please try again.')
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylist || pendingVideoIds.length === 0) return

    const userId = currentUserId
    if (!userId) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist}/add-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoIds: pendingVideoIds
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add videos to playlist')
      }

      alert(`Successfully added ${pendingVideoIds.length} item(s) to playlist.`)
      setShowPlaylistDialog(false)
      setSelectedPlaylist('')
      setPendingVideoIds([])
      setSelectedVideos(new Set())
      setSelectedShorts(new Set())
    } catch (error) {
      console.error('Error adding to playlist:', error)
      alert('Failed to add items to playlist. Please try again.')
    }
  }

  const handleBulkEdit = async () => {
    if (bulkEditIds.length === 0) return

    try {
      const response = await fetch('/api/uploads/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: bulkEditIds,
          visibility: bulkEditVisibility,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to bulk edit')
      }

      const result = await response.json()
      alert(`Successfully updated ${result.updated} ${bulkEditType}(s).`)
      setShowBulkEditDialog(false)
      setBulkEditIds([])
      setSelectedVideos(new Set())
      setSelectedShorts(new Set())
      window.location.reload()
    } catch (error) {
      console.error('Error bulk editing:', error)
      alert('Failed to update items. Please try again.')
    }
  }

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  useEffect(() => {
    return () => {
      if (bannerPreview && bannerPreview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerPreview)
      }
    }
  }, [bannerPreview])

  const channelOwnerId = currentChannel.ownerId ?? null
  const isEditable = Boolean(
    currentChannel.isEditable && (!channelOwnerId || channelOwnerId === (currentUserId ?? null))
  )

  useEffect(() => {
    if (!isEditOpen) return

    const rawHandle = formValues.handle.trim()
    const sanitized = rawHandle.replace(/^@+/, '')
    const normalized = sanitized.toLowerCase()
    const currentNormalized = (currentChannel.handle || '').replace(/^@/, '').toLowerCase()

    if (!rawHandle) {
      setHandleStatus('invalid')
      setHandleMessage('Handle is required.')
      return
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(normalized)) {
      setHandleStatus('invalid')
      setHandleMessage('Use 3-30 characters: letters, numbers, periods, hyphens, or underscores.')
      return
    }

    if (normalized === currentNormalized) {
      setHandleStatus('available')
      setHandleMessage('This is your current handle.')
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setHandleStatus('checking')
        setHandleMessage('Checking availability...')
        if (typeof window === 'undefined') {
          setHandleStatus('available')
          setHandleMessage('Handle will be verified when you are online.')
          return
        }

        const availabilityUrl = new URL('/api/channel/handle-availability', window.location.origin)
        availabilityUrl.searchParams.set('handle', rawHandle)
        const ownerIdentifier = channelOwnerId ?? currentUserId ?? null
        if (ownerIdentifier) {
          availabilityUrl.searchParams.set('userId', ownerIdentifier)
        }
        const response = await fetch(availabilityUrl.toString(), {
          signal: controller.signal,
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          const reason = typeof data.reason === 'string' ? data.reason : 'Handle is not available.'
          setHandleStatus('invalid')
          setHandleMessage(reason)
          return
        }

        if (data.available) {
          setHandleStatus('available')
          const message = typeof data.message === 'string' ? data.message : null
          setHandleMessage(message || 'Handle is available.')
          return
        }

        setHandleStatus('unavailable')
        const reason = typeof data.reason === 'string' ? data.reason : 'That handle is already taken.'
        setHandleMessage(reason)
      } catch (error) {
        if (controller.signal.aborted) return
        setHandleStatus('invalid')
        setHandleMessage('Could not verify handle. Check your connection and try again.')
      }
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [formValues.handle, isEditOpen, currentChannel.handle, channelOwnerId, currentUserId])

  const handleTextFieldChange = (
    field: 'title' | 'handle' | 'description'
  ) => (event: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    event.target.value = ''
  }

  const handleBannerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (bannerPreview && bannerPreview.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreview)
    }
    setBannerFile(file)
    const previewUrl = URL.createObjectURL(file)
    setBannerPreview(previewUrl)
    event.target.value = ''
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = formValues.title.trim()
    if (!trimmedTitle) {
      setFormError('Channel name is required.')
      return
    }

    if (handleStatus === 'checking') {
      setFormError('Please wait while the handle availability is confirmed.')
      return
    }

    if (handleStatus === 'invalid' || handleStatus === 'unavailable') {
      setFormError(handleMessage ?? 'Choose a different handle before saving.')
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      const payload = new FormData()
      payload.append('title', trimmedTitle)
      payload.append('handle', formValues.handle.trim())
      payload.append('description', formValues.description)
      const ownerIdentifier = channelOwnerId ?? currentUserId ?? null
      if (ownerIdentifier) {
        payload.append('userId', ownerIdentifier)
      }
      if (avatarFile) {
        payload.append('avatar', avatarFile)
      }
      if (bannerFile) {
        payload.append('banner', bannerFile)
      }

      const response = await fetch('/api/channel/profile', {
        method: 'PUT',
        body: payload,
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      const profile = data.profile as {
        id: string
        title: string
        handle: string
        description: string
        avatar: string
        banner: string
        subscribers: number
        totalViews: number
        joinedAt?: string
        ownerId?: string
      }

      const previousHandle = currentChannel.handle || ''
      const normalizedPreviousHandle = previousHandle.replace(/^@/, '')
      const nextHandle = profile.handle || previousHandle
      const normalizedNextHandle = nextHandle.replace(/^@/, '')

      setCurrentChannel((prev) => ({
        ...prev,
        id: profile.id ?? prev.id,
        title: profile.title ?? prev.title,
        handle: profile.handle ?? prev.handle,
        description: profile.description ?? prev.description,
        avatar: profile.avatar ?? prev.avatar,
        banner: profile.banner ?? prev.banner,
        subscribers: (profile.subscribers ?? Number(prev.subscribers || '0')).toString(),
        totalViews: (profile.totalViews ?? Number(prev.totalViews || '0')).toString(),
        joinedAt: profile.joinedAt ?? prev.joinedAt,
        isEditable: true,
        ownerId: profile.ownerId ?? prev.ownerId ?? ownerIdentifier ?? undefined,
      }))

      if (ownerIdentifier) {
        const updates: { channelName?: string; channelId?: string; avatar?: string; channelHandle?: string } = {}
        const nextChannelName = profile.title ?? trimmedTitle
        const nextChannelId = profile.id ?? currentChannel.id
        const nextAvatar = profile.avatar ?? currentChannel.avatar
        const nextChannelHandle = nextHandle || previousHandle

        if (nextChannelName) updates.channelName = nextChannelName
        if (nextChannelId) updates.channelId = nextChannelId
        if (nextAvatar) updates.avatar = nextAvatar
        if (nextChannelHandle) updates.channelHandle = nextChannelHandle

        if (Object.keys(updates).length > 0) {
          updateStoredUserChannelDetails(ownerIdentifier, updates)
        }
      }

      setIsEditOpen(false)
      setAvatarFile(null)
      setBannerFile(null)

      // Update URL if handle changed
      if (
        normalizedNextHandle &&
        normalizedNextHandle !== normalizedPreviousHandle
      ) {
        const queryString = searchParams?.toString() ?? ''
        const nextUrl = `/@${normalizedNextHandle}${queryString ? `?${queryString}` : ''}`

        // Use window.history to update URL immediately
        window.history.replaceState(null, '', nextUrl)

        // Then refresh router data
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save channel profile:', error)
      setFormError('Unable to save changes right now. Please try again in a moment.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadComplete = (_video?: unknown) => {
    setIsUploadOpen(false)
    router.refresh()
  }

  useEffect(() => {
    const target = currentChannel
    const baseValue = Number(String(target.subscribers ?? '0').replace(/,/g, ''))
    const safeBase = Number.isFinite(baseValue) ? baseValue : 0
    setBaseSubscriberCount(safeBase)
    const subscribed = isChannelSubscribed(target.id)
    setIsSubscribed(subscribed)
    setSubscriberCount(safeBase + (subscribed ? 1 : 0))
    setSubscribeError(null)
    setShowSparkle(false)
  }, [currentChannel])

  useEffect(() => {
    if (!showSparkle) return
    const timer = setTimeout(() => setShowSparkle(false), 1200)
    return () => clearTimeout(timer)
  }, [showSparkle])

  useEffect(() => {
    if (tabValue !== 'videos' && selectedVideosCount > 0) {
      clearVideoSelection()
    }
    if (tabValue !== 'shorts' && selectedShortsCount > 0) {
      clearShortSelection()
    }
  }, [tabValue, selectedVideosCount, selectedShortsCount])

  const handleSubscribeClick = () => {
    if (isEditable) {
      setSubscribeError('You cannot subscribe to your own channel.')
      return
    }
    const channelName = currentChannel.title || 'Unknown Channel'
    const channelHandle = currentChannel.handle || `@${currentChannel.title?.replace(/\s+/g, '') || 'channel'}`
    const next = toggleChannelSubscription(currentChannel.id, channelName, channelHandle)
    setIsSubscribed(next)
    setSubscriberCount(baseSubscriberCount + (next ? 1 : 0))
    setSubscribeError(null)
    setShowSparkle(next)
  }

  const totalUploads = videos.length + shorts.length
  const displayUploadCount = totalUploads > 0 ? totalUploads.toString() : currentChannel.videoCount
  const formattedSubscribers = `${formatViewCount(String(subscriberCount))} subscribers`
  const formattedViews = `${formatViewCount(currentChannel.totalViews)} views`
  const joinedDate = formatJoinedDate(currentChannel.joinedAt)

  const analyticsUploads = useMemo<AnalyticsSlice[]>(() => {
    const mappedVideos: AnalyticsSlice[] = videos.map((item) => ({
      id: item.id,
      title: item.title,
      viewCount: Number(item.viewCount || '0'),
      publishedAt: item.publishedAt,
      type: 'video',
    }))
    const mappedShorts: AnalyticsSlice[] = shorts.map((item) => ({
      id: item.id,
      title: item.title,
      viewCount: Number(item.viewCount || '0'),
      publishedAt: item.publishedAt,
      type: 'short',
    }))
    return [...mappedVideos, ...mappedShorts]
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      .slice(-8)
  }, [videos, shorts])

  const analyticsTotals = useMemo(() => {
    if (analyticsUploads.length === 0) {
      return {
        averageViews: 0,
        peakUpload: null as null | typeof analyticsUploads[number],
        totalViews: 0,
      }
    }
    const totalViewsValue = analyticsUploads.reduce((sum, item) => sum + item.viewCount, 0)
    const averageViews = Math.round(totalViewsValue / analyticsUploads.length)
    const peakUpload = analyticsUploads.reduce((best, item) => (item.viewCount > best.viewCount ? item : best), analyticsUploads[0])
    return {
      averageViews,
      peakUpload,
      totalViews: totalViewsValue,
    }
  }, [analyticsUploads])

  const videosByNewest = useMemo(() => {
    return [...videos].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  }, [videos])

  const popularVideos = useMemo(() => {
    return [...videos].sort((a, b) => parseNumericString(b.viewCount) - parseNumericString(a.viewCount))
  }, [videos])

  const carouselVideos = useMemo(() => videosByNewest.slice(0, 12), [videosByNewest])
  const newestVideos = useMemo(() => videosByNewest.slice(0, 4), [videosByNewest])
  const topPopularVideos = useMemo(() => popularVideos.slice(0, 6), [popularVideos])
  const popularHighlights = useMemo(() => {
    const newestIds = new Set(newestVideos.map((video) => video.id))
    return topPopularVideos.filter((video) => !newestIds.has(video.id))
  }, [newestVideos, topPopularVideos])
  const popularSectionItems = popularHighlights.length > 0 ? popularHighlights : topPopularVideos

  const analyticsDonut = useMemo(() => {
    if (analyticsUploads.length === 0) {
      return null
    }

    const sorted = [...analyticsUploads].sort((a, b) => b.viewCount - a.viewCount)
    const MAX_SEGMENTS = 6
    const primary = sorted.slice(0, MAX_SEGMENTS)
    const remainder = sorted.slice(MAX_SEGMENTS)

    const aggregateSlice = remainder.length
      ? [{
          id: 'analytics-others',
          title: 'More uploads',
          viewCount: remainder.reduce((sum, item) => sum + item.viewCount, 0),
          publishedAt: remainder[0]?.publishedAt ?? new Date().toISOString(),
          type: 'other' as const,
          isAggregate: true,
        } satisfies AnalyticsSlice]
      : []

    const slices: AnalyticsSlice[] = [...primary, ...aggregateSlice]
    const totalViews = slices.reduce((sum, item) => sum + item.viewCount, 0)
    const fallbackTotal = totalViews > 0 ? totalViews : slices.length
    let currentAngle = 0

    const MIN_SWEEP = slices.length > 1 ? 2 : 360

    const segments = slices.map((item, index) => {
      const value = totalViews > 0 ? item.viewCount : 1
      const ratio = value / fallbackTotal
      let sweep = ratio * 360
      if (slices.length > 1 && sweep < MIN_SWEEP) {
        sweep = MIN_SWEEP
      }

      let startAngle = currentAngle
      let endAngle = currentAngle + sweep

      if (index === slices.length - 1) {
        endAngle = 360
      }

      endAngle = Math.min(endAngle, 360)
      startAngle = parseFloat(startAngle.toFixed(2))
      endAngle = parseFloat(endAngle.toFixed(2))
      currentAngle = endAngle

      return {
        item,
        ratio,
        color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length],
        path: describeDonutSegment(50, 50, 45, 28, startAngle, endAngle),
      }
    })

    return { segments }
  }, [analyticsUploads])

  useEffect(() => {
    if (!isEditable && tabValue === 'analytics') {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.delete('tab')
      setTabValue('home')
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    }
  }, [isEditable, tabValue, pathname, router, searchParams])

  const handleTabChange = (value: ChannelTab) => {
    setTabValue(value)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === 'home') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const queryString = params.toString()
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="relative h-44 w-full overflow-hidden bg-muted md:h-60">
        {currentChannel.banner ? (
          <Image
            key={currentChannel.banner}
            src={currentChannel.banner}
            alt={`${currentChannel.title} banner`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <BannerPlaceholder />
        )}
        {isEditable && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="group absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-lg transition hover:bg-black/70"
            >
              <Pencil className="h-4 w-4" />
              Edit banner
            </button>
          </>
        )}
      </div>
      <div className="mx-auto mt-8 w-full px-4 pb-16 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <section className="order-1 flex flex-col gap-6 lg:order-2">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-background/70">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                  <div className="relative h-28 w-28 md:h-32 md:w-32">
                    {isEditable && (
                      <div className="absolute -inset-3 -z-10 rounded-full bg-gradient-to-r from-primary/40 via-purple-500/30 to-blue-500/30 blur-2xl" />
                    )}
                    <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-background shadow-lg transition">
                      {currentChannel.avatar ? (
                        <Image
                          key={currentChannel.avatar}
                          src={currentChannel.avatar}
                          alt={currentChannel.title}
                          fill
                          sizes="(max-width: 768px) 128px, 144px"
                          className="object-cover"
                          priority
                        />
                      ) : (
                        <AvatarPlaceholder />
                      )}
                    </div>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => setIsEditOpen(true)}
                        className="absolute bottom-[5px] right-[5px] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/90 transition hover:scale-105"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold md:text-3xl">{currentChannel.title}</h1>
                    <p className="text-sm text-muted-foreground">
                      {currentChannel.handle || 'Channel handle unavailable'}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{formattedSubscribers}</span>
                      <span>{formattedViews}</span>
                      <span>{displayUploadCount} uploads</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!isEditable && (
                    <div className="relative flex flex-col items-start gap-1">
                      <Button
                        className="rounded-full px-6"
                        onClick={handleSubscribeClick}
                        variant={isSubscribed ? 'outline' : 'default'}
                      >
                        {isSubscribed ? 'Subscribed' : 'Subscribe'}
                      </Button>
                      {showSparkle && (
                        <Sparkles className="absolute -right-4 -top-3 h-5 w-5 text-primary animate-pulse" />
                      )}
                      {subscribeError && (
                        <span className="text-xs text-destructive/80">{subscribeError}</span>
                      )}
                    </div>
                  )}
                  {isEditable && (
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="rounded-full px-6 font-medium">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Edit Channel
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[94vw] max-w-2xl p-5 sm:p-6">
                        <form onSubmit={handleEditSubmit} className="space-y-6">
                          <DialogHeader>
                            <DialogTitle>Customize your channel</DialogTitle>
                            <DialogDescription>
                              Refresh your artwork and messaging so your channel feels on-brand.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="relative h-32 w-full overflow-hidden rounded-xl bg-muted sm:h-40">
                              {bannerPreview ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={bannerPreview}
                                    alt="Banner preview"
                                    className="h-full w-full object-cover"
                                  />
                                </>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted">
                                  <BannerPlaceholder />
                                </div>
                              )}
                              <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/75">
                                <Pencil className="h-3.5 w-3.5" />
                                Change banner
                                <input type="file" accept="image/*" className="sr-only" onChange={handleBannerChange} />
                              </label>
                            </div>

                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                              <div className="relative h-20 w-20">
                                <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-background shadow-lg">
                                  {avatarPreview ? (
                                    <>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={avatarPreview}
                                        alt="Avatar preview"
                                        className="h-full w-full object-cover"
                                      />
                                    </>
                                  ) : (
                                    <AvatarPlaceholder />
                                  )}
                                </div>
                                <label className="absolute bottom-[5px] right-[5px] flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/90">
                                  <Pencil className="h-2.5 w-2.5" />
                                  <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
                                </label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Use a square image at least 256x256 pixels for a crisp avatar.
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="channel-title">Channel name</Label>
                              <Input
                                id="channel-title"
                                value={formValues.title}
                                onChange={handleTextFieldChange('title')}
                                placeholder="Lootube Studio"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="channel-handle">Channel handle</Label>
                              <div className="flex items-center rounded-lg border border-border/60 bg-background/80 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30">
                                <span className="px-3 text-sm text-muted-foreground">@</span>
                                <Input
                                  id="channel-handle"
                                  value={formValues.handle}
                                  onChange={handleTextFieldChange('handle')}
                                  placeholder="mychannel"
                                  className="border-0 bg-transparent px-0 focus-visible:ring-0"
                                  aria-invalid={handleStatus === 'invalid' || handleStatus === 'unavailable'}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Letters, numbers, periods, underscores, and hyphens only.
                              </p>
                              {handleMessage && (
                                <p
                                  className={`text-xs ${
                                    handleStatus === 'available'
                                      ? 'text-emerald-500'
                                      : handleStatus === 'checking'
                                        ? 'text-muted-foreground'
                                        : 'text-destructive'
                                  }`}
                                >
                                  {handleMessage}
                                </p>
                              )}
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="channel-description">Description</Label>
                              <Textarea
                                id="channel-description"
                                value={formValues.description}
                                onChange={handleTextFieldChange('description')}
                                rows={4}
                                placeholder="Tell viewers what makes your channel unique."
                              />
                            </div>
                          </div>

                          {formError && (
                            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                              {formError}
                            </p>
                          )}

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setIsEditOpen(false)}
                              disabled={isSaving}
                              className="rounded-full"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={
                                isSaving ||
                                handleStatus === 'checking' ||
                                handleStatus === 'invalid' ||
                                handleStatus === 'unavailable'
                              }
                              className="rounded-full px-6"
                            >
                              {isSaving ? 'Saving...' : 'Save changes'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/80 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-background/70">
              <Tabs value={tabValue} onValueChange={(value) => handleTabChange(value as ChannelTab)} className="w-full">
                <div className="border-b border-border/70 px-4 py-2">
                  <TabsList className="flex w-full justify-start gap-2 overflow-x-auto rounded-full bg-background/90 p-1 text-sm shadow-inner">
                    <TabsTrigger
                      value="home"
                      className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Home
                    </TabsTrigger>
                    <TabsTrigger
                      value="videos"
                      className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Videos
                    </TabsTrigger>
                    <TabsTrigger
                      value="shorts"
                      className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      Shorts
                    </TabsTrigger>
                    {isEditable && (
                      <>
                        <TabsTrigger
                          value="playlists"
                          className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                        >
                          Playlists
                        </TabsTrigger>
                        <TabsTrigger
                          value="watchlater"
                          className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                        >
                          Watch Later
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger
                      value="about"
                      className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      About
                    </TabsTrigger>
                    {isEditable && (
                      <TabsTrigger
                        value="analytics"
                        className="rounded-full px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                      >
                        Analytics
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>
                <TabsContent value="home" className="space-y-6 p-6">
                  {isEditable ? (
                    <>
                      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary dark:bg-primary/20">
                              <Upload className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <h2 className="text-lg font-semibold">Upload new content</h2>
                              <p className="text-sm text-muted-foreground">
                                Share fresh videos or shorts to keep your audience engaged.
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => setIsUploadOpen(true)} className="rounded-full">
                            Start upload
                          </Button>
                        </div>
                      </section>

                      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-lg font-semibold">Channel insights</h2>
                            <p className="text-sm text-muted-foreground">A quick snapshot of your recent performance.</p>
                          </div>
                          <Button variant="outline" className="rounded-full" onClick={() => handleTabChange('analytics')}>
                            Go to channel analytics
                          </Button>
                        </div>
                        {analyticsUploads.length > 0 ? (
                          <div className="grid gap-4 pt-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg views</p>
                              <p className="mt-2 text-2xl font-semibold">
                                {formatViewCount(String(analyticsTotals.averageViews || 0))}
                              </p>
                              <p className="text-xs text-muted-foreground">Across last {analyticsUploads.length} uploads</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Top performer</p>
                              <p className="mt-2 text-sm font-semibold line-clamp-2">
                                {analyticsTotals.peakUpload?.title || 'No uploads yet'}
                              </p>
                              {analyticsTotals.peakUpload ? (
                                <p className="text-xs text-muted-foreground">
                                  {formatViewCount(String(analyticsTotals.peakUpload.viewCount))} views • {formatTimeAgo(analyticsTotals.peakUpload.publishedAt)}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Upload to see your best performer.</p>
                              )}
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total recent views</p>
                              <p className="mt-2 text-2xl font-semibold">{formatViewCount(String(analyticsTotals.totalViews || 0))}</p>
                              <p className="text-xs text-muted-foreground">View counts across your most recent uploads</p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 p-6 text-center text-muted-foreground dark:border-white/15">
                            <BarChart3 className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">
                              Upload a video or short to unlock channel insights.
                            </p>
                          </div>
                        )}
                      </section>

                      <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-lg font-semibold">Recent subscribers</h2>
                            <p className="text-sm text-muted-foreground">Keep an eye on the community supporting you.</p>
                          </div>
                          {recentSubscribers.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {describeSelection(recentSubscribers.length, 'subscriber')}
                            </span>
                          )}
                        </div>
                        {recentSubscribers.length > 0 ? (
                          <ul className="mt-4 space-y-3">
                            {recentSubscribers.slice(0, 6).map((subscriber) => {
                              const subscribedLabel = subscriber.subscribedAt
                                ? formatTimeAgo(subscriber.subscribedAt)
                                : 'Recently'
                              const initial = subscriber.name?.[0]?.toUpperCase() ?? '?'
                              return (
                                <li key={subscriber.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm dark:border-white/10">
                                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                                    {subscriber.avatar ? (
                                      <Image
                                        src={subscriber.avatar}
                                        alt={subscriber.name}
                                        fill
                                        sizes="40px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                                        {initial}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{subscriber.name}</p>
                                    <p className="text-xs text-muted-foreground">{subscribedLabel}</p>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 p-6 text-center text-muted-foreground dark:border-white/15">
                            <Users className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">
                              Subscriber names will appear here once someone joins.
                            </p>
                          </div>
                        )}
                      </section>
                    </>
                  ) : (
                    <>
                      {videos.length > 0 ? (
                        <>
                          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <h2 className="text-lg font-semibold">For you</h2>
                                <p className="text-sm text-muted-foreground">Highlights from their latest uploads.</p>
                              </div>
                              <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={() => handleTabChange('videos')}>
                                View all
                              </Button>
                            </div>
                            <div className="mt-4">
                              <VideoCarousel items={carouselVideos} />
                            </div>
                          </section>

                          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <h2 className="text-lg font-semibold">New uploads</h2>
                              <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={() => handleTabChange('videos')}>
                                View videos tab
                              </Button>
                            </div>
                            <div className="mt-4 space-y-3">
                              {newestVideos.map((video) => (
                                <VideoListItem
                                  key={`latest-${video.id}`}
                                  {...video}
                                  isSelected={false}
                                  isEditable={false}
                                />
                              ))}
                            </div>
                          </section>

                          {popularSectionItems.length > 0 && (
                            <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <h2 className="text-lg font-semibold">Popular videos</h2>
                                <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={() => handleTabChange('videos')}>
                                  Explore all videos
                                </Button>
                              </div>
                              <div className="mt-4 space-y-3">
                                {popularSectionItems.map((video) => (
                                  <VideoListItem
                                    key={`popular-${video.id}`}
                                    {...video}
                                    isSelected={false}
                                    isEditable={false}
                                  />
                                ))}
                              </div>
                            </section>
                          )}
                        </>
                      ) : (
                        <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                          This channel hasn&apos;t uploaded any videos yet.
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value="videos" className="space-y-4 p-6">
                  {isEditable && videos.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={toggleSelectAllVideos}>
                        {allVideosSelected ? (
                          <>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            Deselect all
                          </>
                        ) : (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            Select all
                          </>
                        )}
                      </Button>
                      {selectedVideosCount > 0 && (
                        <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={clearVideoSelection}>
                          Clear selection
                        </Button>
                      )}
                    </div>
                  )}
                  {isEditable && selectedVideosCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">
                      <span className="font-medium text-primary">
                        {describeSelection(selectedVideosCount, 'video')} selected
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleBulkVideoAction('edit')}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleBulkVideoAction('download')}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleBulkVideoAction('playlist')}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add to playlist
                        </Button>
                        <Button size="sm" variant="destructive" className="rounded-full" onClick={() => handleBulkVideoAction('delete')}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete forever
                        </Button>
                      </div>
                    </div>
                  )}
                  {videos.length > 0 ? (
                    <div className="space-y-3">
                      {videos.map((video) => (
                        <VideoListItem
                          key={video.id}
                          {...video}
                          isSelected={selectedVideos.has(video.id)}
                          onToggleSelect={updateVideoSelection}
                          isEditable={isEditable}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                      Upload videos to see them listed here.
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="shorts" className="space-y-4 p-6">
                  {isEditable ? (
                    <>
                      {shorts.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={toggleSelectAllShorts}>
                            {allShortsSelected ? (
                              <>
                                <CheckSquare className="mr-2 h-4 w-4" />
                                Deselect all
                              </>
                            ) : (
                              <>
                                <Square className="mr-2 h-4 w-4" />
                                Select all
                              </>
                            )}
                          </Button>
                          {selectedShortsCount > 0 && (
                            <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={clearShortSelection}>
                              Clear selection
                            </Button>
                          )}
                        </div>
                      )}
                      {selectedShortsCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">
                          <span className="font-medium text-primary">
                            {describeSelection(selectedShortsCount, 'short')} selected
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleBulkShortAction('edit')}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleBulkShortAction('download')}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleBulkShortAction('playlist')}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add to playlist
                            </Button>
                            <Button size="sm" variant="destructive" className="rounded-full" onClick={() => handleBulkShortAction('delete')}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete forever
                            </Button>
                          </div>
                        </div>
                      )}
                      {shorts.length > 0 ? (
                        <div className="space-y-3">
                          {shorts.map((short) => (
                            <ShortListItem
                              key={short.id}
                              {...short}
                              isSelected={selectedShorts.has(short.id)}
                              onToggleSelect={updateShortSelection}
                              isEditable={isEditable}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                          Upload shorts to see them listed here.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {shorts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6">
                          {shorts.map((short) => (
                            <ShortGridCard key={short.id} {...short} />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                          No shorts available yet.
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
                {isEditable && (
                  <TabsContent value="playlists" className="space-y-8 p-6">
                    {userPlaylists.filter(p => p.title !== 'Watch Later').length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                        No playlists yet. Create one using the bulk actions on your videos or shorts.
                      </div>
                    ) : (
                      userPlaylists.filter(p => p.title !== 'Watch Later').map((playlist) => {
                        const playlistVideos = playlistsVideosCache[playlist.id] || []
                        const videoItems = playlistVideos.filter(v => !v.isShort)
                        const shortItems = playlistVideos.filter(v => v.isShort)

                        const isVideosExpanded = expandedPlaylists[`${playlist.id}_videos`]
                        const isShortsExpanded = expandedPlaylists[`${playlist.id}_shorts`]

                        const displayVideos = isVideosExpanded ? videoItems : videoItems.slice(0, 4)
                        const displayShorts = isShortsExpanded ? shortItems : shortItems.slice(0, 4)

                        const hasMoreVideos = videoItems.length > 4
                        const hasMoreShorts = shortItems.length > 4

                        const selectedCount = selectedPlaylistItems[playlist.id]?.size || 0

                        return (
                          <div key={playlist.id} className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">{playlist.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {playlist.videoIds.length} {playlist.videoIds.length === 1 ? 'video' : 'videos'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedCount > 0 && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => handleRemoveFromPlaylist(playlist.id)}
                                  >
                                    Remove ({selectedCount})
                                  </Button>
                                )}
                                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                                  {playlist.visibility}
                                </div>
                              </div>
                            </div>

                            {playlist.videoIds.length === 0 ? (
                              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                This playlist is empty
                              </div>
                            ) : playlistVideos.length === 0 ? (
                              <div className="flex justify-center py-4">
                                <Button
                                  variant="outline"
                                  className="rounded-full"
                                  onClick={() => togglePlaylistExpansion(playlist.id, playlist.videoIds)}
                                >
                                  Load videos
                                </Button>
                              </div>
                            ) : (
                              <>
                                {videoItems.length > 0 && (
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Videos ({videoItems.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {displayVideos.map((video) => (
                                        <div
                                          key={video.id}
                                          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 transition-all hover:shadow-md dark:border-white/10 dark:bg-card/60"
                                        >
                                          <Checkbox
                                            checked={selectedPlaylistItems[playlist.id]?.has(video.id) || false}
                                            onCheckedChange={(checked) =>
                                              updatePlaylistItemSelection(playlist.id, video.id, !!checked)
                                            }
                                          />
                                          <Link href={`/watch/${video.id}`} className="flex flex-1 gap-4">
                                            <div className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-xl">
                                              <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-semibold line-clamp-2">{video.title}</p>
                                            </div>
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                    {hasMoreVideos && !isVideosExpanded && (
                                      <div className="flex justify-center">
                                        <Button
                                          variant="outline"
                                          className="rounded-full"
                                          onClick={() => setExpandedPlaylists(prev => ({ ...prev, [`${playlist.id}_videos`]: true }))}
                                        >
                                          See more
                                        </Button>
                                      </div>
                                    )}
                                    {isVideosExpanded && (
                                      <div className="flex justify-center">
                                        <Button
                                          variant="outline"
                                          className="rounded-full"
                                          onClick={() => setExpandedPlaylists(prev => ({ ...prev, [`${playlist.id}_videos`]: false }))}
                                        >
                                          Show less
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {shortItems.length > 0 && (
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Shorts ({shortItems.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {displayShorts.map((short) => (
                                        <div
                                          key={short.id}
                                          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 transition-all hover:shadow-md dark:border-white/10 dark:bg-card/60"
                                        >
                                          <Checkbox
                                            checked={selectedPlaylistItems[playlist.id]?.has(short.id) || false}
                                            onCheckedChange={(checked) =>
                                              updatePlaylistItemSelection(playlist.id, short.id, !!checked)
                                            }
                                          />
                                          <Link href={`/shorts/${short.id}`} className="flex flex-1 gap-4">
                                            <div className="relative aspect-[9/16] w-24 flex-shrink-0 overflow-hidden rounded-xl">
                                              <img
                                                src={short.thumbnail}
                                                alt={short.title}
                                                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-semibold line-clamp-2">{short.title}</p>
                                              <p className="text-xs text-muted-foreground mt-1">Short</p>
                                            </div>
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                    {hasMoreShorts && !isShortsExpanded && (
                                      <div className="flex justify-center">
                                        <Button
                                          variant="outline"
                                          className="rounded-full"
                                          onClick={() => setExpandedPlaylists(prev => ({ ...prev, [`${playlist.id}_shorts`]: true }))}
                                        >
                                          See more
                                        </Button>
                                      </div>
                                    )}
                                    {isShortsExpanded && (
                                      <div className="flex justify-center">
                                        <Button
                                          variant="outline"
                                          className="rounded-full"
                                          onClick={() => setExpandedPlaylists(prev => ({ ...prev, [`${playlist.id}_shorts`]: false }))}
                                        >
                                          Show less
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })
                    )}
                  </TabsContent>
                )}
                {isEditable && (
                  <TabsContent value="watchlater" className="space-y-6 p-6">
                    {watchLaterVideos.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                        No videos in Watch Later yet. Add videos from the shorts or video pages.
                      </div>
                    ) : (
                      <>
                        {selectedWatchLaterItems.size > 0 && (
                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-full"
                              onClick={handleRemoveFromWatchLater}
                            >
                              Remove ({selectedWatchLaterItems.size})
                            </Button>
                          </div>
                        )}
                        <div className="space-y-4">
                          {(() => {
                            const videoItems = watchLaterVideos.filter(v => !v.isShort)
                            const shortItems = watchLaterVideos.filter(v => v.isShort)

                            return (
                              <>
                                {videoItems.length > 0 && (
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Videos ({videoItems.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {videoItems.map((video) => (
                                        <div
                                          key={video.id}
                                          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 transition-all hover:shadow-md dark:border-white/10 dark:bg-card/60"
                                        >
                                          <Checkbox
                                            checked={selectedWatchLaterItems.has(video.id)}
                                            onCheckedChange={(checked) =>
                                              updateWatchLaterItemSelection(video.id, !!checked)
                                            }
                                          />
                                          <Link href={`/watch/${video.id}`} className="flex flex-1 gap-4">
                                            <div className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-xl">
                                              <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-semibold line-clamp-2">{video.title}</p>
                                            </div>
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {shortItems.length > 0 && (
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-muted-foreground">
                                      Shorts ({shortItems.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {shortItems.map((short) => (
                                        <div
                                          key={short.id}
                                          className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 transition-all hover:shadow-md dark:border-white/10 dark:bg-card/60"
                                        >
                                          <Checkbox
                                            checked={selectedWatchLaterItems.has(short.id)}
                                            onCheckedChange={(checked) =>
                                              updateWatchLaterItemSelection(short.id, !!checked)
                                            }
                                          />
                                          <Link href={`/shorts/${short.id}`} className="flex flex-1 gap-4">
                                            <div className="relative aspect-[9/16] w-24 flex-shrink-0 overflow-hidden rounded-xl">
                                              <img
                                                src={short.thumbnail}
                                                alt={short.title}
                                                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-sm font-semibold line-clamp-2">{short.title}</p>
                                              <p className="text-xs text-muted-foreground mt-1">Short</p>
                                            </div>
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </>
                    )}
                  </TabsContent>
                )}
                <TabsContent value="about" className="space-y-6 p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Description</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {currentChannel.description || 'No channel description provided yet.'}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Joined</p>
                      <p className="mt-1 text-base font-semibold">{joinedDate}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Total views</p>
                      <p className="mt-1 text-base font-semibold">{formattedViews}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscribers</p>
                      <p className="mt-1 text-base font-semibold">{formattedSubscribers}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Uploads</p>
                      <p className="mt-1 text-base font-semibold">{displayUploadCount}</p>
                    </div>
                  </div>
                </TabsContent>
                {isEditable && (
                  <TabsContent value="analytics" className="space-y-6 p-6">
                    {analyticsUploads.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground dark:border-white/15">
                        Upload a video or short to unlock channel analytics.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg views</p>
                            <p className="mt-2 text-2xl font-semibold">{formatViewCount(String(analyticsTotals.averageViews || 0))}</p>
                            <p className="text-xs text-muted-foreground">Across last {analyticsUploads.length} uploads</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Top performer</p>
                            <p className="mt-2 text-sm font-semibold">
                              {analyticsTotals.peakUpload?.title || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsTotals.peakUpload
                                ? `${formatViewCount(String(analyticsTotals.peakUpload.viewCount))} views • ${formatTimeAgo(analyticsTotals.peakUpload.publishedAt)}`
                                : 'Waiting for uploads'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm dark:border-white/10">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total recent views</p>
                            <p className="mt-2 text-2xl font-semibold">{formatViewCount(String(analyticsTotals.totalViews || 0))}</p>
                            <p className="text-xs text-muted-foreground">From latest uploads</p>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm dark:border-white/10 dark:bg-background/70">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Performance trend</h3>
                              <p className="text-sm text-muted-foreground">View counts across your most recent uploads</p>
                            </div>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Views</span>
                          </div>
                          {analyticsDonut && (
                            <>
                              <div className="mt-6 flex flex-col items-center gap-4 md:flex-row md:items-start">
                                <svg viewBox="0 0 100 100" className="h-40 w-40 md:h-48 md:w-48">
                                  <defs>
                                    <radialGradient id="analyticsDonut" cx="50%" cy="50%" r="50%">
                                      <stop offset="65%" stopColor="rgba(15,23,42,0)" />
                                      <stop offset="100%" stopColor="rgba(15,23,42,0.15)" />
                                    </radialGradient>
                                  </defs>
                                  <circle cx="50" cy="50" r="45" fill="url(#analyticsDonut)" />
                                  {analyticsDonut.segments.map((segment, index) => (
                                    <path key={`${segment.item.id}-${index}`} d={segment.path} fill={segment.color} opacity="0.85" stroke="#0f172a0d" strokeWidth="0.4" />
                                  ))}
                                  <circle cx="50" cy="50" r="24" fill="var(--background)" opacity="0.92" />
                                  <text x="50" y="47" textAnchor="middle" className="fill-muted-foreground text-[0.65rem] font-medium">
                                    Total views
                                  </text>
                                  <text x="50" y="60" textAnchor="middle" className="fill-foreground text-sm font-semibold">
                                    {formatViewCount(String(analyticsTotals.totalViews || 0))}
                                  </text>
                                </svg>
                                <div className="grid flex-1 gap-3">
                                  {analyticsDonut.segments.map((segment, index) => {
                                    const typeLabel = segment.item.type === 'short'
                                      ? 'Short'
                                      : segment.item.type === 'video'
                                        ? 'Video'
                                        : 'Others'
                                    const percent = Math.max(1, Math.round(segment.ratio * 100))
                                    return (
                                      <div key={`${segment.item.id}-${index}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                          <span
                                            className="inline-block h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: segment.color }}
                                          />
                                          <div>
                                            <p className="text-sm font-medium text-foreground line-clamp-1">
                                              {segment.item.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {typeLabel}
                                              {segment.item.type !== 'other' && ` • ${formatTimeAgo(segment.item.publishedAt)}`}
                                            </p>
                                          </div>
                                        </div>
                                        <p className="text-sm font-semibold text-muted-foreground">{percent}%</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </section>

          <aside className="order-2 flex flex-col gap-6 lg:order-1">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-background/70">
              <h3 className="text-base font-semibold">Channel snapshot</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-semibold">{formattedSubscribers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total views</span>
                  <span className="font-semibold">{formattedViews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Uploads</span>
                  <span className="font-semibold">{displayUploadCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-semibold">{joinedDate}</span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-background/70">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">About</h3>
                <Button asChild variant="ghost" size="sm" className="rounded-full px-3">
                  <Link href={`${pathname}?tab=about`}>Open</Link>
                </Button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {currentChannel.description || 'No channel description provided yet.'}
              </p>
            </div>
          </aside>
        </div>
      </div>
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={handleUploadComplete}
      />

      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
            <DialogDescription>
              Select an existing playlist or create a new one to add {pendingVideoIds.length} item(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {playlists.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="playlist-select">Select Playlist</Label>
                <select
                  id="playlist-select"
                  value={selectedPlaylist}
                  onChange={(e) => setSelectedPlaylist(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">-- Choose a playlist --</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-playlist">Or Create New Playlist</Label>
              <div className="flex gap-2">
                <Input
                  id="new-playlist"
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreatingPlaylist) {
                      handleCreatePlaylist()
                    }
                  }}
                />
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || isCreatingPlaylist}
                  size="sm"
                >
                  {isCreatingPlaylist ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlaylistDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddToPlaylist}
              disabled={!selectedPlaylist}
            >
              Add to Playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit {bulkEditType === 'video' ? 'Videos' : 'Shorts'}</DialogTitle>
            <DialogDescription>
              Update visibility settings for {bulkEditIds.length} {bulkEditType}(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="visibility-select">Visibility</Label>
              <select
                id="visibility-select"
                value={bulkEditVisibility}
                onChange={(e) => setBulkEditVisibility(e.target.value as 'public' | 'unlisted' | 'private')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkEdit}>
              Update {bulkEditType === 'video' ? 'Videos' : 'Shorts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPlaylist} onOpenChange={(open) => !open && setViewingPlaylist(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingPlaylist?.title}</DialogTitle>
            <DialogDescription>
              {viewingPlaylist?.description || 'No description'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {playlistVideos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                This playlist is empty
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {playlistVideos.map((video, index) => (
                  video.isShort ? (
                    <Link
                      key={video.id}
                      href={`/shorts/${video.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent"
                    >
                      <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                      <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                        <p className="text-xs text-muted-foreground">Short</p>
                      </div>
                    </Link>
                  ) : (
                    <Link
                      key={video.id}
                      href={`/watch/${video.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent"
                    >
                      <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                      <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                      </div>
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setViewingPlaylist(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
