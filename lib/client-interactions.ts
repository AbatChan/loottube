import { notifyNewSubscriber } from './notifications'
import { getCurrentUser } from './userAuth'

const SUBSCRIPTIONS_KEY = 'lootube:subscriptions'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readSubscriptionSet(): Set<string> {
  if (!canUseStorage()) {
    return new Set()
  }
  try {
    const raw = window.localStorage.getItem(SUBSCRIPTIONS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id) => typeof id === 'string'))
    }
  } catch (error) {
    console.warn('Failed to parse subscriptions from storage:', error)
  }
  return new Set()
}

function writeSubscriptionSet(values: Set<string>) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(Array.from(values)))
  } catch (error) {
    console.warn('Failed to persist subscriptions:', error)
  }
}

export function isChannelSubscribed(channelId: string | null | undefined): boolean {
  if (!channelId) return false
  return readSubscriptionSet().has(channelId)
}

export function toggleChannelSubscription(
  channelId: string | null | undefined,
  channelName?: string,
  channelHandle?: string
): boolean {
  if (!channelId) return false
  const current = readSubscriptionSet()
  let subscribed: boolean
  if (current.has(channelId)) {
    current.delete(channelId)
    subscribed = false
  } else {
    current.add(channelId)
    subscribed = true

    // Store channel metadata for notifications
    if (channelName) {
      try {
        const channelKey = `lootube_channel_${channelId}`
        const existingData = localStorage.getItem(channelKey)
        if (existingData) {
          const parsed = JSON.parse(existingData)
          const metadataKey = `lootube_channel_metadata_${channelId}`
          localStorage.setItem(metadataKey, JSON.stringify({
            ownerId: parsed.ownerId || parsed.id,
            channelName: channelName,
            channelHandle: channelHandle
          }))
        }
      } catch (error) {
        console.error('Failed to store channel metadata:', error)
      }
    }

    // Notify channel owner of new subscription
    const subscriber = getCurrentUser()
    if (subscriber && channelName) {
      // Get channel owner ID from channel metadata
      try {
        const channelKey = `lootube_channel_metadata_${channelId}`
        const channelData = localStorage.getItem(channelKey)
        if (channelData) {
          const { ownerId } = JSON.parse(channelData)
          if (ownerId && ownerId !== subscriber.id) {
            notifyNewSubscriber(
              ownerId,
              subscriber.id,
              subscriber.channelName || subscriber.username,
              subscriber.channelHandle
            )
          }
        }
      } catch (error) {
        console.error('Failed to send subscription notification:', error)
      }
    }
  }
  writeSubscriptionSet(current)
  return subscribed
}

export function setChannelSubscription(channelId: string | null | undefined, next: boolean) {
  if (!channelId) return
  const current = readSubscriptionSet()
  if (next) {
    current.add(channelId)
  } else {
    current.delete(channelId)
  }
  writeSubscriptionSet(current)
}

export function getChannelSubscriptionCount(channelId: string | null | undefined): number {
  return isChannelSubscribed(channelId) ? 1 : 0
}

const VIDEO_REACTION_KEY = 'lootube:video-reactions'

type VideoReaction = {
  liked: boolean
  disliked: boolean
}

function readVideoReactions(): Record<string, VideoReaction> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(VIDEO_REACTION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, VideoReaction>
    }
  } catch (error) {
    console.warn('Failed to parse video reactions from storage:', error)
  }
  return {}
}

function writeVideoReactions(reactions: Record<string, VideoReaction>) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(VIDEO_REACTION_KEY, JSON.stringify(reactions))
  } catch (error) {
    console.warn('Failed to persist video reactions:', error)
  }
}

export function getVideoReaction(videoId: string | null | undefined): VideoReaction {
  if (!videoId) return { liked: false, disliked: false }
  const reactions = readVideoReactions()
  return reactions[videoId] ?? { liked: false, disliked: false }
}

export function setVideoReaction(videoId: string | null | undefined, reaction: VideoReaction) {
  if (!videoId) return
  const reactions = readVideoReactions()
  reactions[videoId] = reaction
  writeVideoReactions(reactions)
}

export function clearVideoReaction(videoId: string | null | undefined) {
  if (!videoId) return
  const reactions = readVideoReactions()
  delete reactions[videoId]
  writeVideoReactions(reactions)
}
