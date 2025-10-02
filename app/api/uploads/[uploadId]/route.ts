import { NextRequest, NextResponse } from 'next/server'
import { getUploadById } from '@/lib/uploads'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params
    const upload = await getUploadById(uploadId)

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(upload)
  } catch (error) {
    console.error('Error fetching upload:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upload' },
      { status: 500 }
    )
  }
}
