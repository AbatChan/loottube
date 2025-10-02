'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Copy,
  Flag,
  Heart,
  HeartCrack,
  ListPlus,
  MessageCircle,
  MoreVertical,
  Pause,
  Play,
  Loader2,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatTimeAgo, formatViewCount } from '@/lib/format'
import {
  getVideoReaction,
  setVideoReaction,
  clearVideoReaction,
  isChannelSubscribed,
  toggleChannelSubscription,
} from '@/lib/client-interactions'
import { getCurrentUser, type User } from '@/lib/userAuth'
import { useToast } from '@/hooks/useToast'
import { incrementShortView, incrementShortLike, decrementShortLike, incrementShortDislike, decrementShortDislike, incrementShortComment, decrementShortComment, isLocalContent } from '@/lib/metrics'

interface ShortChannel {
  title?: string
  avatar?: string
  subscribers?: string
  handle?: string
  statistics?: {
    subscriberCount: string
    videoCount: string
  }
}

type ShortReply = {
  id: string
  author: string
  authorAvatar: string
  authorHandle?: string
  authorId?: string
  authorJoinedAt?: string
  text: string
  timestamp: string
  likes: number
}

type ShortComment = {
  id: string
  author: string
  authorAvatar: string
  authorHandle?: string
  authorId?: string
  authorJoinedAt?: string
  text: string
  timestamp: string
  likes: number
  replies: ShortReply[]
  isReadOnly?: boolean
}

const ensureHandleWithAt = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const withoutAt = trimmed.replace(/^@+/, '')
  const sanitized = withoutAt.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  if (!sanitized) return undefined
  return `@${sanitized.slice(0, 30)}`
}

const normalizeHandleForMatch = (value?: string | null) => {
  if (!value) return ''
  return value.trim().replace(/^@+/, '').toLowerCase()
}

const matchesShortEntity = (entity: any, user: ReturnType<typeof getCurrentUser> | null) => {
  if (!entity || typeof entity !== 'object' || !user) return false
  if (entity.authorId && entity.authorId === user.id) return true
  const entityHandle = normalizeHandleForMatch(entity.authorHandle ?? entity.handle ?? entity.channelHandle)
  const userHandle = normalizeHandleForMatch(user.channelHandle)
  if (entityHandle && userHandle && entityHandle === userHandle) return true
  const entityName = normalizeHandleForMatch(entity.author ?? entity.channelName)
  const userName = normalizeHandleForMatch(user.channelName)
  return Boolean(entityName && userName && entityName === userName)
}

const handleKey = (value?: string | null) => {
  const sanitized = ensureHandleWithAt(value)
  return sanitized ? sanitized.slice(1) : undefined
}

const nameKey = (value?: string | null) => {
  if (!value) return undefined
  return value.trim().replace(/^@+/, '').toLowerCase()
}

const isoStringOrUndefined = (value?: string | null) => {
  if (!value) return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

const matchesUserEntity = (entity: any, user: User | null) => {
  if (!entity || !user) return false
  if (typeof entity.authorId === 'string' && entity.authorId === user.id) {
    return true
  }
  const entityHandle = handleKey(entity.authorHandle ?? entity.handle ?? entity.channelHandle)
  const userHandle = handleKey(user.channelHandle)
  if (entityHandle && userHandle && entityHandle === userHandle) {
    return true
  }
  const entityName = nameKey(entity.author ?? entity.channelName)
  const userName = nameKey(user.channelName)
  return Boolean(entityName && userName && entityName === userName)
}

const buildShortAuthorSnapshot = (user: User | null, fallbackAvatar: string) => {
  const handle = ensureHandleWithAt(user?.channelHandle) ?? null
  const resolvedAvatar = user?.avatar && user.avatar.trim().length > 0 ? user.avatar : fallbackAvatar
  const displayName = handle ?? user?.channelName ?? 'You'
  const joinedAt = isoStringOrUndefined(user?.createdAt) ?? new Date().toISOString()

  return {
    author: displayName,
    authorAvatar: resolvedAvatar,
    authorHandle: handle ?? undefined,
    authorId: user?.id,
    authorJoinedAt: joinedAt,
  }
}

const toLocalShortReply = (raw: any, activeUser: User | null, fallbackAvatar: string): ShortReply => {
  const isActiveUser = matchesUserEntity(raw, activeUser)
  const snapshot = isActiveUser ? buildShortAuthorSnapshot(activeUser, fallbackAvatar) : null
  const handle = ensureHandleWithAt(raw?.authorHandle ?? raw?.handle ?? raw?.channelHandle) ?? snapshot?.authorHandle ?? null
  const avatar = typeof raw?.authorAvatar === 'string' && raw.authorAvatar.trim().length > 0
    ? raw.authorAvatar
    : snapshot?.authorAvatar ?? fallbackAvatar
  const joinedAt = isoStringOrUndefined(raw?.authorJoinedAt ?? (isActiveUser ? activeUser?.createdAt : undefined))
  const authorLabel = handle ?? (typeof raw?.author === 'string' && raw.author.trim().length > 0
    ? raw.author
    : snapshot?.author ?? 'Viewer')

  return {
    id: String(raw?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    author: authorLabel,
    authorAvatar: avatar || fallbackAvatar || '/placeholder.svg',
    authorHandle: handle ?? undefined,
    authorId: typeof raw?.authorId === 'string' ? raw.authorId : snapshot?.authorId,
    authorJoinedAt: joinedAt,
    text: typeof raw?.text === 'string' ? raw.text : '',
    timestamp: isoStringOrUndefined(raw?.timestamp) ?? new Date().toISOString(),
    likes: Number.isFinite(raw?.likes) ? raw.likes : 0,
  }
}

const toLocalShortComment = (raw: any, activeUser: User | null, fallbackAvatar: string): ShortComment => {
  const isActiveUser = matchesUserEntity(raw, activeUser)
  const snapshot = isActiveUser ? buildShortAuthorSnapshot(activeUser, fallbackAvatar) : null
  const handle = ensureHandleWithAt(raw?.authorHandle ?? raw?.handle ?? raw?.channelHandle) ?? snapshot?.authorHandle ?? null
  const avatar = typeof raw?.authorAvatar === 'string' && raw.authorAvatar.trim().length > 0
    ? raw.authorAvatar
    : snapshot?.authorAvatar ?? fallbackAvatar
  const joinedAt = isoStringOrUndefined(raw?.authorJoinedAt ?? (isActiveUser ? activeUser?.createdAt : undefined))
  const authorLabel = handle ?? (typeof raw?.author === 'string' && raw.author.trim().length > 0
    ? raw.author
    : snapshot?.author ?? 'Viewer')

  const replies = Array.isArray(raw?.replies)
    ? raw.replies.map((reply: any) => toLocalShortReply(reply, activeUser, fallbackAvatar))
    : []

  return {
    id: String(raw?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    author: authorLabel,
    authorAvatar: avatar || fallbackAvatar || '/placeholder.svg',
    authorHandle: handle ?? undefined,
    authorId: typeof raw?.authorId === 'string' ? raw.authorId : snapshot?.authorId,
    authorJoinedAt: joinedAt,
    text: typeof raw?.text === 'string' ? raw.text : '',
    timestamp: isoStringOrUndefined(raw?.timestamp) ?? new Date().toISOString(),
    likes: Number.isFinite(raw?.likes) ? raw.likes : 0,
    replies,
    isReadOnly: Boolean(raw?.isReadOnly),
  }
}

type CommentAvatarProps = {
  src?: string | null
  alt: string
  size?: number
}

const CommentAvatar = ({ src, alt, size = 32 }: CommentAvatarProps) => (
  <img
    src={src ?? '/placeholder.svg'}
    alt={alt}
    style={{ width: size, height: size }}
    className="rounded-full object-cover"
    onError={(event) => {
      event.currentTarget.src = '/placeholder.svg'
    }}
  />
)

interface ShortItem {
  id: string | number
  title: string
  description?: string
  viewCount?: string
  views?: string
  likes?: string
  commentCount?: string
  filePath?: string
  thumbnail?: string
  channelTitle?: string
  channelAvatar?: string
  channelId?: string
  channel?: ShortChannel
  snippet?: {
    channelTitle?: string
  }
  publishedAt?: string
  isLocal?: boolean
  ownerId?: string
}

interface ShortsProps {
  shorts: ShortItem[]
  onBack?: () => void
  initialShortId?: string
}

interface ReactionState {
  liked: boolean
  disliked: boolean
}

interface CenterIndicator {
  id: string | number
  state: 'play' | 'pause'
}

interface RemoteShortDetails {
  likeCount?: number
  viewCount?: string | number
  commentCount?: string | number
  embedUrl?: string | null
  comments: ShortComment[]
}

export function Shorts({ shorts, onBack, initialShortId }: ShortsProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const isNavigatingRef = useRef<boolean>(false)
  const { toast } = useToast()

  // Get current user only on client side to avoid hydration mismatch
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser> | null>(null)

  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  // Filter out current user's own shorts (except when viewing a specific short via initialShortId)
  const filteredShorts = useMemo(() => {
    if (!currentUser) return shorts

    // If viewing a specific short (has initialShortId), don't filter it out even if it's yours
    // This allows you to view your own shorts when clicking on them
    if (initialShortId) {
      return shorts.filter(short => {
        // Keep the requested short
        if (String(short.id) === initialShortId) return true
        // Filter out other shorts that are yours
        return short.channelId !== currentUser.channelId && short.ownerId !== currentUser.id
      })
    }

    // Normal filtering for shorts feed
    return shorts.filter(short =>
      short.channelId !== currentUser.channelId &&
      short.ownerId !== currentUser.id
    )
  }, [shorts, currentUser, initialShortId])

  // Find initial index based on initialShortId
  const initialIndex = useMemo(() => {
    if (!initialShortId) return 0
    const index = filteredShorts.findIndex(short => String(short.id) === initialShortId)
    return index >= 0 ? index : 0
  }, [initialShortId, filteredShorts])

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [likeCounts, setLikeCounts] = useState<Record<string | number, number>>({})
  const [comments, setComments] = useState<ShortComment[]>([])
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({})
  const [reactions, setReactions] = useState<Record<string | number, ReactionState>>({})
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>({})
  // Global mute state that persists across all shorts - unmuted by default on mobile, muted on desktop
  const [globalMuted, setGlobalMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 640 // muted on desktop (sm breakpoint), unmuted on mobile
  })
  const [centerIndicator, setCenterIndicator] = useState<CenterIndicator | null>(null)
  const indicatorTimeout = useRef<NodeJS.Timeout | null>(null)
  const videoRefs = useRef<Record<string | number, HTMLVideoElement | null>>({})
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [newReply, setNewReply] = useState('')
  const [remoteMeta, setRemoteMeta] = useState<Record<string | number, RemoteShortDetails>>({})
  const [remoteLoading, setRemoteLoading] = useState(false)
  const embedRefs = useRef<Record<string | number, HTMLIFrameElement | null>>({})
  const [playingState, setPlayingState] = useState<Record<string | number, boolean>>({})
  const [hasAudio, setHasAudio] = useState<Record<string | number, boolean>>({})
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [playlists, setPlaylists] = useState<Array<{ id: string; title: string; videoIds: string[] }>>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null)

  // Lazy loading: only render a window of shorts (3 before, current, 3 after)
  const RENDER_WINDOW = 3
  const visibleShorts = useMemo(() => {
    const start = Math.max(0, currentIndex - RENDER_WINDOW)
    const end = Math.min(filteredShorts.length, currentIndex + RENDER_WINDOW + 1)
    return filteredShorts.slice(start, end).map((short, idx) => ({
      short,
      absoluteIndex: start + idx
    }))
  }, [filteredShorts, currentIndex])

  const currentShort = filteredShorts[currentIndex]
  const currentShortId = currentShort?.id
  const currentDetails = (currentShortId !== undefined && remoteMeta[currentShortId]) || undefined
  const channelAvatarFallback = currentShort?.channelAvatar || currentShort?.channel?.avatar || '/placeholder.svg'
  const pickAvatar = useCallback(
    (...sources: Array<string | undefined | null>) =>
      sources.find((value) => typeof value === 'string' && value.trim().length > 0) || channelAvatarFallback,
    [channelAvatarFallback]
  )
  const localReplyCount = useMemo(
    () => comments.reduce((sum, comment) => sum + comment.replies.length, 0),
    [comments]
  )
  const remoteComments = currentDetails?.comments ?? []
  const remoteReplyCount = useMemo(
    () => remoteComments.reduce((sum, comment) => sum + comment.replies.length, 0),
    [remoteComments]
  )
  const remoteBaseCount = remoteComments.length > 0
    ? remoteComments.length + remoteReplyCount
    : Number(currentDetails?.commentCount ?? currentShort?.commentCount ?? 0)
  const totalCommentCount = remoteBaseCount + comments.length + localReplyCount
  const commentCountLabel = formatViewCount(String(totalCommentCount))
  const displayComments = useMemo(() => {
    const base = [...comments, ...remoteComments]
    if (base.length === 0) return base

    const now = Date.now()
    const normalizeHandle = (value?: string | null) => {
      const ensured = ensureHandleWithAt(value)
      return ensured ? ensured.replace(/^@+/, '').toLowerCase() : ''
    }
    const normalizeName = (value?: string | null) => (value ? value.replace(/^@+/, '').trim().toLowerCase() : '')

    const currentHandle = normalizeHandle(currentUser?.channelHandle)
    const currentName = normalizeName(currentUser?.channelName)
    const currentId = currentUser?.id ?? null

    const isCurrentUserComment = (comment: ShortComment) => {
      if (!currentUser) return false
      if (comment.authorId && comment.authorId === currentId) return true
      const commentHandle = normalizeHandle(comment.authorHandle)
      if (commentHandle && currentHandle && commentHandle === currentHandle) return true
      const commentName = normalizeName(comment.author)
      return Boolean(commentName && currentName && commentName === currentName)
    }

    const toScore = (comment: ShortComment) => {
      const likes = Number(comment.likes) || 0
      const replyCount = Array.isArray(comment.replies) ? comment.replies.length : 0
      const timestamp = Date.parse(comment.timestamp ?? '')
      const ageMs = Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : Number.MAX_SAFE_INTEGER
      const engagementScore = likes * 1_000_000 + replyCount * 50_000
      const recencyScore = Number.isFinite(timestamp) ? Math.max(0, 86400000 * 7 - ageMs) : 0
      return engagementScore + recencyScore
    }

    const userComments: ShortComment[] = []
    const otherComments: ShortComment[] = []

    base.forEach((comment) => {
      if (isCurrentUserComment(comment)) {
        userComments.push(comment)
      } else {
        otherComments.push(comment)
      }
    })

    userComments.sort((a, b) => {
      const timeA = Date.parse(a.timestamp ?? '')
      const timeB = Date.parse(b.timestamp ?? '')
      if (!Number.isFinite(timeA) && !Number.isFinite(timeB)) return 0
      if (!Number.isFinite(timeA)) return 1
      if (!Number.isFinite(timeB)) return -1
      return timeB - timeA
    })

    const rankedOthers = otherComments
      .map((comment) => ({ comment, score: toScore(comment) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.comment)

    return [...userComments, ...rankedOthers]
  }, [comments, remoteComments, currentUser])

  const formatRelativeTime = (value: string) => {
    if (!value) return 'just now'
    const parsed = Date.parse(value)
    if (Number.isNaN(parsed)) {
      return value
    }
    return formatTimeAgo(new Date(parsed).toISOString())
  }

  const getChannelId = (short: ShortItem) =>
    short.channelId || short.channelTitle || short.channel?.title || String(short.id)

  const ensureInitialState = (short: ShortItem) => {
    if (!short) return
    const shortId = short.id
    const channelId = getChannelId(short)

    setReactions((prev) => {
      if (prev[shortId] !== undefined) return prev
      const existing = getVideoReaction(String(shortId))
      return { ...prev, [shortId]: existing }
    })

    if (channelId) {
      setSubscriptions((prev) => {
        if (prev[channelId] !== undefined) return prev
        return { ...prev, [channelId]: isChannelSubscribed(channelId) }
      })
    }

    setPlayingState((prev) => {
      if (prev[shortId] !== undefined) return prev
      return { ...prev, [shortId]: true }
    })
  }

  const buildEmbedUrl = (id: string | number) => {
    const key = encodeURIComponent(String(id))
    return `https://www.youtube.com/embed/${key}?autoplay=1&playsinline=1&loop=1&playlist=${key}&enablejsapi=1&mute=1`
  }

  const mapRemoteComment = (thread: any): ShortComment => {
    const likeCount = Number(thread?.likeCount ?? 0)
    return {
      id: String(thread?.id ?? `remote-comment-${Date.now()}`),
      author: thread?.authorDisplayName ?? 'Viewer',
      authorAvatar: thread?.authorProfileImageUrl ?? '/placeholder.svg',
      text: thread?.textDisplay ?? '',
      timestamp: thread?.publishedAt ?? new Date().toISOString(),
      likes: Number.isFinite(likeCount) ? likeCount : 0,
      replies: Array.isArray(thread?.replies)
        ? thread.replies.map((reply: any) => {
            const replyLikeCount = Number(reply?.likeCount ?? 0)
            return {
              id: String(reply?.id ?? `remote-reply-${Date.now()}-${Math.random().toString(36).slice(2)}`),
              author: reply?.authorDisplayName ?? 'Viewer',
              authorAvatar: reply?.authorProfileImageUrl ?? '/placeholder.svg',
              text: reply?.textDisplay ?? '',
              timestamp: reply?.publishedAt ?? new Date().toISOString(),
              likes: Number.isFinite(replyLikeCount) ? replyLikeCount : 0,
            }
          })
        : [],
      isReadOnly: true,
    }
  }

  useEffect(() => {
    ensureInitialState(currentShort)
    if (!currentShort) return

    const shortId = currentShort.id
    const meta = remoteMeta[shortId]
    const fallbackLikeValue = Number.parseInt(currentShort.likes || '0', 10)
    const resolvedLikeCount = Number.isFinite(meta?.likeCount)
      ? Number(meta?.likeCount)
      : Number.isFinite(fallbackLikeValue)
        ? fallbackLikeValue
        : 0

    setLikeCounts((prev) => {
      if (prev[shortId] === resolvedLikeCount) return prev
      return { ...prev, [shortId]: resolvedLikeCount }
    })

    // Track view for local shorts (only once per session, not for author's own content)
    if (isLocalContent(String(shortId))) {
      const currentUser = getCurrentUser()
      const isOwnContent = currentUser && String(remoteMeta?.ownerId) === currentUser.id

      if (!isOwnContent) {
        const viewKey = `short_viewed_${shortId}`
        const hasViewed = sessionStorage.getItem(viewKey)

        if (!hasViewed) {
          sessionStorage.setItem(viewKey, 'true')
          incrementShortView(String(shortId)).catch((error) => {
            console.error('Failed to track short view:', error)
          })
        }
      }
    }
  }, [currentShort, remoteMeta])

  const refreshLocalComments = useCallback((user: ReturnType<typeof getCurrentUser> | null, previous?: ReturnType<typeof getCurrentUser> | null) => {
    if (!user && !previous) return
    setComments((prev) => {
      if (prev.length === 0) return prev
      const candidates = [user, previous].filter(Boolean) as ReturnType<typeof getCurrentUser>[]
      if (candidates.length === 0) return prev

      let changed = false
      const updated = prev.map((comment) => {
        if (!comment) return comment
        let commentChanged = false
        let nextComment = comment

        if (candidates.some((candidate) => matchesShortEntity(comment, candidate))) {
          const snapshot = buildShortAuthorSnapshot(user ?? candidates[0], pickAvatar(user?.avatar, comment.authorAvatar, channelAvatarFallback))
          nextComment = {
            ...comment,
            ...snapshot,
          }
          commentChanged = true
        }

        if (Array.isArray(comment.replies) && comment.replies.length > 0) {
          const updatedReplies = comment.replies.map((reply) => {
            if (candidates.some((candidate) => matchesShortEntity(reply, candidate))) {
              const snapshot = buildShortAuthorSnapshot(user ?? candidates[0], pickAvatar(user?.avatar, reply.authorAvatar, channelAvatarFallback))
              commentChanged = true
              return {
                ...reply,
                ...snapshot,
              }
            }
            return reply
          })
          if (commentChanged) {
            nextComment = {
              ...nextComment,
              replies: updatedReplies,
            }
          }
        }

        if (commentChanged) changed = true
        return nextComment
      })

      if (changed && currentShort) {
        persistComments(currentShort.id, updated)
      }

      return changed ? updated : prev
    })
  }, [currentShort, channelAvatarFallback, pickAvatar])

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: ReturnType<typeof getCurrentUser> | null; previousUser: ReturnType<typeof getCurrentUser> | null }>
      const detail = customEvent.detail
      const updated = detail?.user ?? getCurrentUser()
      refreshLocalComments(updated, detail?.previousUser ?? null)
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return
      if (event.key === 'lootube_current_user' || event.key === 'lootube_users') {
        const updated = getCurrentUser()
        refreshLocalComments(updated)
      }
    }

    window.addEventListener('lootube:user-updated', handleUserUpdated as EventListener)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('lootube:user-updated', handleUserUpdated as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [refreshLocalComments])

  // Load saved comments when current short changes
  useEffect(() => {
    if (currentShort) {
      try {
        const savedComments = JSON.parse(localStorage.getItem(`comments_shorts_${currentShort.id}`) || '[]')
        const savedLikes = JSON.parse(localStorage.getItem(`comment_likes_shorts_${currentShort.id}`) || '{}')
        let needsUpdate = false
        const normalizedComments: ShortComment[] = Array.isArray(savedComments)
          ? savedComments.map((comment: any) => {
              const fallbackAvatar = pickAvatar(comment.authorAvatar, comment.avatar, currentUser?.avatar, channelAvatarFallback)
              const normalized = toLocalShortComment(comment, currentUser, fallbackAvatar)

              if (!needsUpdate) {
                const originalHandle = ensureHandleWithAt(comment?.authorHandle ?? comment?.author)
                if (
                  normalized.author !== (comment?.author ?? '@you') ||
                  normalized.authorAvatar !== fallbackAvatar ||
                  normalized.authorHandle !== (originalHandle ?? comment?.authorHandle) ||
                  normalized.authorId !== (typeof comment?.authorId === 'string' ? comment.authorId : undefined)
                ) {
                  needsUpdate = true
                }
              }

              return normalized
            })
          : []

        setComments(normalizedComments)
        setCommentLikes(savedLikes && typeof savedLikes === 'object' ? savedLikes : {})

        if (needsUpdate && currentShort) {
          persistComments(currentShort.id, normalizedComments)
        }
      } catch (err) {
        console.error('Failed to load saved comments:', err)
        setComments([])
        setCommentLikes({})
      }
    }
  }, [currentShort, currentUser?.avatar, currentUser?.channelHandle, currentUser?.channelName, channelAvatarFallback])

  useEffect(() => {
    if (!currentUser) return
    refreshLocalComments(currentUser)
  }, [currentUser, refreshLocalComments])

  useEffect(() => {
    if (!currentShort || currentShort.filePath) {
      setRemoteLoading(false)
      return
    }

    const shortId = currentShort.id
    if (remoteMeta[shortId]) {
      setRemoteLoading(false)
      return
    }

    let cancelled = false
    setRemoteLoading(true)

    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/shorts/${shortId}?include=comments`)
        if (!response.ok) {
          throw new Error('Failed to load short details')
        }

        const data = await response.json()
        if (cancelled) return

        const mappedComments = Array.isArray(data.comments)
          ? data.comments.map(mapRemoteComment)
          : []

        const likeCountValue = Number(data.statistics?.likeCount ?? 0)
        const viewCountValue = data.statistics?.viewCount ?? currentShort.viewCount
        const commentCountValue = data.statistics?.commentCount ?? currentShort.commentCount

        setRemoteMeta((prev) => ({
          ...prev,
          [shortId]: {
            likeCount: Number.isFinite(likeCountValue) ? likeCountValue : 0,
            viewCount: viewCountValue,
            commentCount: commentCountValue,
            embedUrl: data.embedUrl ?? buildEmbedUrl(shortId),
            comments: mappedComments,
          },
        }))
      } catch (error) {
        console.warn('Failed to fetch short details', error)
        if (!cancelled) {
          setRemoteMeta((prev) => ({
            ...prev,
            [shortId]: {
              likeCount: undefined,
              viewCount: currentShort.viewCount,
              commentCount: currentShort.commentCount,
              embedUrl: buildEmbedUrl(shortId),
              comments: [],
            },
          }))
        }
      } finally {
        if (!cancelled) {
          setRemoteLoading(false)
        }
      }
    }

    fetchDetails()

    return () => {
      cancelled = true
    }
  }, [currentShort, remoteMeta])

  useEffect(() => {
    if (!showComments) {
      setReplyTo(null)
      setNewReply('')
    }
  }, [showComments])

  const persistComments = (shortId: string | number, updatedComments: ShortComment[]) => {
    try {
      localStorage.setItem(`comments_shorts_${shortId}`, JSON.stringify(updatedComments))
    } catch (err) {
      toast.error('Failed to save', "Couldn't save comments")
    }
  }

  const persistCommentLikes = (shortId: string | number, likesMap: Record<string, boolean>) => {
    try {
      localStorage.setItem(`comment_likes_shorts_${shortId}`, JSON.stringify(likesMap))
    } catch (err) {
      toast.error('Failed to save', "Couldn't save like status")
    }
  }

  const isShortOwner = Boolean(currentUser && currentShort?.ownerId && currentUser.id === currentShort.ownerId)
  const isCommentAuthor = (comment: ShortComment) => matchesUserEntity(comment, currentUser)
  const isReplyAuthor = (reply: ShortReply) => matchesUserEntity(reply, currentUser)
  const canDeleteComment = (comment: ShortComment) => Boolean(currentUser && (isCommentAuthor(comment) || isShortOwner))
  const canDeleteReply = (reply: ShortReply) => Boolean(currentUser && (isReplyAuthor(reply) || isShortOwner))

  const handleDeleteComment = (commentId: string) => {
    if (!currentShort) return
    setComments((prev) => {
      const target = prev.find((comment) => comment.id === commentId)
      if (!target || !canDeleteComment(target)) return prev

      const nextComments = prev.filter((comment) => comment.id !== commentId)
      const updatedLikes = { ...commentLikes }
      delete updatedLikes[commentId]
      target.replies.forEach((reply) => {
        delete updatedLikes[reply.id]
      })

      setCommentLikes(updatedLikes)
      persistComments(currentShort.id, nextComments)
      persistCommentLikes(currentShort.id, updatedLikes)

      // Update server comment count for local content
      const deletedCount = 1 + target.replies.length
      if (isLocalContent(String(currentShort.id))) {
        for (let i = 0; i < deletedCount; i++) {
          decrementShortComment(String(currentShort.id)).catch(console.error)
        }
      }

      return nextComments
    })
    setReplyTo((current) => (current === commentId ? null : current))
  }

  const handleDeleteReply = (commentId: string, replyId: string) => {
    if (!currentShort) return
    setComments((prev) => {
      let changed = false
      const nextComments = prev.map((comment) => {
        if (comment.id !== commentId) return comment
        const targetReply = comment.replies.find((reply) => reply.id === replyId)
        if (!targetReply || !canDeleteReply(targetReply)) return comment
        const updatedReplies = comment.replies.filter((reply) => reply.id !== replyId)
        if (updatedReplies.length === comment.replies.length) return comment
        changed = true
        return { ...comment, replies: updatedReplies }
      })

      if (!changed) return prev

      const updatedLikes = { ...commentLikes }
      delete updatedLikes[replyId]

      setCommentLikes(updatedLikes)
      persistComments(currentShort.id, nextComments)
      persistCommentLikes(currentShort.id, updatedLikes)

      // Update server comment count for local content
      if (isLocalContent(String(currentShort.id))) {
        decrementShortComment(String(currentShort.id)).catch(console.error)
      }

      return nextComments
    })
    setReplyTo((current) => (current === commentId ? null : current))
  }

  const handleReaction = async (shortId: string | number, type: 'like' | 'dislike') => {
    const current = reactions[shortId] ?? { liked: false, disliked: false }
    const wasLiked = current.liked
    const wasDisliked = current.disliked

    setReactions((prev) => {
      const next: ReactionState = {
        liked: type === 'like' ? !current.liked : false,
        disliked: type === 'dislike' ? !current.disliked : false,
      }

      if (type === 'like' && current.liked) next.liked = false
      if (type === 'dislike' && current.disliked) next.disliked = false

      if (!next.liked && !next.disliked) {
        clearVideoReaction(String(shortId))
      } else {
        setVideoReaction(String(shortId), next)
      }

      return { ...prev, [shortId]: next }
    })

    // Update server metrics for local content
    if (isLocalContent(String(shortId))) {
      if (type === 'like') {
        if (!wasLiked) {
          await incrementShortLike(String(shortId))
        } else {
          await decrementShortLike(String(shortId))
        }
        // If was disliked before, decrement dislike
        if (wasDisliked) {
          await decrementShortDislike(String(shortId))
        }
      } else if (type === 'dislike') {
        if (!wasDisliked) {
          await incrementShortDislike(String(shortId))
        } else {
          await decrementShortDislike(String(shortId))
        }
        // If was liked before, decrement like
        if (wasLiked) {
          await decrementShortLike(String(shortId))
        }
      }
    }
  }

  const handleSubscribe = (short: ShortItem) => {
    const channelId = getChannelId(short)
    if (!channelId) return
    const channelName = short.snippet?.channelTitle || short.channel?.title || 'Unknown Channel'
    const channelHandle = short.channel?.handle || (short.snippet?.channelTitle ? `@${short.snippet.channelTitle.replace(/\s+/g, '')}` : undefined)
    const next = toggleChannelSubscription(channelId, channelName, channelHandle)
    setSubscriptions((prev) => ({ ...prev, [channelId]: next }))
  }

  const toggleMute = (shortId: string | number) => {
    const nextMuted = !globalMuted
    setGlobalMuted(nextMuted)

    // Apply to current video/iframe
    const video = videoRefs.current[shortId]
    if (video) {
      video.muted = nextMuted
    }
    const iframe = embedRefs.current[shortId]
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: nextMuted ? 'mute' : 'unMute', args: [] }),
        '*'
      )
    }
  }

  const showCenterOverlay = (shortId: string | number, state: 'play' | 'pause') => {
    if (indicatorTimeout.current) clearTimeout(indicatorTimeout.current)
    setCenterIndicator({ id: shortId, state })
    indicatorTimeout.current = setTimeout(() => setCenterIndicator(null), 600)
  }

  const togglePlayback = (shortId: string | number) => {
    const video = videoRefs.current[shortId]
    if (video) {
      if (video.paused) {
        video.play().catch(() => undefined)
        showCenterOverlay(shortId, 'play')
        setPlayingState((prev) => ({ ...prev, [shortId]: true }))
      } else {
        video.pause()
        showCenterOverlay(shortId, 'pause')
        setPlayingState((prev) => ({ ...prev, [shortId]: false }))
      }
      return
    }

    const iframe = embedRefs.current[shortId]
    if (iframe?.contentWindow) {
      const isPlaying = playingState[shortId] ?? true
      const nextPlaying = !isPlaying
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: nextPlaying ? 'playVideo' : 'pauseVideo', args: [] }),
        '*'
      )
      setPlayingState((prev) => ({ ...prev, [shortId]: nextPlaying }))
      showCenterOverlay(shortId, nextPlaying ? 'play' : 'pause')
    }
  }

  const handleNavigation = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < filteredShorts.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else if (direction === 'down' && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let deltaY = 0
    let wheelTimeout: NodeJS.Timeout | null = null
    let swipeStartTime = 0

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()

      // Prevent multiple navigations at once
      if (isNavigatingRef.current) return

      deltaY += event.deltaY
      if (wheelTimeout) clearTimeout(wheelTimeout)

      wheelTimeout = setTimeout(() => {
        if (deltaY > 50) {
          isNavigatingRef.current = true
          handleNavigation('up')
          setTimeout(() => { isNavigatingRef.current = false }, 500)
        } else if (deltaY < -50) {
          isNavigatingRef.current = true
          handleNavigation('down')
          setTimeout(() => { isNavigatingRef.current = false }, 500)
        }
        deltaY = 0
      }, 50)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (!isNavigatingRef.current) {
        touchStartY.current = event.touches[0].clientY
        swipeStartTime = Date.now()
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (touchStartY.current === null || isNavigatingRef.current) {
        // Prevent default to stop browser from scrolling
        event.preventDefault()
        return
      }

      const currentY = event.touches[0].clientY
      const diff = touchStartY.current - currentY

      // Prevent browser scroll during our gesture
      if (Math.abs(diff) > 10) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStartY.current === null || isNavigatingRef.current) {
        touchStartY.current = null
        swipeStartTime = 0
        return
      }

      const endY = event.changedTouches[0].clientY
      const diff = touchStartY.current - endY
      const swipeDuration = Date.now() - swipeStartTime

      // Only trigger navigation on touchEnd with significant distance and valid duration
      if (Math.abs(diff) > 80 && swipeDuration > 50 && swipeDuration < 800) {
        isNavigatingRef.current = true

        if (diff > 0) {
          handleNavigation('up')
        } else {
          handleNavigation('down')
        }

        // Lock for full animation duration
        setTimeout(() => { isNavigatingRef.current = false }, 500)
      }

      touchStartY.current = null
      swipeStartTime = 0
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isNavigatingRef.current) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        isNavigatingRef.current = true
        handleNavigation('up')
        setTimeout(() => { isNavigatingRef.current = false }, 500)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        isNavigatingRef.current = true
        handleNavigation('down')
        setTimeout(() => { isNavigatingRef.current = false }, 500)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('keydown', handleKeyDown)
      if (wheelTimeout) clearTimeout(wheelTimeout)
    }
  }, [currentIndex, filteredShorts.length])

  useEffect(() => {
    const activeId = filteredShorts[currentIndex]?.id
    Object.entries(videoRefs.current).forEach(([id, element]) => {
      if (!element) return
      if (id === String(activeId)) {
        element.play().catch(() => undefined)
      } else {
        element.pause()
      }
    })

    Object.entries(embedRefs.current).forEach(([id, element]) => {
      if (!element?.contentWindow) return
      const isActive = id === String(activeId)
      element.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: isActive ? 'playVideo' : 'pauseVideo', args: [] }),
        '*'
      )
    })

    setPlayingState((prev) => {
      const next: Record<string | number, boolean> = { ...prev }
      let changed = false
      const targetKey = activeId !== undefined ? String(activeId) : null

      Object.keys(videoRefs.current).forEach((id) => {
        const nextValue = targetKey !== null && id === targetKey
        if (next[id] !== nextValue) {
          next[id] = nextValue
          changed = true
        }
      })

      Object.keys(embedRefs.current).forEach((id) => {
        const nextValue = targetKey !== null && id === targetKey
        if (next[id] !== nextValue) {
          next[id] = nextValue
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [currentIndex, filteredShorts])

  useEffect(() => {
    if (!currentShort) return
    const video = videoRefs.current[currentShort.id]
    if (video) {
      video.muted = globalMuted
    }
    const iframe = embedRefs.current[currentShort.id]
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: globalMuted ? 'mute' : 'unMute',
          args: [],
        }),
        '*'
      )
    }
  }, [globalMuted, currentShort])

  useEffect(() => () => {
    if (indicatorTimeout.current) clearTimeout(indicatorTimeout.current)
  }, [])

  const formatCount = (value?: string) => (value ? formatViewCount(value) : '0')

  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return

    const timestamp = new Date().toISOString()
    const authorSnapshot = buildShortAuthorSnapshot(currentUser, pickAvatar(currentUser.avatar, channelAvatarFallback))
    const comment: ShortComment = {
      id: Date.now().toString(),
      ...authorSnapshot,
      text: newComment.trim(),
      timestamp,
      likes: 0,
      replies: [],
    }

    const newComments = [comment, ...comments]
    setComments(newComments)
    setNewComment('')
    setReplyTo(null)

    if (currentShort) {
      persistComments(currentShort.id, newComments)

      // Update server comment count for local content
      if (isLocalContent(String(currentShort.id))) {
        incrementShortComment(String(currentShort.id)).catch(console.error)
      }
    }
  }

  const handleAddReply = (commentId: string) => {
    if (!newReply.trim() || !currentUser || !currentShort) return

    const parentComment = comments.find((comment) => comment.id === commentId)

    const timestamp = new Date().toISOString()
    const replySnapshot = buildShortAuthorSnapshot(
      currentUser,
      pickAvatar(currentUser.avatar, parentComment?.authorAvatar, channelAvatarFallback)
    )
    const reply: ShortReply = {
      id: Date.now().toString(),
      ...replySnapshot,
      text: newReply.trim(),
      timestamp,
      likes: 0,
    }

    const updatedComments = comments.map((comment) =>
      comment.id === commentId
        ? { ...comment, replies: [...comment.replies, reply] }
        : comment
    )

    setComments(updatedComments)
    setNewReply('')
    setReplyTo(null)

    persistComments(currentShort.id, updatedComments)

    // Update server comment count for local content
    if (isLocalContent(String(currentShort.id))) {
      incrementShortComment(String(currentShort.id)).catch(console.error)
    }
  }

  const handleSaveToPlaylist = async (short: ShortItem) => {
    const user = getCurrentUser()
    if (!user) {
      toast.error('Please sign in to save to playlist')
      return
    }

    try {
      const response = await fetch(`/api/playlists?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch playlists')
      }

      const playlistsData = await response.json()
      setPlaylists(playlistsData)
      setPendingVideoId(String(short.id))
      setShowPlaylistModal(true)
    } catch (error) {
      console.error('Error fetching playlists:', error)
      toast.error('Failed to load playlists')
    }
  }

  const handlePlaylistSelect = async () => {
    if (!pendingVideoId || !currentUser) return

    try {
      if (isCreatingPlaylist) {
        if (!newPlaylistName.trim()) {
          toast.error('Please provide a playlist name')
          return
        }

        const createResponse = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            title: newPlaylistName,
            description: '',
            visibility: 'private',
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create playlist')
        }

        const newPlaylist = await createResponse.json()
        const addResponse = await fetch(`/api/playlists/${newPlaylist.id}/add-videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            videoIds: [pendingVideoId]
          }),
        })

        if (!addResponse.ok) {
          throw new Error('Failed to add to playlist')
        }

        toast.success('Saved to new playlist!')
      } else {
        if (!selectedPlaylistId) {
          toast.error('Please select a playlist')
          return
        }

        const addResponse = await fetch(`/api/playlists/${selectedPlaylistId}/add-videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            videoIds: [pendingVideoId]
          }),
        })

        if (!addResponse.ok) {
          throw new Error('Failed to add to playlist')
        }

        toast.success('Saved to playlist!')
      }

      // Close modal
      setShowPlaylistModal(false)
      setSelectedPlaylistId('')
      setNewPlaylistName('')
      setIsCreatingPlaylist(false)
      setPendingVideoId(null)

      // Close the more menu
      setShowMore(false)
    } catch (error) {
      console.error('Error saving to playlist:', error)
      toast.error('Failed to save to playlist')
    }
  }

  const handleWatchLater = async (short: ShortItem) => {
    const user = getCurrentUser()
    if (!user) {
      toast.error('Please sign in to save to Watch Later')
      return
    }

    try {
      // Fetch user's playlists
      const response = await fetch(`/api/playlists?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch playlists')
      }

      const playlists = await response.json()

      // Look for existing "Watch Later" playlist
      let watchLaterPlaylist = playlists.find((p: any) => p.title === 'Watch Later')

      // Create "Watch Later" playlist if it doesn't exist
      if (!watchLaterPlaylist) {
        const createResponse = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            title: 'Watch Later',
            description: 'Videos to watch later',
            visibility: 'private',
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create Watch Later playlist')
        }

        watchLaterPlaylist = await createResponse.json()
      }

      // Add to Watch Later playlist
      const addResponse = await fetch(`/api/playlists/${watchLaterPlaylist.id}/add-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          videoIds: [short.id]
        }),
      })

      if (!addResponse.ok) {
        const error = await addResponse.json()
        throw new Error(error.error || 'Failed to add to Watch Later')
      }

      toast.success('Added to Watch Later!')
    } catch (error) {
      console.error('Error saving to Watch Later:', error)
      toast.error('Failed to save to Watch Later')
    }
  }

  const handleReportShort = () => {
    // Show toast for report
    toast.success('Report submitted. Thank you for helping keep Lootube safe!')
  }

  const renderActionRail = (short: ShortItem, vertical: boolean) => {
    const reaction = reactions[short.id] ?? { liked: false, disliked: false }
    const fallbackLikesRaw = Number.parseInt(short.likes || '0', 10)
    const fallbackLikes = Number.isNaN(fallbackLikesRaw) ? 0 : fallbackLikesRaw
    const currentLikes = likeCounts[short.id] ?? fallbackLikes
    const displayLikes = reaction.liked ? currentLikes + 1 : currentLikes
    const meta = remoteMeta[short.id]
    let baseCommentCount = Number(short.commentCount || 0)

    if (meta) {
      if (meta.comments.length > 0) {
        const remoteReplies = meta.comments.reduce((sum, comment) => sum + comment.replies.length, 0)
        baseCommentCount = meta.comments.length + remoteReplies
      } else if (meta.commentCount !== undefined) {
        const numericMeta = Number(meta.commentCount)
        baseCommentCount = Number.isFinite(numericMeta) ? numericMeta : baseCommentCount
      }
    }

    const extraComments = short.id === currentShort?.id ? comments.length + localReplyCount : 0
    const commentLabel = formatCount(String(baseCommentCount + extraComments))

    const likeIcon = (
      <span className="relative flex items-center justify-center">
        <Heart
          className={cn(
            'h-7 w-7 transition-transform duration-300',
            reaction.liked ? 'scale-110 fill-current text-rose-500' : 'text-white/80'
          )}
        />
        {reaction.liked && (
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-rose-300 animate-ping" />
        )}
      </span>
    )

    const dislikeIcon = (
      <span className="relative flex items-center justify-center">
        <HeartCrack
          className={cn(
            'h-7 w-7 transition-transform duration-300',
            reaction.disliked ? 'scale-110 fill-current text-destructive' : 'text-white/80'
          )}
        />
        {reaction.disliked && (
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-destructive/70 animate-ping" />
        )}
      </span>
    )

    return (
      <div
        className={cn(
          'absolute z-20 flex items-center justify-center space-y-4',
          vertical
            ? 'hidden sm:flex flex-col right-4 bottom-8'
            : 'sm:hidden flex-col right-3 bottom-20 space-y-4'
        )}
      >
        <InteractionButton
          icon={likeIcon}
          label={formatCount(displayLikes.toString())}
          active={reaction.liked}
          onClick={() => handleReaction(short.id, 'like')}
        />
        <InteractionButton
          icon={dislikeIcon}
          label="Dislike"
          active={reaction.disliked}
          onClick={() => handleReaction(short.id, 'dislike')}
        />
        <InteractionButton
          icon={<MessageCircle className="h-7 w-7" />}
          label={commentLabel}
          onClick={() => setShowComments(true)}
        />
        <InteractionButton
          icon={<Share2 className="h-7 w-7" />}
          label="Share"
          onClick={() => setShowShare(true)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center space-y-1 text-white"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 transition hover:bg-black/70">
                <MoreVertical className="h-7 w-7" />
              </span>
              <span className="text-xs text-white/80">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); handleSaveToPlaylist(short); }}>
              <ListPlus className="h-4 w-4" /> Save to playlist
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); handleWatchLater(short); }}>
              <Clock className="h-4 w-4" /> Watch later
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={(event) => { event.preventDefault(); handleReportShort(); }}>
              <Flag className="h-4 w-4" /> Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderShort = (short: ShortItem) => {
    const shortId = short.id
    const reaction = reactions[shortId] ?? { liked: false, disliked: false }
    const channelId = getChannelId(short)
    const subscribed = channelId ? subscriptions[channelId] : false
    const isOwner = Boolean(currentUser && short.ownerId && currentUser.id === short.ownerId)
    const channelName = short.channel?.title || short.channelTitle || channelId || 'Channel'
    const channelAvatar = short.channelAvatar || short.channel?.avatar
    const publishedAgo = short.publishedAt ? formatTimeAgo(short.publishedAt) : null
    const meta = remoteMeta[shortId]
    const viewCountValue = meta?.viewCount ?? short.viewCount
    const viewsLabel = viewCountValue ? `${formatViewCount(String(viewCountValue))} views` : short.views
    const embedBaseUrl = meta?.embedUrl ?? (!short.filePath ? buildEmbedUrl(shortId) : null)
    // Use consistent server/client embedUrl to prevent hydration mismatch
    const embedUrl = embedBaseUrl

    return (
      <div key={shortId} className="relative flex h-full w-full items-center justify-center">
        <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-none sm:rounded-[24px] lg:rounded-[28px] sm:h-[90%] sm:w-[455px] lg:w-[503px]">
          <div className="absolute inset-0">
            {short.filePath ? (
              <video
                ref={(element) => {
                  videoRefs.current[shortId] = element
                  embedRefs.current[shortId] = null
                  if (element) {
                    element.addEventListener('loadedmetadata', () => {
                      // Check if video has audio tracks
                      const audioTracks = (element as any).audioTracks || (element as any).mozAudioTracks || (element as any).webkitAudioTracks
                      const hasAudioTrack = audioTracks ? audioTracks.length > 0 : true // Default to true if can't detect
                      setHasAudio(prev => ({ ...prev, [shortId]: hasAudioTrack }))
                    })
                  }
                }}
                src={short.filePath}
                className="h-full w-full object-cover"
                playsInline
                loop
                autoPlay
                muted={globalMuted}
                preload="auto"
                onClick={() => togglePlayback(shortId)}
              />
            ) : embedUrl ? (
              <iframe
                ref={(element) => {
                  embedRefs.current[shortId] = element
                  videoRefs.current[shortId] = null
                }}
                src={embedUrl}
                title={short.title || 'Lootube short'}
                className="h-full w-full object-cover"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                frameBorder="0"
              />
            ) : (
              <img
                src={short.thumbnail || '/placeholder.svg'}
                alt={short.title}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = '/placeholder.svg'
                }}
              />
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

          <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between">
            <div className="hidden items-center space-x-3 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={() => (onBack ? onBack() : router.back())}
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={() => hasAudio[shortId] !== false ? toggleMute(shortId) : null}
                disabled={hasAudio[shortId] === false}
                title={hasAudio[shortId] === false ? 'No audio available' : globalMuted ? 'Unmute' : 'Mute'}
              >
                {hasAudio[shortId] === false ? (
                  <div className="relative">
                    <VolumeX className="h-5 w-5" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-[2px] w-7 bg-white rotate-45" />
                    </div>
                  </div>
                ) : globalMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
                <span className="sr-only">
                  {hasAudio[shortId] === false ? 'No audio' : 'Toggle mute'}
                </span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search shorts</span>
            </Button>
          </div>

          {centerIndicator?.id === shortId && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <span className="absolute h-20 w-20 rounded-full bg-white/25 blur-lg" />
              <span className="absolute h-16 w-16 rounded-full bg-white/20 animate-ping" />
              <span className="absolute h-16 w-16 rounded-full bg-black/50" />
              {centerIndicator.state === 'play' ? (
                <Play className="relative h-7 w-7 text-white" />
              ) : (
                <Pause className="relative h-7 w-7 text-white" />
              )}
            </div>
          )}

          <button
            type="button"
            className="absolute inset-0 z-10"
            onClick={() => togglePlayback(shortId)}
            aria-label="Toggle playback"
          />

          <div className="absolute left-4 right-[90px] bottom-20 z-20 space-y-3 text-white sm:bottom-8">
            <div className="flex items-center space-x-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/40">
                {channelAvatar && channelAvatar !== '/placeholder.svg' ? (
                  <img
                    src={channelAvatar}
                    alt={channelName}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      // Replace with initials on error
                      const parent = event.currentTarget.parentElement
                      if (parent) {
                        parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-blue-600 text-white font-bold text-lg">${channelName.charAt(0).toUpperCase()}</div>`
                      }
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-600 text-white font-bold text-lg">
                    {channelName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{channelName}</p>
                <p className="text-xs text-white/70">
              {short.channel?.statistics?.subscriberCount
                    ? `${formatViewCount(short.channel.statistics.subscriberCount)} subscribers`
                    : 'Shorts creator'}
                </p>
              </div>
              {!isOwner && (
                <Button
                  size="sm"
                  className={cn(
                    'rounded-full px-4 font-medium',
                    subscribed ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white text-black'
                  )}
                  onClick={() => handleSubscribe(short)}
                >
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
              )}
          </div>

            <div className="space-y-1 text-sm leading-snug">
              <p className="font-semibold">{short.title}</p>
              {short.description && (
                <p className="line-clamp-2 whitespace-pre-line text-white/85">{short.description}</p>
              )}
              <div className="space-x-2 text-xs text-white/60">
                {viewsLabel && <span>{viewsLabel}</span>}
                {publishedAgo && <span>• {publishedAgo}</span>}
              </div>
            </div>
          </div>

          {renderActionRail(short, true)}
          {renderActionRail(short, false)}
        </div>
      </div>
    )
  }

  // Show message if no shorts available
  if (filteredShorts.length === 0) {
    return (
      <div className="fixed top-0 left-0 h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-6">
          <p className="text-xl font-medium text-foreground">No shorts available</p>
          <p className="text-sm text-muted-foreground">There are no shorts to display right now</p>
          <Button
            variant="default"
            className="mt-4"
            onClick={() => (onBack ? onBack() : router.back())}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed top-0 left-0 h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      <div
        className="h-full w-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateY(-${currentIndex * 100}%)` }}
      >
        {visibleShorts.map(({ short, absoluteIndex }) => (
          <div
            key={short.id}
            style={{
              position: 'absolute',
              top: `${absoluteIndex * 100}%`,
              left: 0,
              right: 0,
              height: '100%'
            }}
          >
            {renderShort(short)}
          </div>
        ))}
      </div>

      {/* Navigation arrows for desktop - hidden on mobile, positioned beside the short */}
      <div className="hidden sm:flex sm:flex-col sm:gap-3 absolute top-1/2 -translate-y-1/2 z-30" style={{ left: 'calc(50% + 455px/2 + 3rem)' }}>
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
            onClick={() => handleNavigation('down')}
          >
            <ChevronRight className="h-6 w-6 rotate-[-90deg]" />
            <span className="sr-only">Previous short</span>
          </Button>
        )}
        {currentIndex < filteredShorts.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
            onClick={() => handleNavigation('up')}
          >
            <ChevronRight className="h-6 w-6 rotate-90" />
            <span className="sr-only">Next short</span>
          </Button>
        )}
      </div>

      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="flex flex-col h-[min(80vh,500px)] w-[calc(100vw-2rem)] max-w-[425px] rounded-xl bg-background sm:rounded-2xl">
          <DialogTitle className="flex items-center gap-2">
            Comments
            <span className="text-sm font-normal text-muted-foreground">
              {commentCountLabel}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">View and add comments</DialogDescription>
          <div className="mb-4 flex items-center space-x-2">
            <div className="flex-shrink-0">
              <CommentAvatar
                src={currentUser?.avatar || channelAvatarFallback}
                alt={currentUser?.channelName || 'User'}
                size={32}
              />
            </div>
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newComment.trim()) {
                  handleAddComment()
                }
              }}
              className="flex-1"
            />
            {newComment.trim() && (
              <Button
                size="sm"
                onClick={handleAddComment}
                className="ml-2"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 min-h-0 pr-4">
            {remoteLoading && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching latest comments…
              </div>
            )}

            {displayComments.length === 0 && !remoteLoading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No comments yet</p>
                <p className="text-xs text-muted-foreground">Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayComments.map((comment) => {
                  const isReadOnly = Boolean(comment.isReadOnly)
                  const commentHandle = comment.authorHandle ?? null
                  const commentHref = commentHandle ? `/@${commentHandle.replace(/^@+/, '')}` : null

                  return (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-2">
                        <div className="flex-shrink-0">
                          {commentHref ? (
                            <Link href={commentHref} className="inline-flex" onClick={() => setShowComments(false)}>
                              <CommentAvatar src={comment.authorAvatar} alt={comment.author} size={32} />
                            </Link>
                          ) : (
                            <CommentAvatar src={comment.authorAvatar} alt={comment.author} size={32} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {commentHref ? (
                                <Link
                                  href={commentHref}
                                  className="text-sm font-medium hover:text-primary transition-colors"
                                  onClick={() => setShowComments(false)}
                                >
                                  {comment.author}
                                </Link>
                              ) : (
                                <span className="text-sm font-medium">{comment.author}</span>
                              )}
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(comment.timestamp)}</p>
                            </div>
                            {!isReadOnly && canDeleteComment(comment) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteComment(comment.id)}
                                aria-label="Delete comment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{comment.text}</p>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-muted-foreground">
                            {isReadOnly ? (
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {formatViewCount(String(comment.likes))}
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 px-2 ${commentLikes[comment.id] ? 'text-rose-500' : ''}`}
                                onClick={() => {
                                  const newLikes = { ...commentLikes }
                                  const isLiked = !newLikes[comment.id]
                                  newLikes[comment.id] = isLiked
                                  setCommentLikes(newLikes)

                                  setComments((prev) => {
                                    const updated = prev.map((c) =>
                                      c.id === comment.id
                                        ? { ...c, likes: Math.max(0, c.likes + (isLiked ? 1 : -1)) }
                                        : c
                                    )
                                    if (currentShort) {
                                      persistCommentLikes(currentShort.id, newLikes)
                                      persistComments(currentShort.id, updated)
                                    }
                                    return updated
                                  })
                                }}
                              >
                                <Heart className={`mr-1 h-4 w-4 ${commentLikes[comment.id] ? 'fill-current' : ''}`} />
                                {comment.likes}
                              </Button>
                            )}
                            {!isReadOnly && currentUser && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => {
                                  setReplyTo(replyTo === comment.id ? null : comment.id)
                                  setNewReply('')
                                }}
                              >
                                Reply
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {comment.replies.length > 0 && (
                        <div className="ml-10 space-y-2">
                          {comment.replies.map((reply) => {
                            const replyHandle = reply.authorHandle ?? null
                            const replyHref = replyHandle ? `/@${replyHandle.replace(/^@+/, '')}` : commentHref

                            return (
                              <div key={reply.id} className="flex space-x-2">
                                <div className="flex-shrink-0">
                                  {replyHref ? (
                                    <Link href={replyHref} className="inline-flex" onClick={() => setShowComments(false)}>
                                      <CommentAvatar src={reply.authorAvatar} alt={reply.author} size={24} />
                                    </Link>
                                  ) : (
                                    <CommentAvatar src={reply.authorAvatar} alt={reply.author} size={24} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      {replyHref ? (
                                        <Link
                                          href={replyHref}
                                          className="text-xs font-medium hover:text-primary transition-colors"
                                          onClick={() => setShowComments(false)}
                                        >
                                          {reply.author}
                                        </Link>
                                      ) : (
                                        <span className="text-xs font-medium">{reply.author}</span>
                                      )}
                                      <p className="text-[11px] text-muted-foreground">{formatRelativeTime(reply.timestamp)}</p>
                                    </div>
                                    {!isReadOnly && canDeleteReply(reply) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteReply(comment.id, reply.id)}
                                        aria-label="Delete reply"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <p className="text-xs">{reply.text}</p>
                                  <div className="mt-1 flex items-center space-x-3 text-[11px] text-muted-foreground">
                                    {isReadOnly ? (
                                      <span className="flex items-center gap-1">
                                        <Heart className="h-3 w-3" />
                                        {formatViewCount(String(reply.likes))}
                                      </span>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-5 px-2 ${commentLikes[reply.id] ? 'text-rose-500' : ''}`}
                                        onClick={() => {
                                          const newLikes = { ...commentLikes }
                                          const isLiked = !newLikes[reply.id]
                                          newLikes[reply.id] = isLiked
                                          setCommentLikes(newLikes)

                                          setComments((prev) => {
                                            const updated = prev.map((c) =>
                                              c.id === comment.id
                                                ? {
                                                    ...c,
                                                    replies: c.replies.map((r) =>
                                                      r.id === reply.id
                                                        ? {
                                                            ...r,
                                                            likes: Math.max(0, r.likes + (isLiked ? 1 : -1)),
                                                          }
                                                        : r
                                                    ),
                                                  }
                                                : c
                                            )
                                            if (currentShort) {
                                              persistCommentLikes(currentShort.id, newLikes)
                                              persistComments(currentShort.id, updated)
                                            }
                                            return updated
                                          })
                                        }}
                                      >
                                        <Heart className={`mr-1 h-3 w-3 ${commentLikes[reply.id] ? 'fill-current' : ''}`} />
                                        {reply.likes}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {!isReadOnly && replyTo === comment.id && currentUser && (
                        <div className="ml-10 mt-2 flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <CommentAvatar
                              src={currentUser.avatar || '/placeholder.svg'}
                              alt={currentUser.channelName || 'You'}
                              size={26}
                            />
                          </div>
                          <Input
                            placeholder={`Reply to ${comment.author}...`}
                            value={newReply}
                            onChange={(event) => setNewReply(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && newReply.trim()) {
                                handleAddReply(comment.id)
                              }
                              if (event.key === 'Escape') {
                                setReplyTo(null)
                                setNewReply('')
                              }
                            }}
                            className="h-8 flex-1"
                            autoFocus
                          />
                          {newReply.trim() && (
                            <Button size="sm" className="h-8" onClick={() => handleAddReply(comment.id)}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setReplyTo(null)
                              setNewReply('')
                            }}
                            aria-label="Cancel reply"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[425px] rounded-xl bg-background sm:rounded-2xl">
          <DialogTitle>Share</DialogTitle>
          <DialogDescription className="sr-only">Share this short</DialogDescription>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-muted/50"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href)
                  toast.success("Link copied!")
                } catch (err) {
                  toast.error("Failed to copy", "Could not copy link to clipboard")
                }
              }}
            >
              <Copy className="mb-2 h-6 w-6" />
              <span className="text-xs">Copy link</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-green-50 hover:text-green-600"
              onClick={() => {
                const text = `Check out this video: ${window.location.href}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="text-xs">WhatsApp</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-blue-50 hover:text-blue-600"
              onClick={() => {
                const text = `Check out this video: ${window.location.href}`
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
              </svg>
              <span className="text-xs">Twitter</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-blue-50 hover:text-blue-700"
              onClick={() => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-xs">Facebook</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-orange-50 hover:text-orange-600"
              onClick={() => {
                window.open(`https://reddit.com/submit?url=${encodeURIComponent(window.location.href)}`, '_blank')
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
              <span className="text-xs">Reddit</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-blue-50 hover:text-blue-800"
              onClick={() => {
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-xs">LinkedIn</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-blue-50 hover:text-blue-500"
              onClick={() => {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`, '_blank')
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <span className="text-xs">Telegram</span>
            </Button>

            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-gray-50 hover:text-gray-700"
              onClick={() => {
                const subject = 'Check out this video'
                const body = `I thought you'd like this video: ${window.location.href}`
                window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
              }}
            >
              <svg className="mb-2 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span className="text-xs">Email</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl sm:rounded-2xl">
          <DialogTitle>Search Shorts</DialogTitle>
          <DialogDescription className="sr-only">
            Search for shorts on Lootube
          </DialogDescription>
          <div className="flex w-full items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search shorts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border/80 bg-background/80 px-4 py-2 pr-10 text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-0 dark:border-white/20 dark:bg-background/60"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-4 text-sm text-muted-foreground">
              Search results for "{searchQuery}" would appear here...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Playlist Selection Modal */}
      <Dialog open={showPlaylistModal} onOpenChange={(open) => {
        if (!open) {
          setShowPlaylistModal(false)
          setSelectedPlaylistId('')
          setNewPlaylistName('')
          setIsCreatingPlaylist(false)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Save to Playlist</DialogTitle>
          <DialogDescription>
            Select an existing playlist or create a new one
          </DialogDescription>
          <div className="space-y-4 py-4">
            {!isCreatingPlaylist ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Playlist</label>
                  <select
                    value={selectedPlaylistId}
                    onChange={(e) => setSelectedPlaylistId(e.target.value)}
                    className="w-full rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Choose a playlist...</option>
                    {playlists.map((playlist) => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.title} ({playlist.videoIds.length} {playlist.videoIds.length === 1 ? 'video' : 'videos'})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => setIsCreatingPlaylist(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Playlist
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Playlist Name</label>
                  <Input
                    placeholder="Enter playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="mt-2 rounded-full"
                  />
                </div>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setIsCreatingPlaylist(false)
                    setNewPlaylistName('')
                  }}
                >
                  Back to Playlists
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => {
                setShowPlaylistModal(false)
                setSelectedPlaylistId('')
                setNewPlaylistName('')
                setIsCreatingPlaylist(false)
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={handlePlaylistSelect}
              disabled={!isCreatingPlaylist && !selectedPlaylistId}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface InteractionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}

function InteractionButton({ icon, label, onClick, active }: InteractionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center space-y-1 text-white"
    >
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-black/50 transition hover:bg-black/70',
          active && 'bg-white/25'
        )}
      >
        {icon}
      </span>
      <span className="text-xs text-white/80">{label}</span>
    </button>
  )
}
