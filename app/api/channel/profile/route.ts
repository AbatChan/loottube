import { NextResponse } from 'next/server'
import {
  getStoredChannelProfile,
  saveChannelAsset,
  removeChannelAsset,
  updateStoredChannelProfile,
  StoredChannelProfile,
  normalizeHandle,
} from '@/lib/channel-profile'
import { readUploads } from '@/lib/uploads'

export const runtime = 'nodejs'

function toNumber(value: FormDataEntryValue | null, fallback: number) {
  if (!value || typeof value !== 'string') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ownerId = url.searchParams.get('userId') ?? undefined
  const profile = await getStoredChannelProfile(ownerId ?? undefined)
  const uploads = await readUploads()
  const videoCount = uploads.filter((item) => item.type === 'video').length
  const shortCount = uploads.filter((item) => item.type === 'short').length
  const computedViews = uploads.reduce((total, item) => total + (item.viewCount || 0), 0)

  return NextResponse.json({
    profile: {
      ...profile,
      videoCount,
      shortCount,
      computedViews,
    },
  })
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const ownerId = (formData.get('userId') as string | null) ?? undefined

    const current = await getStoredChannelProfile(ownerId ?? undefined)

    const title = (formData.get('title') as string | null)?.trim()
    const description = (formData.get('description') as string | null)?.trim()
    const rawHandle = (formData.get('handle') as string | null) ?? current.handle
    const themeColor = (formData.get('themeColor') as string | null)?.trim()

    const subscribers = toNumber(formData.get('subscribers'), current.subscribers)
    const totalViews = toNumber(formData.get('totalViews'), current.totalViews)

    const avatarFile = formData.get('avatar')
    const bannerFile = formData.get('banner')

    const patch: Partial<StoredChannelProfile> = {
      ownerId: ownerId ?? current.ownerId,
    }

    if (title) patch.title = title
    if (typeof description === 'string') patch.description = description
    if (themeColor) patch.themeColor = themeColor
    if (Number.isFinite(subscribers)) patch.subscribers = subscribers
    if (Number.isFinite(totalViews)) patch.totalViews = totalViews

    const normalizedHandle = normalizeHandle(rawHandle)
    if (normalizedHandle) {
      patch.handle = normalizedHandle
    }

    if (avatarFile instanceof File && avatarFile.size > 0) {
      const newAvatarPath = await saveChannelAsset(avatarFile, 'avatar')
      patch.avatar = newAvatarPath
      await removeChannelAsset(current.avatar)
    }

    if (bannerFile instanceof File && bannerFile.size > 0) {
      const newBannerPath = await saveChannelAsset(bannerFile, 'banner')
      patch.banner = newBannerPath
      await removeChannelAsset(current.banner)
    }

    const updated = await updateStoredChannelProfile(patch, ownerId ?? undefined)

    return NextResponse.json({ profile: updated })
  } catch (error) {
    console.error('Failed to update channel profile:', error)
    return NextResponse.json({ error: 'Failed to update channel profile' }, { status: 500 })
  }
}
