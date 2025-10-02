// Track user interactions for personalized recommendations

export interface UserInteraction {
  videoId: string
  channelId?: string
  category?: string
  tags?: string[]
  type: 'view' | 'like' | 'comment' | 'subscribe'
  timestamp: number
  watchDuration?: number // For views, how long they watched (seconds)
}

export interface UserInterestProfile {
  categories: Record<string, number> // category -> score
  channels: Record<string, number> // channelId -> score
  tags: Record<string, number> // tag -> score
  recentInteractions: UserInteraction[]
}

const MAX_INTERACTIONS = 100 // Keep last 100 interactions
const INTERACTION_WEIGHTS = {
  view: 1,
  like: 3,
  comment: 5,
  subscribe: 10,
}

// Get user's interest profile from localStorage
export function getUserInterestProfile(userId?: string): UserInterestProfile {
  if (typeof window === 'undefined') {
    return { categories: {}, channels: {}, tags: {}, recentInteractions: [] }
  }

  const key = `lootube_interests${userId ? `_${userId}` : ''}`
  const stored = localStorage.getItem(key)

  if (!stored) {
    return { categories: {}, channels: {}, tags: {}, recentInteractions: [] }
  }

  try {
    return JSON.parse(stored)
  } catch {
    return { categories: {}, channels: {}, tags: {}, recentInteractions: [] }
  }
}

// Track a user interaction
export function trackInteraction(interaction: UserInteraction, userId?: string) {
  if (typeof window === 'undefined') return

  const profile = getUserInterestProfile(userId)

  // Add to recent interactions
  profile.recentInteractions.unshift(interaction)
  if (profile.recentInteractions.length > MAX_INTERACTIONS) {
    profile.recentInteractions = profile.recentInteractions.slice(0, MAX_INTERACTIONS)
  }

  // Update scores
  const weight = INTERACTION_WEIGHTS[interaction.type]

  if (interaction.category) {
    profile.categories[interaction.category] = (profile.categories[interaction.category] || 0) + weight
  }

  if (interaction.channelId) {
    profile.channels[interaction.channelId] = (profile.channels[interaction.channelId] || 0) + weight
  }

  if (interaction.tags) {
    interaction.tags.forEach(tag => {
      profile.tags[tag] = (profile.tags[tag] || 0) + (weight * 0.5) // Tags have half weight
    })
  }

  // Save to localStorage
  const key = `lootube_interests${userId ? `_${userId}` : ''}`
  localStorage.setItem(key, JSON.stringify(profile))
}

// Track video view
export function trackView(videoId: string, metadata?: { channelId?: string; category?: string; tags?: string[]; watchDuration?: number }, userId?: string) {
  trackInteraction({
    videoId,
    channelId: metadata?.channelId,
    category: metadata?.category,
    tags: metadata?.tags,
    type: 'view',
    timestamp: Date.now(),
    watchDuration: metadata?.watchDuration,
  }, userId)
}

// Track like
export function trackLike(videoId: string, metadata?: { channelId?: string; category?: string; tags?: string[] }, userId?: string) {
  trackInteraction({
    videoId,
    channelId: metadata?.channelId,
    category: metadata?.category,
    tags: metadata?.tags,
    type: 'like',
    timestamp: Date.now(),
  }, userId)
}

// Track comment
export function trackComment(videoId: string, metadata?: { channelId?: string; category?: string; tags?: string[] }, userId?: string) {
  trackInteraction({
    videoId,
    channelId: metadata?.channelId,
    category: metadata?.category,
    tags: metadata?.tags,
    type: 'comment',
    timestamp: Date.now(),
  }, userId)
}

// Track subscription
export function trackSubscribe(channelId: string, userId?: string) {
  trackInteraction({
    videoId: '', // Not video-specific
    channelId,
    type: 'subscribe',
    timestamp: Date.now(),
  }, userId)
}

// Get top categories by interest score
export function getTopCategories(userId?: string, limit = 5): string[] {
  const profile = getUserInterestProfile(userId)
  return Object.entries(profile.categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category]) => category)
}

// Get top channels by interest score
export function getTopChannels(userId?: string, limit = 10): string[] {
  const profile = getUserInterestProfile(userId)
  return Object.entries(profile.channels)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([channelId]) => channelId)
}

// Get top tags by interest score
export function getTopTags(userId?: string, limit = 20): string[] {
  const profile = getUserInterestProfile(userId)
  return Object.entries(profile.tags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag)
}

// Calculate relevance score for a video based on user interests
export function calculateRelevanceScore(
  video: { category?: string; channelId?: string; tags?: string[] },
  userId?: string
): number {
  const profile = getUserInterestProfile(userId)
  let score = 0

  if (video.category && profile.categories[video.category]) {
    score += profile.categories[video.category]
  }

  if (video.channelId && profile.channels[video.channelId]) {
    score += profile.channels[video.channelId] * 2 // Channel preference is weighted higher
  }

  if (video.tags) {
    video.tags.forEach(tag => {
      if (profile.tags[tag]) {
        score += profile.tags[tag]
      }
    })
  }

  return score
}
