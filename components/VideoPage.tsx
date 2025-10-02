"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RelatedVideo, Video } from '@/types'
import { Button } from "@/components/ui/button"
import { formatTimeAgo, formatViewCount } from '@/lib/format'
import { Heart, HeartCrack, Share2, MoreHorizontal, ChevronDown, ChevronUp, Check, Sparkles, ListPlus, Flag, Clock, Copy, Send, X, CornerDownRight, ListFilter, Trash2 } from 'lucide-react'
import { RelatedVideoCard } from '@/components/RelatedVideoCard'
import { DEFAULT_CHANNEL } from '@/lib/upload-constants'
import { getVideoReaction, isChannelSubscribed, setVideoReaction, toggleChannelSubscription } from '@/lib/client-interactions'
import { incrementVideoView, incrementVideoLike, decrementVideoLike, incrementVideoDislike, decrementVideoDislike, incrementVideoComment, decrementVideoComment, isLocalContent } from '@/lib/metrics'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PlaceholderImage } from '@/components/PlaceholderImage'
import { getCurrentUser, type User } from '@/lib/userAuth'
import { useToast } from '@/hooks/useToast'
import { UserAvatarModal } from '@/components/UserAvatarModal'
import { trackView, trackLike, trackComment, trackSubscribe } from '@/lib/userInteractions'

type LocalReply = {
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

type LocalComment = {
  id: string
  author: string
  authorAvatar: string
  authorHandle?: string
  authorId?: string
  authorJoinedAt?: string
  text: string
  timestamp: string
  likes: number
  replies: LocalReply[]
}

type ReplyTarget = {
  type: 'local' | 'remote'
  commentId: string
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

const buildAuthorSnapshot = (user: User | null, fallbackAvatar: string) => {
  const resolvedHandle = ensureHandleWithAt(user?.channelHandle)
    ?? ensureHandleWithAt(user?.channelName)
    ?? ensureHandleWithAt(user?.id)
    ?? '@channel'
  const resolvedAvatar = user?.avatar && user.avatar.trim().length > 0 ? user.avatar : fallbackAvatar
  const resolvedJoinedAt = isoStringOrUndefined(user?.createdAt) ?? new Date().toISOString()

  return {
    author: user?.channelName ?? 'You',
    authorAvatar: resolvedAvatar,
    authorHandle: resolvedHandle,
    authorId: user?.id,
    authorJoinedAt: resolvedJoinedAt,
  }
}

const toLocalReply = (raw: any, activeUser: User | null, fallbackAvatar: string): LocalReply => {
  const isActiveUser = matchesUserEntity(raw, activeUser)
  const snapshot = isActiveUser ? buildAuthorSnapshot(activeUser, fallbackAvatar) : null
  const resolvedHandle = ensureHandleWithAt(raw?.authorHandle ?? raw?.handle ?? raw?.channelHandle ?? raw?.author)
    ?? snapshot?.authorHandle
    ?? '@channel'
  const resolvedAvatar = typeof raw?.authorAvatar === 'string' && raw.authorAvatar.trim().length > 0
    ? raw.authorAvatar
    : snapshot?.authorAvatar ?? fallbackAvatar
  const resolvedJoinedAt = isoStringOrUndefined(raw?.authorJoinedAt ?? (isActiveUser ? activeUser?.createdAt : undefined))
  const resolvedAuthorName = typeof raw?.author === 'string' && raw.author.trim().length > 0
    ? raw.author.replace(/^@/, '')
    : snapshot?.author ?? 'Viewer'

  return {
    id: String(raw?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    author: resolvedAuthorName,
    authorAvatar: resolvedAvatar || fallbackAvatar || '/placeholder.svg',
    authorHandle: resolvedHandle,
    authorId: typeof raw?.authorId === 'string' ? raw.authorId : snapshot?.authorId,
    authorJoinedAt: resolvedJoinedAt,
    text: typeof raw?.text === 'string' ? raw.text : '',
    timestamp: isoStringOrUndefined(raw?.timestamp) ?? new Date().toISOString(),
    likes: Number.isFinite(raw?.likes) ? raw.likes : 0,
  }
}

const toLocalComment = (raw: any, activeUser: User | null, fallbackAvatar: string): LocalComment => {
  const isActiveUser = matchesUserEntity(raw, activeUser)
  const snapshot = isActiveUser ? buildAuthorSnapshot(activeUser, fallbackAvatar) : null
  const resolvedHandle = ensureHandleWithAt(raw?.authorHandle ?? raw?.handle ?? raw?.channelHandle ?? raw?.author)
    ?? snapshot?.authorHandle
    ?? '@channel'
  const resolvedAvatar = typeof raw?.authorAvatar === 'string' && raw.authorAvatar.trim().length > 0
    ? raw.authorAvatar
    : snapshot?.authorAvatar ?? fallbackAvatar
  const resolvedJoinedAt = isoStringOrUndefined(raw?.authorJoinedAt ?? (isActiveUser ? activeUser?.createdAt : undefined))
  const resolvedAuthorName = typeof raw?.author === 'string' && raw.author.trim().length > 0
    ? raw.author.replace(/^@/, '')
    : snapshot?.author ?? 'Viewer'

  const replies = Array.isArray(raw?.replies)
    ? raw.replies.map((reply: any) => toLocalReply(reply, activeUser, fallbackAvatar))
    : []

  return {
    id: String(raw?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    author: resolvedAuthorName,
    authorAvatar: resolvedAvatar || fallbackAvatar || '/placeholder.svg',
    authorHandle: resolvedHandle,
    authorId: typeof raw?.authorId === 'string' ? raw.authorId : snapshot?.authorId,
    authorJoinedAt: resolvedJoinedAt,
    text: typeof raw?.text === 'string' ? raw.text : '',
    timestamp: isoStringOrUndefined(raw?.timestamp) ?? new Date().toISOString(),
    likes: Number.isFinite(raw?.likes) ? raw.likes : 0,
    replies,
  }
}

interface VideoPageProps {
  video: Video
}

export function VideoPage({ video }: VideoPageProps) {
  const { toast } = useToast()
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [baseSubscriberCount, setBaseSubscriberCount] = useState(() => {
    const raw = video.channel?.statistics.subscriberCount ?? '0'
    const parsed = Number(String(raw).replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  })
  const [subscriberCount, setSubscriberCount] = useState(baseSubscriberCount)
  const [showSparkle, setShowSparkle] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [comments, setComments] = useState<LocalComment[]>([])
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({})
  const [remoteReplies, setRemoteReplies] = useState<Record<string, LocalReply[]>>({})
  const [newComment, setNewComment] = useState('')
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null)
  const [newReply, setNewReply] = useState('')
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser> | null>(null)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [playlists, setPlaylists] = useState<Array<{ id: string; title: string; videoIds: string[] }>>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const remoteCommentThreads = Array.isArray((video as any)?.comments) ? (video as any).comments : []
  const fetchedCommentThreads = remoteCommentThreads.length
  const statsCommentCountRaw = Number(video.statistics.commentCount || 0)
  const baseCommentCount = Number.isFinite(statsCommentCountRaw) && statsCommentCountRaw > 0 ? statsCommentCountRaw : fetchedCommentThreads
  const totalCommentCount = baseCommentCount + comments.length
  const totalCommentCountDisplay = formatViewCount(String(totalCommentCount))
  const isLocalVideo = Boolean((video as any).isLocal)
  const localFilePath = isLocalVideo ? (video as any).filePath : undefined
  const channelId = video.snippet.channelId
  const isOwnChannel = channelId === DEFAULT_CHANNEL.id
  const defaultChannelAvatar = video.channel?.thumbnails?.default?.url || '/placeholder.svg'

  const formatCommentTimestamp = (value: string) => {
    const parsed = Date.parse(value)
    if (Number.isNaN(parsed)) {
      return value
    }
    return formatTimeAgo(new Date(parsed).toISOString())
  }

  const renderLocalReply = (
    comment: LocalComment,
    commentHandle: string | undefined,
    commentPath: string
  ) => (reply: LocalReply) => {
    const replyHandle = reply.authorHandle ?? ensureHandleWithAt(reply.author)
    const replyPath = replyHandle ? `/@${replyHandle.replace(/^@+/, '')}` : commentPath
    const replyIsCurrentUser = matchesUserEntity(reply, currentUser)
    const replyJoinedAt = reply.authorJoinedAt
      ?? (replyIsCurrentUser ? isoStringOrUndefined(currentUser?.createdAt) : undefined)
      ?? isoStringOrUndefined(reply.timestamp)

    return (
      <div key={reply.id} className="flex space-x-2">
        <CornerDownRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex space-x-2 flex-1">
          <div className="flex-shrink-0">
            <UserAvatarModal
              userInfo={{
                channelName: reply.author,
                channelHandle: replyHandle ?? commentHandle ?? '@channel',
                avatar: reply.authorAvatar,
                joinedAt: replyJoinedAt ?? new Date().toISOString(),
                subscribers: 0,
                isCurrentUser: replyIsCurrentUser,
              }}
            >
              <img
                src={reply.authorAvatar}
                alt={reply.author}
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg'
                }}
              />
            </UserAvatarModal>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href={replyPath}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {reply.author}
                </Link>
                <p className="text-xs text-muted-foreground">{formatCommentTimestamp(reply.timestamp)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const updatedComments = comments.map((c) =>
                    c.id === comment.id
                      ? {
                          ...c,
                          replies: c.replies.filter((r) => r.id !== reply.id),
                        }
                      : c
                  )
                  setComments(updatedComments)
                  const updatedLikes = { ...commentLikes }
                  delete updatedLikes[reply.id]
                  setCommentLikes(updatedLikes)

                  try {
                    localStorage.setItem(`comments_${video.id}`, JSON.stringify(updatedComments))
                    localStorage.setItem(`comment_likes_${video.id}`, JSON.stringify(updatedLikes))
                  } catch (err) {
                    toast.error('Failed to delete', 'Could not delete reply')
                  }
                }}
                aria-label="Delete reply"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm">{reply.text}</p>
            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 ${commentLikes[reply.id] ? 'text-rose-500' : ''}`}
                onClick={() => {
                  const newLikes = { ...commentLikes }
                  const isLiked = !newLikes[reply.id]
                  newLikes[reply.id] = isLiked
                  setCommentLikes(newLikes)

                  const updatedComments = comments.map((c) =>
                    c.id === comment.id
                      ? {
                          ...c,
                          replies: c.replies.map((r) =>
                            r.id === reply.id
                              ? { ...r, likes: Math.max(0, r.likes + (isLiked ? 1 : -1)) }
                              : r
                          ),
                        }
                      : c
                  )
                  setComments(updatedComments)

                  try {
                    localStorage.setItem(`comment_likes_${video.id}`, JSON.stringify(newLikes))
                    localStorage.setItem(`comments_${video.id}`, JSON.stringify(updatedComments))
                  } catch (err) {
                    toast.error('Failed to save', 'Could not save like status')
                  }
                }}
              >
                <Heart className={`mr-1 h-3 w-3 ${commentLikes[reply.id] ? 'fill-current' : ''}`} />
                {reply.likes}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const raw = video.channel?.statistics.subscriberCount ?? '0'
    const parsed = Number(String(raw).replace(/,/g, ''))
    const safeBase = Number.isFinite(parsed) ? parsed : 0
    setBaseSubscriberCount(safeBase)
    const subscribed = isChannelSubscribed(channelId)
    setIsSubscribed(subscribed)
    setSubscriberCount(safeBase + (subscribed ? 1 : 0))
    setShowSparkle(false)
  }, [channelId, video.channel?.statistics.subscriberCount])

  // Function to refresh user data in comments
  const refreshUserDataInComments = useCallback((user: User | null, previous?: User | null) => {
    if (!user) return

    const candidates = [user]
    if (previous && previous.id !== user.id) {
      candidates.push(previous)
    }

  const matchesAny = (entity: any) => {
    return candidates.some((candidate) => matchesUserEntity(entity, candidate))
  }

    try {
      const rawComments = JSON.parse(localStorage.getItem(`comments_${video.id}`) || '[]')
      let updated = false
      const authorSnapshot = buildAuthorSnapshot(user, defaultChannelAvatar)

      const updatedComments = rawComments.map((comment: any) => {
        const commentMatches = matchesAny(comment)
        let repliesUpdated = false
        const transformedReplies = Array.isArray(comment?.replies)
          ? comment.replies.map((reply: any) => {
              if (matchesAny(reply)) {
                repliesUpdated = true
                return {
                  ...reply,
                  ...authorSnapshot,
                }
              }
              return reply
            })
          : comment?.replies

        if (commentMatches) {
          updated = true
          return {
            ...comment,
            ...authorSnapshot,
            replies: Array.isArray(transformedReplies) ? transformedReplies : [],
          }
        }

        if (repliesUpdated) {
          updated = true
          return {
            ...comment,
            replies: transformedReplies,
          }
        }

        return comment
      })

      if (updated) {
        localStorage.setItem(`comments_${video.id}`, JSON.stringify(updatedComments))
        setComments(updatedComments.map((comment: any) => toLocalComment(comment, user, defaultChannelAvatar)))
      }
    } catch (error) {
      console.warn('Error refreshing user data in comments:', error)
    }

    try {
      const storedThreadReplies = JSON.parse(
        localStorage.getItem(`comment_thread_replies_${video.id}`) || '{}'
      )

      if (storedThreadReplies && typeof storedThreadReplies === 'object') {
        let threadUpdated = false
        const nextThreads: Record<string, any[]> = {}

        Object.entries(storedThreadReplies).forEach(([commentId, replies]) => {
          if (!Array.isArray(replies)) {
            nextThreads[commentId] = replies as any[]
            return
          }

          let localUpdated = false
          const mapped = replies.map((reply: any) => {
            if (matchesAny(reply)) {
              localUpdated = true
              return {
                ...reply,
                ...buildAuthorSnapshot(user, defaultChannelAvatar),
              }
            }
            return reply
          })

          if (localUpdated) {
            threadUpdated = true
          }

          nextThreads[commentId] = mapped
        })

        if (threadUpdated) {
          localStorage.setItem(
            `comment_thread_replies_${video.id}`,
            JSON.stringify(nextThreads)
          )

          const normalized: Record<string, LocalReply[]> = {}
         Object.entries(nextThreads).forEach(([commentId, replies]) => {
            if (Array.isArray(replies)) {
              normalized[commentId] = replies.map((reply: any) => toLocalReply(reply, user, defaultChannelAvatar))
            }
          })

          setRemoteReplies((prev) => ({ ...prev, ...normalized }))
        }
      }
    } catch (error) {
      console.warn('Error refreshing user data in replies:', error)
    }
  }, [defaultChannelAvatar, video.id]);

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)

    // Refresh user data in existing comments
    refreshUserDataInComments(user)

    try {
      const rawComments = JSON.parse(localStorage.getItem(`comments_${video.id}`) || '[]')
      let needsUpdate = false
      const normalizedComments: LocalComment[] = Array.isArray(rawComments)
        ? rawComments.map((comment: any) => {
            const normalized = toLocalComment(comment, user, defaultChannelAvatar)
            if (!needsUpdate) {
              const originalHandle = ensureHandleWithAt(comment?.authorHandle ?? comment?.author)
              if (
                normalized.author !== (comment?.author?.replace(/^@/, '') ?? 'You') ||
                normalized.authorAvatar !== (comment?.authorAvatar || comment?.avatar || user?.avatar || defaultChannelAvatar) ||
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

      if (needsUpdate) {
        localStorage.setItem(`comments_${video.id}`, JSON.stringify(normalizedComments))
      }
    } catch (error) {
      console.warn('Failed to load saved comments', error)
      setComments([])
    }

    try {
      const storedThreadReplies = JSON.parse(
        localStorage.getItem(`comment_thread_replies_${video.id}`) || '{}'
      )

      if (storedThreadReplies && typeof storedThreadReplies === 'object') {
        let needsUpdate = false
        const normalized: Record<string, LocalReply[]> = {}

        Object.entries(storedThreadReplies).forEach(([commentId, replies]) => {
          if (!Array.isArray(replies)) {
            return
          }
          const mapped = replies.map((reply: any) => {
            const normalizedReply = toLocalReply(reply, user, defaultChannelAvatar)
            if (!needsUpdate) {
              const originalHandle = ensureHandleWithAt(reply?.authorHandle ?? reply?.author)
              const normalizedAuthor = reply?.author?.replace(/^@/, '') ?? 'You'
              if (
                normalizedReply.author !== normalizedAuthor ||
                normalizedReply.authorAvatar !== (reply?.authorAvatar || reply?.avatar || user?.avatar || defaultChannelAvatar) ||
                normalizedReply.authorHandle !== (originalHandle ?? reply?.authorHandle)
              ) {
                needsUpdate = true
              }
            }
            return normalizedReply
          })
          normalized[commentId] = mapped
        })

        setRemoteReplies(normalized)

        if (needsUpdate) {
          const serializable: Record<string, LocalReply[]> = {}
          Object.entries(normalized).forEach(([key, replies]) => {
            serializable[key] = replies
          })
          localStorage.setItem(
            `comment_thread_replies_${video.id}`,
            JSON.stringify(serializable)
          )
        }
      } else {
        setRemoteReplies({})
      }
    } catch (error) {
      console.warn('Failed to load saved thread replies', error)
      setRemoteReplies({})
    }

    try {
      const savedLikes = JSON.parse(localStorage.getItem(`comment_likes_${video.id}`) || '{}')
      setCommentLikes(savedLikes && typeof savedLikes === 'object' ? savedLikes : {})
    } catch (error) {
      console.warn('Failed to load comment likes', error)
      setCommentLikes({})
    }
  }, [video.id])


  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: User | null; previousUser: User | null }>
      const detail = customEvent.detail
      const updated = detail?.user ?? getCurrentUser()
      setCurrentUser(updated)
      refreshUserDataInComments(updated, detail?.previousUser ?? null)
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return
      if (event.key === 'lootube_current_user' || event.key === 'lootube_users') {
        const updated = getCurrentUser()
        setCurrentUser(updated)
        refreshUserDataInComments(updated)
      }
    }

    window.addEventListener('lootube:user-updated', handleUserUpdated as EventListener)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('lootube:user-updated', handleUserUpdated as EventListener)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    refreshUserDataInComments(currentUser)
  }, [currentUser, refreshUserDataInComments])

  const baseLikeCount = useMemo(() => Number(video.statistics.likeCount || 0), [video.statistics.likeCount])
  const likeCountDisplay = formatViewCount(String(baseLikeCount + (liked ? 1 : 0)))

  useEffect(() => {
    const reaction = getVideoReaction(video.id)
    setLiked(reaction.liked)
    setDisliked(reaction.disliked)

    // Track video view for local content (only once per session, not for author's own content)
    if (isLocalContent(video.id)) {
      const currentUser = getCurrentUser()
      const isOwnContent = currentUser && video.ownerId === currentUser.id

      if (!isOwnContent) {
        const viewKey = `video_viewed_${video.id}`
        const hasViewed = sessionStorage.getItem(viewKey)

        if (!hasViewed) {
          sessionStorage.setItem(viewKey, 'true')
          incrementVideoView(video.id).catch((error) => {
            console.error('Failed to track video view:', error)
          })

          // Track view for personalization (all videos)
          const currentUser = getCurrentUser()
          trackView(video.id, {
            channelId: video.snippet.channelId,
            category: (video as any).category,
            tags: (video as any).tags,
          }, currentUser?.id)
        }
      }
    }
  }, [video.id])

  const handleLike = async () => {
    const wasLiked = liked
    const wasDisliked = disliked
    const nextLiked = !liked
    const nextDisliked = false

    // Update UI immediately for better UX
    setLiked(nextLiked)
    setDisliked(nextDisliked)
    setVideoReaction(video.id, { liked: nextLiked, disliked: nextDisliked })

    // Track like for personalization (all videos)
    if (nextLiked && !wasLiked) {
      const currentUser = getCurrentUser()
      trackLike(video.id, {
        channelId: video.snippet.channelId,
        category: (video as any).category,
        tags: (video as any).tags,
      }, currentUser?.id)
    }

    // Update server metrics for local content only
    if (isLocalContent(video.id)) {
      if (nextLiked && !wasLiked) {
        await incrementVideoLike(video.id)
      } else if (!nextLiked && wasLiked) {
        await decrementVideoLike(video.id)
      }

      // If was disliked before, decrement dislike
      if (wasDisliked) {
        await decrementVideoDislike(video.id)
      }
    }
  }

  const handleDislike = async () => {
    const wasLiked = liked
    const wasDisliked = disliked
    const nextDisliked = !disliked
    const nextLiked = false

    // Update UI immediately for better UX
    setDisliked(nextDisliked)
    setLiked(nextLiked)
    setVideoReaction(video.id, { liked: nextLiked, disliked: nextDisliked })

    // Update server metrics for local content
    if (isLocalContent(video.id)) {
      if (nextDisliked && !wasDisliked) {
        await incrementVideoDislike(video.id)
      } else if (!nextDisliked && wasDisliked) {
        await decrementVideoDislike(video.id)
      }

      // If was liked before, decrement like
      if (wasLiked) {
        await decrementVideoLike(video.id)
      }
    }
  }

  const handleSubscribe = () => {
    if (!channelId) return
    if (isOwnChannel) {
      toast.info('You cannot subscribe to your own channel, but viewers can!')
      return
    }
    const channelName = video.snippet.channelTitle || 'Unknown Channel'
    const channelHandle = video.channel?.handle || `@${video.snippet.channelTitle?.replace(/\s+/g, '') || 'channel'}`
    const next = toggleChannelSubscription(channelId, channelName, channelHandle)
    setIsSubscribed(next)
    setSubscriberCount(baseSubscriberCount + (next ? 1 : 0))
    setShowSparkle(next)

    if (next) {
      toast.success('Subscribed!')
    }
  }

  useEffect(() => {
    if (!showSparkle) return
    const timer = setTimeout(() => setShowSparkle(false), 1200)
    return () => clearTimeout(timer)
  }, [showSparkle])

  const handleSaveToPlaylist = async () => {
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
      setShowPlaylistModal(true)
    } catch (error) {
      console.error('Error fetching playlists:', error)
      toast.error('Failed to load playlists')
    }
  }

  const handlePlaylistSelect = async () => {
    if (!currentUser) return

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
            videoIds: [video.id]
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
            videoIds: [video.id]
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

      // Close the more menu
      setShowMoreMenu(false)
    } catch (error) {
      console.error('Error saving to playlist:', error)
      toast.error('Failed to save to playlist')
    }
  }

  const handleWatchLater = async () => {
    const user = getCurrentUser()
    if (!user) {
      toast.error('Please sign in to save to Watch Later')
      return
    }

    try {
      const response = await fetch(`/api/playlists?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch playlists')
      }

      const playlists = await response.json()

      let watchLaterPlaylist = playlists.find((p: any) => p.title === 'Watch Later')

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

      const addResponse = await fetch(`/api/playlists/${watchLaterPlaylist.id}/add-videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          videoIds: [video.id]
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

  const handleReport = () => {
    // Show toast for report (in real app, this would send to server)
    toast.success('Report submitted. Thank you for helping keep Lootube safe!')
  }

  const handleShare = () => {
    setShowShare(true)
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return

    const timestamp = new Date().toISOString()
    const authorSnapshot = buildAuthorSnapshot(currentUser, defaultChannelAvatar)
    const comment: LocalComment = {
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
    setReplyTarget(null)

    // Track comment for personalization (all videos)
    trackComment(video.id, {
      channelId: video.snippet.channelId,
      category: (video as any).category,
      tags: (video as any).tags,
    }, currentUser.id)

    // Save to localStorage immediately
    try {
      localStorage.setItem(`comments_${video.id}`, JSON.stringify(newComments))
    } catch (err) {
      toast.error("Failed to save comment", "Your comment couldn't be saved")
    }
  }

  const handleAddReply = () => {
    if (!newReply.trim() || !currentUser || !replyTarget) return

    const timestamp = new Date().toISOString()
    const authorSnapshot = buildAuthorSnapshot(currentUser, defaultChannelAvatar)
    const reply: LocalReply = {
      id: Date.now().toString(),
      ...authorSnapshot,
      text: newReply.trim(),
      timestamp,
      likes: 0,
    }

    if (replyTarget.type === 'local') {
      const updatedComments = comments.map((comment) =>
        comment.id === replyTarget.commentId
          ? { ...comment, replies: [...comment.replies, reply] }
          : comment
      )

      setComments(updatedComments)

      try {
        localStorage.setItem(`comments_${video.id}`, JSON.stringify(updatedComments))
      } catch (err) {
        toast.error('Failed to save reply', "Your reply couldn't be saved")
      }
    } else {
      const commentId = replyTarget.commentId

      setRemoteReplies((prev) => {
        const existing = prev[commentId] ?? []
        const thread = [...existing, reply]
        const next = { ...prev, [commentId]: thread }

        try {
          localStorage.setItem(
            `comment_thread_replies_${video.id}`,
            JSON.stringify(next)
          )
        } catch (err) {
          toast.error('Failed to save reply', "Your reply couldn't be saved")
        }

        return next
      })
    }

    setNewReply('')
    setReplyTarget(null)
  }

  const fallbackRelatedVideos: RelatedVideo[] = [
    {
      id: `${video.id}-related-1`,
      title: 'How Lootube Works: Product Walkthrough',
      thumbnail: '/placeholder.svg',
      channelTitle: 'Lootube Creators',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      viewCount: '28432',
      duration: 'PT12M5S',
    },
    {
      id: `${video.id}-related-2`,
      title: 'Growing Your Channel: Tips & Tricks',
      thumbnail: '/placeholder.svg',
      channelTitle: 'Creator Academy',
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      viewCount: '615204',
      duration: 'PT8M42S',
    },
    {
      id: `${video.id}-related-3`,
      title: 'Behind the Scenes of Lootube Shorts',
      thumbnail: '/placeholder.svg',
      channelTitle: 'Lootube Studio',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      viewCount: '98214',
      duration: 'PT4M13S',
    },
    {
      id: `${video.id}-related-4`,
      title: 'Designing the Ultimate Video Dashboard',
      thumbnail: '/placeholder.svg',
      channelTitle: 'UI Lab',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: '475821',
      duration: 'PT16M9S',
    },
    {
      id: `${video.id}-related-5`,
      title: 'Monetization 101 for New Creators',
      thumbnail: '/placeholder.svg',
      channelTitle: 'Stream School',
      publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: '152384',
      duration: 'PT9M1S',
    },
  ]
  const relatedVideos =
    video.relatedVideos && video.relatedVideos.length > 0
      ? video.relatedVideos
      : fallbackRelatedVideos

  return (
    <div className="mt-6 w-full px-4 pb-12 sm:px-6">
      <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-6">
        <section className="space-y-6">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
            {isLocalVideo && localFilePath ? (
              <video
                controls
                className="h-full w-full object-contain"
                src={localFilePath}
              />
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/${video.id}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            )}
          </div>

          <h1 className="text-2xl font-semibold">{video.snippet.title}</h1>

          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm dark:border-white/15 dark:bg-background/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Link
                    href={`/@${(video.channel?.title ?? video.snippet.channelTitle).toLowerCase().replace(/[^a-z0-9]/g, '')}`}
                    className="flex items-center gap-4 transition-opacity hover:opacity-90"
                >
                  <img
                    src={video.channel?.thumbnails.default.url ?? '/placeholder.svg'}
                    alt={video.channel?.title ?? video.snippet.channelTitle}
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <h2 className="font-medium">{video.channel?.title ?? video.snippet.channelTitle}</h2>
                    <p className="text-sm text-muted-foreground">
                      {formatViewCount(String(subscriberCount))} subscribers
                    </p>
                  </div>
                </Link>
                <div className="relative flex flex-col items-start gap-1">
                  <Button
                    variant={isSubscribed ? 'outline' : 'default'}
                    className="h-auto rounded-full px-6 py-2"
                    onClick={handleSubscribe}
                    disabled={isOwnChannel}
                  >
                    {isOwnChannel ? 'Your channel' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </Button>
                  {showSparkle && !isOwnChannel && (
                    <Sparkles className="absolute -right-4 -top-3 h-5 w-5 text-primary animate-pulse" />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`group h-auto rounded-full px-5 py-2 transition-transform ${liked ? 'bg-rose-500/10 text-rose-500' : ''}`}
                >
                  <Heart
                    className={`mr-2 h-5 w-5 transition-transform duration-300 ${liked ? 'scale-110 fill-current text-rose-500' : 'text-foreground'}`}
                  />
                  {likeCountDisplay}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDislike}
                  className={`group h-auto rounded-full px-4 py-2 transition-transform ${disliked ? 'bg-destructive/10 text-destructive' : ''}`}
                >
                  <HeartCrack
                    className={`h-5 w-5 transition-transform duration-300 ${disliked ? 'scale-110 fill-current text-destructive' : 'text-foreground'}`}
                  />
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="h-auto rounded-full px-6 py-2"
                  onClick={handleShare}
                >
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                  {copied ? 'Copied!' : 'Share'}
                </Button>

                <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); handleSaveToPlaylist(); }}>
                      <ListPlus className="h-4 w-4" /> Save to playlist
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onSelect={(event) => { event.preventDefault(); handleWatchLater(); }}>
                      <Clock className="h-4 w-4" /> Watch later
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={(event) => { event.preventDefault(); handleReport(); }}>
                      <Flag className="h-4 w-4" /> Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-secondary p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium">{formatViewCount(video.statistics.viewCount)} views</span>
              <span>•</span>
              <span>{formatTimeAgo(video.snippet.publishedAt)}</span>
            </div>

            <div className={`whitespace-pre-wrap ${!isDescriptionExpanded && 'line-clamp-3'}`}>
              {video.snippet.description}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2"
            >
              {isDescriptionExpanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show more
                </>
              )}
            </Button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{totalCommentCountDisplay} Comments</h3>
              <Button variant="ghost" size="sm" className="gap-2 rounded-full hover:bg-muted">
                <ListFilter className="h-4 w-4" />
                Sort by
              </Button>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full">
                <img
                  src={currentUser?.avatar || '/placeholder.svg'}
                  alt={currentUser?.channelName || 'User'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg'
                  }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 pb-2">
                  <Input
                    placeholder="Add a comment"
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newComment.trim()) {
                        handleAddComment()
                      }
                    }}
                    className="flex-1 rounded-none border-0 border-b border-border bg-transparent px-0 pb-2 shadow-none transition focus-visible:border-primary focus-visible:shadow-[0_2px_0_hsl(var(--primary))] focus-visible:ring-0"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || !currentUser}
                    className="rounded-full"
                  >
                    Comment
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {comments.length > 0 && (
                <div className="space-y-4">
                  {comments.map((comment) => {
                    const commentHandle = comment.authorHandle ?? ensureHandleWithAt(comment.author)
                    const commentPath = commentHandle ? `/@${commentHandle.replace(/^@+/, '')}` : '/'
                    const commentIsCurrentUser = matchesUserEntity(comment, currentUser)
                    const commentJoinedAt = comment.authorJoinedAt
                      ?? (commentIsCurrentUser ? isoStringOrUndefined(currentUser?.createdAt) : undefined)
                      ?? isoStringOrUndefined(comment.timestamp)
                    const renderReply = renderLocalReply(comment, commentHandle, commentPath)

                    return (
                      <div key={comment.id} className="space-y-2 rounded-2xl bg-secondary/30 p-4">
                        <div className="flex space-x-2">
                          <div className="flex-shrink-0">
                            <UserAvatarModal
                              userInfo={{
                                channelName: comment.author,
                                channelHandle: commentHandle ?? '@channel',
                                avatar: comment.authorAvatar,
                                joinedAt: commentJoinedAt ?? new Date().toISOString(),
                                subscribers: 0,
                                isCurrentUser: commentIsCurrentUser,
                              }}
                            >
                              <img
                                src={comment.authorAvatar}
                                alt={comment.author}
                                className="h-8 w-8 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg'
                                }}
                              />
                            </UserAvatarModal>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={commentPath}
                                  className="text-sm font-medium hover:text-primary transition-colors"
                                >
                                  {comment.author}
                                </Link>
                                <p className="text-xs text-muted-foreground">{formatCommentTimestamp(comment.timestamp)}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const updatedList = comments.filter((item) => item.id !== comment.id)
                                  const updatedLikes = { ...commentLikes }
                                  delete updatedLikes[comment.id]
                                  comment.replies.forEach((reply) => {
                                    delete updatedLikes[reply.id]
                                  })

                                  setComments(updatedList)
                                  setCommentLikes(updatedLikes)

                                  try {
                                    localStorage.setItem(`comments_${video.id}`, JSON.stringify(updatedList))
                                    localStorage.setItem(`comment_likes_${video.id}`, JSON.stringify(updatedLikes))
                                  } catch (err) {
                                    toast.error('Failed to delete', 'Your comment could not be removed')
                                  }
                                }}
                                aria-label="Delete comment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm">{comment.text}</p>
                            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 px-2 ${commentLikes[comment.id] ? 'text-rose-500' : ''}`}
                                onClick={() => {
                                  const newLikes = { ...commentLikes }
                                  const isLiked = !newLikes[comment.id]
                                  newLikes[comment.id] = isLiked
                                  setCommentLikes(newLikes)

                                  const updatedComments = comments.map((c) =>
                                    c.id === comment.id
                                      ? { ...c, likes: Math.max(0, c.likes + (isLiked ? 1 : -1)) }
                                      : c
                                  )
                                  setComments(updatedComments)

                                  try {
                                    localStorage.setItem(`comment_likes_${video.id}`, JSON.stringify(newLikes))
                                    localStorage.setItem(`comments_${video.id}`, JSON.stringify(updatedComments))
                                  } catch (err) {
                                    toast.error('Failed to save', 'Could not save like status')
                                  }
                                }}
                              >
                                <Heart className={`mr-1 h-4 w-4 ${commentLikes[comment.id] ? 'fill-current' : ''}`} />
                                {comment.likes}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => {
                                  if (replyTarget?.type === 'local' && replyTarget.commentId === comment.id) {
                                    setReplyTarget(null)
                                    setNewReply('')
                                  } else {
                                    setReplyTarget({ type: 'local', commentId: comment.id })
                                    setNewReply('')
                                  }
                                }}
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        </div>

                        {comment.replies.length > 0 && (
                          <div className="ml-10 space-y-2">
                            {comment.replies.map(renderReply)}
                          </div>
                        )}

                        {replyTarget?.type === 'local' && replyTarget.commentId === comment.id && currentUser && (
                          <div className="ml-10 mt-2 flex items-center gap-2">
                            <div className="h-6 w-6 overflow-hidden rounded-full">
                              <img
                                src={currentUser.avatar || '/placeholder.svg'}
                                alt={currentUser.channelName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg'
                                }}
                              />
                            </div>
                            <Input
                              placeholder={`Reply to ${comment.author}...`}
                              value={newReply}
                              onChange={(e) => setNewReply(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newReply.trim()) {
                                  handleAddReply()
                                }
                                if (e.key === 'Escape') {
                                  setReplyTarget(null)
                                  setNewReply('')
                                }
                              }}
                              className="h-8 flex-1"
                              autoFocus
                            />
                            {newReply.trim() && (
                              <Button size="sm" className="h-8" onClick={handleAddReply}>
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => {
                                setReplyTarget(null)
                                setNewReply('')
                              }}
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

              {remoteCommentThreads.length > 0 ? (
                <div className="space-y-4">
                  {remoteCommentThreads.map((comment: any) => {
                    const threadReplies = Array.isArray(comment.replies) ? comment.replies : []
                    const storedLocalReplies = remoteReplies[comment.id] ?? []
                    const normalizedRemoteReplies = threadReplies.map((reply: any) => ({
                      id: reply.id,
                      author: reply.authorDisplayName ?? 'Viewer',
                      avatar: reply.authorProfileImageUrl ?? '/placeholder.svg',
                      text: reply.textDisplay ?? '',
                      timestamp: reply.publishedAt ?? new Date().toISOString(),
                      likes: Number(reply.likeCount ?? 0),
                      source: 'remote' as const,
                    }))
                    const normalizedLocalReplies = storedLocalReplies.map((reply) => ({
                      id: reply.id,
                      author: reply.author,
                      avatar: reply.authorAvatar,
                      text: reply.text,
                      timestamp: reply.timestamp,
                      likes: reply.likes,
                      source: 'local' as const,
                    }))
                    const combinedReplies = [...normalizedRemoteReplies, ...normalizedLocalReplies]
                    const displayedReplyCount = combinedReplies.length
                    const showReplyCount = displayedReplyCount > 0

                    return (
                      <div key={comment.id} className="space-y-3 rounded-2xl bg-secondary/40 p-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={comment.authorProfileImageUrl}
                            alt={comment.authorDisplayName}
                            className="h-8 w-8 rounded-full"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.authorDisplayName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(comment.publishedAt)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{comment.textDisplay}</p>
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Heart className="h-3 w-3" />
                                {formatViewCount(String(comment.likeCount ?? '0'))}
                              </span>
                              {showReplyCount && (
                                <span className="text-xs text-muted-foreground">
                                  {displayedReplyCount}{' '}
                                  {displayedReplyCount === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                              {currentUser && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto px-2"
                                  onClick={() => {
                                    if (replyTarget?.type === 'remote' && replyTarget.commentId === comment.id) {
                                      setReplyTarget(null)
                                      setNewReply('')
                                    } else {
                                      setReplyTarget({ type: 'remote', commentId: comment.id })
                                      setNewReply('')
                                    }
                                  }}
                                >
                                  Reply
                                </Button>
                              )}
                            </div>

                            {combinedReplies.length > 0 && (
                              <div className="mt-3 space-y-2 border-l-2 border-border/40 pl-4">
                                {combinedReplies.map((reply) => {
                                  const isLocalReply = reply.source === 'local'
                                  return (
                                    <div key={reply.id} className="flex items-start gap-2">
                                      <img
                                        src={reply.avatar}
                                        alt={reply.author}
                                        className="h-6 w-6 rounded-full"
                                      />
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium">{reply.author}</span>
                                          <span className="text-[11px] text-muted-foreground">{formatCommentTimestamp(reply.timestamp)}</span>
                                        </div>
                                        <p className="text-xs leading-relaxed">{reply.text}</p>
                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                          {isLocalReply ? (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-auto px-1 ${commentLikes[reply.id] ? 'text-rose-500' : ''}`}
                                              onClick={() => {
                                                const newLikes = { ...commentLikes }
                                                const isLiked = !newLikes[reply.id]
                                                newLikes[reply.id] = isLiked
                                                setCommentLikes(newLikes)

                                                setRemoteReplies((prev) => {
                                                  const existing = prev[comment.id] ?? []
                                                  const updated = existing.map((item) =>
                                                    item.id === reply.id
                                                      ? {
                                                          ...item,
                                                          likes: Math.max(0, item.likes + (isLiked ? 1 : -1)),
                                                        }
                                                      : item
                                                  )
                                                  const nextReplies = { ...prev, [comment.id]: updated }

                                                  try {
                                                    localStorage.setItem(
                                                      `comment_thread_replies_${video.id}`,
                                                      JSON.stringify(nextReplies)
                                                    )
                                                    localStorage.setItem(
                                                      `comment_likes_${video.id}`,
                                                      JSON.stringify(newLikes)
                                                    )
                                                  } catch (err) {
                                                    toast.error('Failed to save', 'Could not save like status')
                                                  }

                                                  return nextReplies
                                                })
                                              }}
                                            >
                                              <Heart className={`mr-1 h-3 w-3 ${commentLikes[reply.id] ? 'fill-current' : ''}`} />
                                              {reply.likes}
                                            </Button>
                                          ) : (
                                            <span className="flex items-center gap-1">
                                              <Heart className="h-3 w-3" />
                                              {formatViewCount(String(reply.likes))}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {replyTarget?.type === 'remote' && replyTarget.commentId === comment.id && currentUser && (
                              <div className="mt-3 flex items-center gap-2">
                                <div className="h-6 w-6 overflow-hidden rounded-full">
                                  <img
                                    src={currentUser.avatar || '/placeholder.svg'}
                                    alt={currentUser.channelName}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg'
                                    }}
                                  />
                                </div>
                                <Input
                                  placeholder={`Reply to ${comment.authorDisplayName}...`}
                                  value={newReply}
                                  onChange={(e) => setNewReply(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newReply.trim()) {
                                      handleAddReply()
                                    }
                                    if (e.key === 'Escape') {
                                      setReplyTarget(null)
                                      setNewReply('')
                                    }
                                  }}
                                  className="h-8 flex-1"
                                  autoFocus
                                />
                                {newReply.trim() && (
                                  <Button size="sm" className="h-8" onClick={handleAddReply}>
                                    <Send className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={() => {
                                    setReplyTarget(null)
                                    setNewReply('')
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              {remoteCommentThreads.length === 0 && comments.length === 0 && (
                <div className="rounded-2xl bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                  Be the first to share your thoughts.
                </div>
              )}
            </div>
          </div>
        </section>

        {relatedVideos.length > 0 && (
          <aside className="mt-12 space-y-4 lg:mt-0">
            <h2 className="text-lg font-semibold">Related videos</h2>
            <div className="space-y-3">
              {relatedVideos.map((relatedVideo) => (
                <RelatedVideoCard key={relatedVideo.id} video={relatedVideo} />
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Share Modal */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[425px] rounded-xl bg-background sm:rounded-2xl">
          <DialogTitle>Share</DialogTitle>
          <DialogDescription className="sr-only">Share this video</DialogDescription>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            <Button
              variant="ghost"
              className="flex h-20 flex-col items-center justify-center hover:bg-muted/50"
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/watch/${video.id}`
                  await navigator.clipboard.writeText(url)
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
                const url = `${window.location.origin}/watch/${video.id}`
                const text = `Check out this video: ${video.snippet.title} - ${url}`
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
                const url = `${window.location.origin}/watch/${video.id}`
                const text = `Check out this video: ${video.snippet.title} - ${url}`
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
                const url = `${window.location.origin}/watch/${video.id}`
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
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
                const url = `${window.location.origin}/watch/${video.id}`
                window.open(`https://reddit.com/submit?url=${encodeURIComponent(url)}`, '_blank')
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
                const url = `${window.location.origin}/watch/${video.id}`
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
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
                const url = `${window.location.origin}/watch/${video.id}`
                window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, '_blank')
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
                const subject = `Check out this video: ${video.snippet.title}`
                const url = `${window.location.origin}/watch/${video.id}`
                const body = `I thought you'd like this video: ${video.snippet.title}\n\n${url}`
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
                  <ListPlus className="mr-2 h-4 w-4" />
                  Create New Playlist
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Playlist Name</label>
                  <input
                    type="text"
                    placeholder="Enter playlist name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="mt-2 w-full rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
