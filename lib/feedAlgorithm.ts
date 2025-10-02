// Smart feed algorithm that balances interests, trending, and discovery

import { StoredUpload } from './upload-constants'
import { calculateRelevanceScore, getUserInterestProfile } from './userInteractions'

export interface FeedConfig {
  userRegion?: string
  userId?: string
  interestWeight: number    // 0-1, how much to prioritize user interests
  trendingWeight: number    // 0-1, how much to prioritize trending content
  discoveryWeight: number   // 0-1, how much to include random discovery
  regionalWeight: number    // 0-1, how much to prioritize regional content
}

export const DEFAULT_FEED_CONFIG: FeedConfig = {
  interestWeight: 0.4,      // 40% based on interests
  trendingWeight: 0.3,      // 30% trending
  discoveryWeight: 0.2,     // 20% random discovery
  regionalWeight: 0.1,      // 10% regional preference
}

interface ScoredUpload extends StoredUpload {
  score: number
  scoreBreakdown?: {
    interest: number
    trending: number
    discovery: number
    regional: number
  }
}

// Calculate trending score based on recent views and engagement
function calculateTrendingScore(upload: StoredUpload): number {
  const ageInDays = (Date.now() - new Date(upload.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  const recencyBonus = Math.max(0, 7 - ageInDays) / 7 // Bonus for content less than 7 days old

  const viewScore = upload.viewCount || 0
  const likeScore = (upload.likeCount || 0) * 3
  const commentScore = (upload.commentCount || 0) * 5

  const engagementScore = viewScore + likeScore + commentScore

  // Apply time decay
  const decayFactor = Math.pow(0.9, ageInDays) // Decay over time

  return (engagementScore * decayFactor) + (recencyBonus * 100)
}

// Calculate regional relevance score
function calculateRegionalScore(upload: StoredUpload, userRegion?: string): number {
  if (!userRegion || !upload.region) return 0
  return upload.region === userRegion ? 100 : 0
}

// Shuffle array randomly (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Apply smart feed algorithm to uploads
export function applyFeedAlgorithm(
  uploads: StoredUpload[],
  config: FeedConfig = DEFAULT_FEED_CONFIG
): StoredUpload[] {
  const { userRegion, userId, interestWeight, trendingWeight, discoveryWeight, regionalWeight } = config

  // Normalize weights to sum to 1
  const totalWeight = interestWeight + trendingWeight + discoveryWeight + regionalWeight
  const normalizedInterest = interestWeight / totalWeight
  const normalizedTrending = trendingWeight / totalWeight
  const normalizedDiscovery = discoveryWeight / totalWeight
  const normalizedRegional = regionalWeight / totalWeight

  // Score each upload
  const scoredUploads: ScoredUpload[] = uploads.map(upload => {
    const interestScore = calculateRelevanceScore(
      {
        category: upload.category,
        channelId: upload.channelId,
        tags: upload.tags,
      },
      userId
    )
    const trendingScore = calculateTrendingScore(upload)
    const discoveryScore = Math.random() * 100 // Random for discovery
    const regionalScore = calculateRegionalScore(upload, userRegion)

    const totalScore =
      (interestScore * normalizedInterest) +
      (trendingScore * normalizedTrending) +
      (discoveryScore * normalizedDiscovery) +
      (regionalScore * normalizedRegional)

    return {
      ...upload,
      score: totalScore,
      scoreBreakdown: {
        interest: interestScore,
        trending: trendingScore,
        discovery: discoveryScore,
        regional: regionalScore,
      },
    }
  })

  // Sort by total score (descending)
  scoredUploads.sort((a, b) => b.score - a.score)

  // Add some randomness to prevent too much filter bubble
  // Shuffle the top 30% slightly to add variety
  const topCount = Math.ceil(scoredUploads.length * 0.3)
  const topPortion = scoredUploads.slice(0, topCount)
  const restPortion = scoredUploads.slice(topCount)

  const slightlySortedTop = shuffleArray(topPortion).sort((a, b) => {
    // Keep general order but allow some movement
    return b.score - a.score + (Math.random() - 0.5) * 20
  })

  return [...slightlySortedTop, ...restPortion]
}

// Get recommended uploads with smart algorithm
export function getRecommendedFeed(
  uploads: StoredUpload[],
  options: {
    userRegion?: string
    userId?: string
    limit?: number
    type?: 'video' | 'short'
    customConfig?: Partial<FeedConfig>
  } = {}
): StoredUpload[] {
  const { userRegion, userId, limit, type, customConfig } = options

  // Filter by type if specified
  let filtered = type ? uploads.filter(u => u.type === type) : uploads

  // Apply smart algorithm
  const config: FeedConfig = {
    ...DEFAULT_FEED_CONFIG,
    userRegion,
    userId,
    ...customConfig,
  }

  const sorted = applyFeedAlgorithm(filtered, config)

  // Return limited results
  return limit ? sorted.slice(0, limit) : sorted
}

// Get different feed variations for testing/comparison
export const FEED_PRESETS = {
  // Heavily personalized - focus on user interests
  personalized: {
    interestWeight: 0.6,
    trendingWeight: 0.2,
    discoveryWeight: 0.1,
    regionalWeight: 0.1,
  },

  // Trending focus - what's popular now
  trending: {
    interestWeight: 0.2,
    trendingWeight: 0.6,
    discoveryWeight: 0.1,
    regionalWeight: 0.1,
  },

  // Discovery mode - explore new content
  discovery: {
    interestWeight: 0.2,
    trendingWeight: 0.2,
    discoveryWeight: 0.5,
    regionalWeight: 0.1,
  },

  // Regional focus - prioritize local content
  regional: {
    interestWeight: 0.3,
    trendingWeight: 0.2,
    discoveryWeight: 0.1,
    regionalWeight: 0.4,
  },

  // Balanced - default mix
  balanced: DEFAULT_FEED_CONFIG,
}
