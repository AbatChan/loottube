import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json')

export interface Playlist {
  id: string
  userId: string
  title: string
  description: string
  videoIds: string[]
  createdAt: string
  updatedAt: string
  visibility: 'public' | 'unlisted' | 'private'
  thumbnail?: string
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function readPlaylists(): Promise<Playlist[]> {
  try {
    await ensureDataDir()
    const raw = await fs.readFile(PLAYLISTS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function writePlaylists(playlists: Playlist[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8')
}

export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const playlists = await readPlaylists()
  return playlists.filter((p) => p.userId === userId)
}

export async function getPlaylistById(id: string): Promise<Playlist | undefined> {
  const playlists = await readPlaylists()
  return playlists.find((p) => p.id === id)
}

export async function createPlaylist(data: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<Playlist> {
  const playlists = await readPlaylists()
  const newPlaylist: Playlist = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  playlists.push(newPlaylist)
  await writePlaylists(playlists)
  return newPlaylist
}

export async function addVideosToPlaylist(playlistId: string, videoIds: string[]): Promise<Playlist | null> {
  const playlists = await readPlaylists()
  const playlist = playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  // Add only unique videos
  const newVideoIds = videoIds.filter((id) => !playlist.videoIds.includes(id))
  playlist.videoIds.push(...newVideoIds)
  playlist.updatedAt = new Date().toISOString()

  await writePlaylists(playlists)
  return playlist
}

export async function removeVideosFromPlaylist(playlistId: string, videoIds: string[]): Promise<Playlist | null> {
  const playlists = await readPlaylists()
  const playlist = playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  playlist.videoIds = playlist.videoIds.filter((id) => !videoIds.includes(id))
  playlist.updatedAt = new Date().toISOString()

  await writePlaylists(playlists)
  return playlist
}

export async function deletePlaylist(id: string, userId: string): Promise<boolean> {
  const playlists = await readPlaylists()
  const playlist = playlists.find((p) => p.id === id)

  if (!playlist || playlist.userId !== userId) {
    return false
  }

  const updatedPlaylists = playlists.filter((p) => p.id !== id)
  await writePlaylists(updatedPlaylists)
  return true
}
