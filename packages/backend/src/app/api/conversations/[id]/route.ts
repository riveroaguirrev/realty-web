import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/services/conversation.service'
import { requireUser } from '@/middleware/auth'
import { ApiResponse } from '@shared/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { id } = await params

    const conversation = await conversationService.getConversation(id)

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
        { status: 404 }
      )
    }

    // Verify user is participant in conversation
    const isParticipant = conversation.participants.some((p) => p.advisorId === user.id)
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a participant' } },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: conversation,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Get conversation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'GET_CONVERSATION_ERROR', message: 'Failed to get conversation' },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
