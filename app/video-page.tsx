'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, ChevronDown, ChevronUp, Send } from 'lucide-react'

// Utility functions (unchanged)
function formatViewCount(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`
  } else {
    return views.toString()
  }
}

function formatDate(publishDate: string): string {
  const now = new Date()
  const published = new Date(publishDate)
  const diffTime = Math.abs(now.getTime() - published.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'just now'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// API function to fetch video details
async function fetchVideoDetails(videoId: string) {
  const response = await fetch(`/api/videos/${videoId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch video details')
  }
  return response.json()
}

interface VideoPageProps {
  videoId: string
}

export default function VideoPage({ videoId }: VideoPageProps) {
  const [comment, setComment] = useState('')
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [userLiked, setUserLiked] = useState(false)
  const [userDisliked, setUserDisliked] = useState(false)

  const { data: video, isLoading, isError } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => fetchVideoDetails(videoId),
  })

  const toggleDescription = () => setIsDescriptionExpanded(!isDescriptionExpanded)

  const handleLike = () => {
    setUserLiked(!userLiked)
    setUserDisliked(false)
  }

  const handleDislike = () => {
    setUserDisliked(!userDisliked)
    setUserLiked(false)
  }

  const handleCommentSubmit = () => {
    // Here you would typically send the comment to your API
    console.log('Submitting comment:', comment)
    setComment('')
  }

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading video</div>

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-background text-foreground">
      <main className="flex-1">
        <div className="aspect-video mb-4 rounded-xl overflow-hidden">
          <video src={video.videoUrl} controls className="w-full h-full">
            Your browser does not support the video tag.
          </video>
        </div>
        <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="text-sm text-muted-foreground">
            {formatViewCount(video.views)} views • {formatDate(video.publishDate)}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleLike} className={userLiked ? 'text-primary' : ''}>
              <ThumbsUp className="mr-2 h-4 w-4" />
              {formatViewCount(video.likes)}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDislike} className={userDisliked ? 'text-primary' : ''}>
              <ThumbsDown className="mr-2 h-4 w-4" />
              {formatViewCount(video.dislikes)}
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 p-4 bg-muted rounded-lg mb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={video.channelAvatar} alt={video.channelName} />
              <AvatarFallback>{video.channelName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{video.channelName}</h2>
              <p className="text-sm text-muted-foreground">{formatViewCount(video.subscribers)} subscribers</p>
            </div>
          </div>
          <Button>Subscribe</Button>
        </div>
        <div className="bg-muted rounded-lg p-4 mb-4">
          <div className={`${isDescriptionExpanded ? '' : 'line-clamp-3'}`}>
            <p>{video.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleDescription} className="mt-2">
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
        <div>
          <h3 className="text-lg font-semibold mb-4">{video.comments.length} Comments</h3>
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/user-avatar.png" alt="Your avatar" />
              <AvatarFallback>YO</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handleCommentSubmit} disabled={!comment.trim()}>
                <Send className="mr-2 rounded-full h-4 w-4" />
                Comment
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {video.comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.avatar} alt={comment.user} />
                  <AvatarFallback>{comment.user[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{comment.user}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(comment.timestamp)}</span>
                  </div>
                  <p className="mt-1">{comment.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="sm">
                      <ThumbsUp className="mr-2 h-3 w-3" />
                      {formatViewCount(comment.likes)}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <ThumbsDown className="mr-2 h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">Reply</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <aside className="lg:w-80">
        <h3 className="text-lg font-semibold mb-4">Related Videos</h3>
        <ScrollArea className="h-[calc(100vh-2rem)]">
          <div className="space-y-4 pr-4">
            {video.relatedVideos.map((relatedVideo: any) => (
              <Link key={relatedVideo.id} href={`/video/${relatedVideo.id}`} className="flex gap-2 group">
                <div className="relative w-40 h-24 flex-shrink-0">
                  <Image
                    src={relatedVideo.thumbnail}
                    alt={relatedVideo.title}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div>
                  <h4 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">{relatedVideo.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{relatedVideo.channelName}</p>
                  <p className="text-sm text-muted-foreground">{formatViewCount(relatedVideo.views)} views</p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}