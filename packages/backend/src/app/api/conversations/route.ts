import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { readPagination } from '@/utils/pagination'
import { NextRequest, NextResponse } from 'next/server'
import { conversationService } from '@/services/conversation.service'
import { requireUser } from '@/middleware/auth'
import { ApiResponse } from '@shared/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { searchParams } = new URL(request.url)
    const { page, pageSize } = readPagination(searchParams, 20)

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
    if (error instanceof AccountApiError) return accountErrorResponse(error)
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
    const user = await requireUser(request)

    const body = await request.json() as {
      participantIds?: string[]
      type?: 'DIRECT' | 'GROUP'
      name?: string
      description?: string
    }
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
    if (error instanceof AccountApiError) return accountErrorResponse(error)
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
