import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/services/conversation.service'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@shared/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } },
        { status: 401 }
      )
    }

    const { data: user, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const { id } = params

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
