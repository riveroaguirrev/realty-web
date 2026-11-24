import { ApiError as AccountApiError } from '@/utils/errors'
import { errorResponse as accountErrorResponse } from '@/lib/auth-route'
import { readPagination } from '@/utils/pagination'
import { NextRequest, NextResponse } from 'next/server'
import { messageService } from '@/services/message.service'
import { conversationService } from '@/services/conversation.service'
import { requireUser } from '@/middleware/auth'
import { ApiResponse } from '@shared/types'
import { readMessageForm } from '@/utils/validateMessageFiles'
import { messageAttachmentService } from '@/services/messageAttachment.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const { page, pageSize } = readPagination(searchParams, 20)

    await conversationService.requireParticipant(id, user.id)

    if (searchParams.get('order') === 'recent') {
      const history = await messageService.listRecentMessages(id, pageSize, searchParams.get('before'))
      return NextResponse.json({ success: true, data: history }, { headers: { 'Cache-Control': 'no-store' } })
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
    if (error instanceof AccountApiError) return accountErrorResponse(error)
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const user = await requireUser(request)

    const { id } = await params
    await conversationService.requireParticipant(id, user.id)

    let content: string
    let files: File[] = []
    if (request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;')) {
      const form = await readMessageForm(request)
      const text = form.get('content')
      if (text !== null && typeof text !== 'string') throw new AccountApiError(400, 'BAD_REQUEST', 'El texto del mensaje no es válido.')
      content = text || ''
      const entries = form.getAll('files')
      if (entries.some(file => typeof file === 'string')) throw new AccountApiError(400, 'BAD_REQUEST', 'Los adjuntos no son válidos.')
      files = entries as File[]
    } else {
      const body = await request.json() as { content?: unknown; attachments?: unknown }
      if (body.attachments !== undefined) throw new AccountApiError(400, 'BAD_REQUEST', 'Adjunta los archivos desde el selector.')
      if (typeof body.content !== 'string') throw new AccountApiError(400, 'BAD_REQUEST', 'El texto del mensaje no es válido.')
      content = body.content
    }
    if (!content.trim() && !files.length) throw new AccountApiError(400, 'EMPTY_MESSAGE', 'Escribe un mensaje o adjunta un archivo.')
    if (content.trim().length > 10000) {
      return NextResponse.json({ success: false, error: { code: 'MESSAGE_TOO_LONG', message: 'El mensaje supera los 10.000 caracteres.' } }, { status: 400 })
    }
    const attachments = await messageAttachmentService.upload(id, files)
    let message
    try { message = await messageService.sendMessage(id, user.id, content.trim(), attachments) }
    catch (error) { await messageAttachmentService.remove(attachments); throw error }

    return NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AccountApiError) return accountErrorResponse(error)
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
