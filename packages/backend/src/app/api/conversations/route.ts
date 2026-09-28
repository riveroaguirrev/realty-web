import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/services/conversation.service'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@shared/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
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

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20

    const result = await conversationService.listConversations(user.id, page, pageSize)

    return NextResponse.json(
      {
        success: true,
        data: result.conversations,
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
    console.error('List conversations error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LIST_CONVERSATIONS_ERROR', message: 'Failed to list conversations' },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
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

    const body = await request.json()
    const { participantIds, type = 'DIRECT', name, description } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'participantIds array is required' },
        },
        { status: 400 }
      )
    }

    const conversation = await conversationService.createConversation(
      user.id,
      participantIds,
      type,
      name,
      description
    )

    return NextResponse.json(
      {
        success: true,
        data: conversation,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'CREATE_CONVERSATION_ERROR', message: 'Failed to create conversation' },
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
