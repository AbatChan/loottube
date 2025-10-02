import { NextResponse } from 'next/server'
import { getStoredChannelProfile, getStoredChannelProfileByHandle, normalizeHandle } from '@/lib/channel-profile'

const RESERVED_HANDLES = new Set([
  '@youtube',
  '@admin',
  '@lootube',
  '@yourchannel',
])

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const handleParam = searchParams.get('handle') ?? ''

  if (!handleParam.trim()) {
    return NextResponse.json(
      { available: false, reason: 'Handle is required.' },
      { status: 400 }
    )
  }

  const normalized = normalizeHandle(handleParam)
  if (!normalized) {
    return NextResponse.json(
      {
        available: false,
        reason: 'Use letters, numbers, periods, hyphens, or underscores.',
      },
      { status: 400 }
    )
  }

  const userId = searchParams.get('userId') ?? undefined

  const profile = await getStoredChannelProfile(userId ?? undefined)
  const currentNormalized = normalizeHandle(profile.handle)
  if (normalized === currentNormalized) {
    return NextResponse.json({ available: true, owner: true })
  }

  const existing = await getStoredChannelProfileByHandle(normalized)
  if (existing && existing.ownerId && existing.ownerId !== userId) {
    return NextResponse.json({
      available: false,
      reason: 'That handle is already in use on Lootube. Try something different.',
    })
  }
  if (existing && !existing.ownerId) {
    return NextResponse.json({
      available: false,
      reason: 'That handle is reserved. Please choose another.',
    })
  }

  if (RESERVED_HANDLES.has(normalized)) {
    return NextResponse.json({
      available: false,
      reason: 'That handle is reserved. Please choose another.',
    })
  }

  return NextResponse.json({ available: true })
}
