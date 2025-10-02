export interface Video {
    id: string
    snippet: {
      title: string
      description: string
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
        standard?: { url: string }
        maxres?: { url: string }
      }
      channelTitle: string
      channelId: string
      publishedAt: string
    }
    statistics: {
      viewCount: string
      likeCount: string
      commentCount: string
    }
    contentDetails: {
      duration: string
    }
    channel?: {
      title: string
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
      }
      statistics: {
        subscriberCount: string
        videoCount: string
      }
      handle?: string
    }
    relatedVideos?: RelatedVideo[]
    isLocal?: boolean
    filePath?: string
    ownerId?: string
  }
  
export interface RelatedVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
  viewCount?: string
  duration?: string
}
  
  export interface Short extends Omit<Video, 'contentDetails'> {
    isShort: true
  }
