import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/services/conversation.service'
import { requireUser } from '@/middleware/auth'
import { ApiResponse } from '@shared/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { id } = await params

    await conversationService.requireParticipant(id, user.id)
    const result = await conversationService.markAsRead(id, user.id, request.nextUrl.searchParams.get('through'))

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Mark read error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'MARK_READ_ERROR', message: 'Failed to mark as read' },
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
