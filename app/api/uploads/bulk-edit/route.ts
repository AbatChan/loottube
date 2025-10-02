import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/userAuth'
import { readUploads, writeUploads } from '@/lib/uploads'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { ids, visibility } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array is required' },
        { status: 400 }
      )
    }

    if (!visibility || !['public', 'unlisted', 'private'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility value' },
        { status: 400 }
      )
    }

    const uploads = await readUploads()
    let updatedCount = 0

    const updatedUploads = uploads.map((upload) => {
      if (ids.includes(upload.id) && upload.ownerId === currentUser.id) {
        updatedCount++
        return {
          ...upload,
          visibility: visibility as 'public' | 'unlisted' | 'private',
          updatedAt: new Date().toISOString(),
        }
      }
      return upload
    })

    await writeUploads(updatedUploads)

    return NextResponse.json({
      updated: updatedCount,
      total: ids.length,
    })
  } catch (error) {
    console.error('Error in bulk edit:', error)
    return NextResponse.json(
      { error: 'Failed to edit uploads' },
      { status: 500 }
    )
  }
}
