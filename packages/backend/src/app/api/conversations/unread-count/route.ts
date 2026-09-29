import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/services/conversation.service'
import { requireUser, sendError } from '@/middleware/auth'
import { ApiError, Errors } from '@/utils/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request)
    const count = await conversationService.countUnreadTotal(user.id)
    return NextResponse.json({ success: true, data: { count } })
  } catch (error) {
    if (error instanceof ApiError) return sendError(error, error.statusCode)
    console.error('Unread count error:', error)
    return sendError(Errors.INTERNAL_ERROR, 500)
  }
}
