import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { NextRequest, NextResponse } from 'next/server'
import { messageService } from '@/services/message.service'
import { conversationService } from '@/services/conversation.service'
import { requireUser } from '@/middleware/auth'
import { ApiResponse } from '@shared/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { id, msgId } = await params
    const body = await request.json() as { content?: string }
    const { content } = body

    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'content is required' } },
        { status: 400 }
      )
    }

    if (content.trim().length > 10000) {
      return NextResponse.json({ success: false, error: { code: 'MESSAGE_TOO_LONG', message: 'El mensaje supera los 10.000 caracteres.' } }, { status: 400 })
    }
    await conversationService.requireParticipant(id, user.id)
    await messageService.requireMessageSender(id, msgId, user.id)
    const updated = await messageService.editMessage(msgId, content.trim())

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Edit message error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'EDIT_MESSAGE_ERROR', message: 'Failed to edit message' },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { id, msgId } = await params

    await conversationService.requireParticipant(id, user.id)
    await messageService.requireMessageSender(id, msgId, user.id)

    await messageService.deleteMessage(msgId)

    return NextResponse.json(
      {
        success: true,
        data: { deleted: true },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
    console.error('Delete message error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'DELETE_MESSAGE_ERROR', message: 'Failed to delete message' },
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
      'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
