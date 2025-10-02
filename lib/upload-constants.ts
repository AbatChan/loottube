export const YOUTUBE_CATEGORIES = {
  'Film & Animation': '1',
  'Autos & Vehicles': '2',
  'Music': '10',
  'Pets & Animals': '15',
  'Sports': '17',
  'Travel & Events': '19',
  'Gaming': '20',
  'People & Blogs': '22',
  'Comedy': '23',
  'Entertainment': '24',
  'News & Politics': '25',
  'Howto & Style': '26',
  'Education': '27',
  'Science & Technology': '28',
  'Nonprofits & Activism': '29',
  'General': 'general',
  'Fitness': 'fitness',
  'Finance': 'finance',
  'Art': 'art',
  'Podcasts': 'podcasts',
  'Live': 'live',
  'Beauty': 'beauty',
  'Fashion': 'fashion'
} as const

export const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' }
] as const

export interface StoredUpload {
  id: string
  title: string
  description: string
  filePath: string
  thumbnailPath: string | null
  durationSeconds: number
  createdAt: string
  type: 'video' | 'short'
  category: string
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  viewCount: number
  likeCount: number
  dislikeCount: number
  commentCount: number
  ownerId?: string
  channelId?: string
  region?: string  // Creator's region/country code (e.g., 'US', 'NG', 'GB')
}

export const DEFAULT_CHANNEL = {
  title: 'Your Channel',
  id: 'your-channel',
  avatar: '/placeholder.svg',
}
