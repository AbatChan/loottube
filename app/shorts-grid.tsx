import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"

interface Short {
  id: string
  title: string
  thumbnail: string
  views: string
}

interface ShortsGridProps {
  shorts: Short[]
}

export function ShortsGrid({ shorts }: ShortsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {shorts.map((short) => (
        <Card key={short.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-[9/16]">
              <Image
                src={short.thumbnail}
                alt={short.title}
                layout="fill"
                objectFit="cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <h3 className="font-semibold text-sm text-white line-clamp-2">{short.title}</h3>
                <p className="text-xs text-gray-300">{short.views} views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}