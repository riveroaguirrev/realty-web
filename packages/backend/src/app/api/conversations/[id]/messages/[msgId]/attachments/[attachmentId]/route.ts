import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/auth-route'
import { requireUser } from '@/middleware/auth'
import { conversationService } from '@/services/conversation.service'
import { ApiError } from '@/utils/errors'
import { messageService } from '@/services/message.service'
import { messageAttachmentService, readAttachments } from '@/services/messageAttachment.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; msgId: string; attachmentId: string }> }) {
  try {
    const user = await requireUser(request)
    const { id, msgId, attachmentId } = await params
    const participant = await conversationService.isParticipant(id, user.id)
    if (!participant) throw new ApiError(403, 'FORBIDDEN', 'Solo los participantes pueden abrir los adjuntos.')
    const message = await messageService.getMessage(msgId)
    if (!message || message.conversationId !== id) throw new ApiError(404, 'NOT_FOUND', 'No encontramos este archivo.')
    const file = readAttachments(message.attachments).find(item => item.id === attachmentId)
    if (!file) throw new ApiError(404, 'NOT_FOUND', 'No encontramos este archivo.')
    const url = await messageAttachmentService.signedUrl(file, false)
    const downloadUrl = file.type.startsWith('image/') ? await messageAttachmentService.signedUrl(file, true) : url
    return NextResponse.json({ success: true, data: { url, downloadUrl } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return errorResponse(error) }
}
