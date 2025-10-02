import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Video {
  id: string
  title: string
  thumbnail: string
  views: string
  timestamp: string
  channelName?: string
  channelAvatar?: string
}

interface VideoGridProps {
  videos: Video[]
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video) => (
        <Card key={video.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-video">
              <Image
                src={video.thumbnail}
                alt={video.title}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="p-4 flex">
              <Avatar className="h-9 w-9 mr-3">
                <AvatarImage src={video.channelAvatar} alt={video.channelName || 'Channel'} />
                <AvatarFallback>{video.channelName ? video.channelName[0] : '?'}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{video.channelName}</p>
                <p className="text-xs text-muted-foreground">{video.views} views • {video.timestamp}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}