import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { DEFAULT_CHANNEL } from './upload-constants'

export interface StoredChannelProfile {
  id: string
  title: string
  handle: string
  description: string
  avatar: string
  banner: string
  joinedAt: string
  subscribers: number
  totalViews: number
  themeColor?: string
  updatedAt?: string
  ownerId?: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const PROFILE_FILE = path.join(DATA_DIR, 'channel-profile.json')
const CHANNEL_ASSET_DIR = path.join(process.cwd(), 'public', 'upload', 'channel')

const FALLBACK_PROFILE: StoredChannelProfile = {
  id: DEFAULT_CHANNEL.id,
  title: DEFAULT_CHANNEL.title,
  handle: '@lootube',
  description: 'Tell viewers about your channel. This space is perfect for your mission statement or a short bio.',
  avatar: DEFAULT_CHANNEL.avatar,
  banner: '/brand/banner.svg',
  joinedAt: new Date().toISOString(),
  subscribers: 0,
  totalViews: 0,
  themeColor: '#ff0033',
  updatedAt: new Date().toISOString(),
}

type ChannelProfileStore = {
  version: number
  default: StoredChannelProfile
  profiles: Record<string, StoredChannelProfile>
}

const PROFILE_STORE_VERSION = 1

async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(CHANNEL_ASSET_DIR, { recursive: true })
}

function mergeWithFallback(profile: StoredChannelProfile, ownerId?: string): StoredChannelProfile {
  const normalizedHandle = normalizeHandle(profile.handle) || FALLBACK_PROFILE.handle
  return {
    ...FALLBACK_PROFILE,
    ...profile,
    ownerId: ownerId ?? profile.ownerId,
    id: profile.id || FALLBACK_PROFILE.id,
    avatar: profile.avatar || FALLBACK_PROFILE.avatar,
    banner: profile.banner || FALLBACK_PROFILE.banner,
    handle: normalizedHandle,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  }
}

async function loadProfileStore(): Promise<ChannelProfileStore> {
  await ensureDirectories()
  try {
    const raw = await fs.readFile(PROFILE_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'profiles' in parsed && 'default' in parsed) {
      const store = parsed as ChannelProfileStore
      return {
        version: store.version ?? PROFILE_STORE_VERSION,
        default: mergeWithFallback(store.default),
        profiles: Object.fromEntries(
          Object.entries(store.profiles || {}).map(([key, value]) => [
            key,
            mergeWithFallback({ ...value, ownerId: value.ownerId ?? key }, value.ownerId ?? key),
          ])
        ),
      }
    }
    if (parsed && typeof parsed === 'object') {
      const legacyProfile = parsed as StoredChannelProfile
      return {
        version: PROFILE_STORE_VERSION,
        default: mergeWithFallback(legacyProfile),
        profiles: {},
      }
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
  }

  return {
    version: PROFILE_STORE_VERSION,
    default: FALLBACK_PROFILE,
    profiles: {},
  }
}

async function saveProfileStore(store: ChannelProfileStore) {
  await ensureDirectories()
  const payload: ChannelProfileStore = {
    version: PROFILE_STORE_VERSION,
    default: mergeWithFallback(store.default),
    profiles: Object.fromEntries(
      Object.entries(store.profiles).map(([key, profile]) => [
        key,
        mergeWithFallback(profile, profile.ownerId ?? key),
      ])
    ),
  }
  await fs.writeFile(PROFILE_FILE, JSON.stringify(payload, null, 2), 'utf8')
}

export async function getStoredChannelProfile(userId?: string): Promise<StoredChannelProfile> {
  const store = await loadProfileStore()
  if (userId) {
    const profile = store.profiles[userId]
    if (profile) {
      return mergeWithFallback(profile, userId)
    }
    return mergeWithFallback({ ...FALLBACK_PROFILE, ownerId: userId }, userId)
  }
  return mergeWithFallback(store.default)
}

export async function setStoredChannelProfile(
  profile: StoredChannelProfile,
  ownerId?: string
): Promise<void> {
  const store = await loadProfileStore()
  const normalized = mergeWithFallback(profile, ownerId ?? profile.ownerId)
  if (ownerId || profile.ownerId) {
    const key = ownerId ?? profile.ownerId!
    store.profiles[key] = { ...normalized, ownerId: key }
  } else {
    store.default = normalized
  }
  await saveProfileStore(store)
}

export async function updateStoredChannelProfile(
  patch: Partial<StoredChannelProfile>,
  ownerId?: string
): Promise<StoredChannelProfile> {
  const store = await loadProfileStore()
  const key = ownerId ?? patch.ownerId
  if (key) {
    const current = store.profiles[key] ?? { ...FALLBACK_PROFILE, ownerId: key }
    const next = mergeWithFallback(
      {
        ...current,
        ...patch,
        ownerId: key,
      },
      key
    )
    store.profiles[key] = next
    await saveProfileStore(store)
    return next
  }

  const nextDefault = mergeWithFallback({
    ...store.default,
    ...patch,
    ownerId: store.default.ownerId,
  })
  store.default = nextDefault
  await saveProfileStore(store)
  return nextDefault
}

export async function getStoredChannelProfileByHandle(handle: string) {
  const target = normalizeHandle(handle)
  if (!target) return null
  const store = await loadProfileStore()
  if (normalizeHandle(store.default.handle) === target) {
    return { profile: mergeWithFallback(store.default), ownerId: store.default.ownerId }
  }
  for (const [ownerId, profile] of Object.entries(store.profiles)) {
    if (normalizeHandle(profile.handle) === target) {
      return { profile: mergeWithFallback(profile, ownerId), ownerId }
    }
  }
  return null
}

export async function hasStoredChannelProfile(ownerId: string) {
  const store = await loadProfileStore()
  return Object.prototype.hasOwnProperty.call(store.profiles, ownerId)
}

export function normalizeHandle(raw: string | null | undefined) {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/^@+/, '')
  const sanitized = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return sanitized ? `@${sanitized}` : ''
}

export async function saveChannelAsset(file: File, type: 'avatar' | 'banner'): Promise<string> {
  await ensureDirectories()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const startingExt = path.extname(file.name)
  const fallbackExt = type === 'avatar' ? '.png' : '.jpg'
  const ext = (startingExt || fallbackExt).toLowerCase()
  const fileName = `${type}-${randomUUID()}${ext}`
  const filePath = path.join(CHANNEL_ASSET_DIR, fileName)
  await fs.writeFile(filePath, buffer)
  return `/upload/channel/${fileName}`
}

export async function removeChannelAsset(assetPath: string | null | undefined) {
  if (!assetPath) return
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  if (!normalized.startsWith('/upload/channel/')) return

  const absolute = path.join(process.cwd(), 'public', normalized)
  try {
    await fs.unlink(absolute)
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('Failed to remove channel asset:', error)
    }
  }
}

export type ChannelAssetKind = 'avatar' | 'banner'
