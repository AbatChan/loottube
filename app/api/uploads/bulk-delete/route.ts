import { NextRequest, NextResponse } from 'next/server'
import { deleteBulkUploads } from '@/lib/uploads'
import { getCurrentUser } from '@/lib/userAuth'

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
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array is required' },
        { status: 400 }
      )
    }

    // Verify ownership of all uploads before deleting
    const { getUploadById } = await import('@/lib/uploads')
    const ownershipChecks = await Promise.all(
      ids.map(async (id) => {
        const upload = await getUploadById(id)
        return upload && upload.ownerId === currentUser.id ? id : null
      })
    )

    const ownedIds = ownershipChecks.filter((id): id is string => id !== null)
    const unauthorizedIds = ids.filter((id) => !ownedIds.includes(id))

    if (ownedIds.length === 0) {
      return NextResponse.json(
        { error: 'No videos/shorts found or you do not own them' },
        { status: 403 }
      )
    }

    const results = await deleteBulkUploads(ownedIds)

    return NextResponse.json({
      deleted: results.success.length,
      failed: results.failed.length,
      unauthorized: unauthorizedIds.length,
      successIds: results.success,
      failedIds: results.failed,
      unauthorizedIds: unauthorizedIds,
    })
  } catch (error) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: 'Failed to delete uploads' },
      { status: 500 }
    )
  }
}
