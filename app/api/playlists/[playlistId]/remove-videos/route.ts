import { NextRequest, NextResponse } from 'next/server'
import { getPlaylistById, removeVideosFromPlaylist } from '@/lib/playlists'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { playlistId } = await params
    const body = await request.json()
    const { userId, videoIds } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - userId required' },
        { status: 401 }
      )
    }

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'videoIds array is required' },
        { status: 400 }
      )
    }

    const playlist = await getPlaylistById(playlistId)

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      )
    }

    if (playlist.userId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to modify this playlist' },
        { status: 403 }
      )
    }

    const updatedPlaylist = await removeVideosFromPlaylist(playlistId, videoIds)

    return NextResponse.json(updatedPlaylist)
  } catch (error) {
    console.error('Error removing videos from playlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove videos from playlist' },
      { status: 500 }
    )
  }
}
