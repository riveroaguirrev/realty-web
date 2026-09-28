import { NextRequest, NextResponse } from 'next/server'
import { messageService } from '@/services/message.service'
import { supabase } from '@/lib/supabase'
import { ApiResponse } from '@shared/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; msgId: string } }
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

    const { msgId } = params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'content is required' } },
        { status: 400 }
      )
    }

    const message = await messageService.getMessage(msgId)
    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } },
        { status: 404 }
      )
    }

    // Only sender can edit message
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only sender can edit' } },
        { status: 403 }
      )
    }

    const updated = await messageService.editMessage(msgId, content.trim())

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    )
  } catch (error) {
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
  { params }: { params: { id: string; msgId: string } }
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

    const { msgId } = params

    const message = await messageService.getMessage(msgId)
    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } },
        { status: 404 }
      )
    }

    // Only sender can delete message
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only sender can delete' } },
        { status: 403 }
      )
    }

    await messageService.deleteMessage(msgId)

    return NextResponse.json(
      {
        success: true,
        data: { deleted: true },
      },
      { status: 200 }
    )
  } catch (error) {
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
