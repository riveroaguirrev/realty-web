import { NextRequest, NextResponse } from 'next/server'
import { messageService } from '@/services/message.service'
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20

    // Verify user is participant
    const conversation = await conversationService.getConversation(id)
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
        { status: 404 }
      )
    }

    const isParticipant = conversation.participants.some((p) => p.advisorId === user.id)
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a participant' } },
        { status: 403 }
      )
    }

    const result = await messageService.listMessages(id, page, pageSize)

    return NextResponse.json(
      {
        success: true,
        data: result.messages,
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List messages error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LIST_MESSAGES_ERROR', message: 'Failed to list messages' },
      },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'content is required' } },
        { status: 400 }
      )
    }

    // Verify user is participant
    const conversation = await conversationService.getConversation(id)
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } },
        { status: 404 }
      )
    }

    const isParticipant = conversation.participants.some((p) => p.advisorId === user.id)
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a participant' } },
        { status: 403 }
      )
    }

    const message = await messageService.sendMessage(id, user.id, content.trim())
    await conversationService.updateLastMessageTime(id)

    return NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SEND_MESSAGE_ERROR', message: 'Failed to send message' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
