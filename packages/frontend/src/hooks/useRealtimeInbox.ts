import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { authenticateRealtime, realtimeClient } from '@/services/realtime'
import { useLatestRef } from './useLatestRef'

export interface IncomingMessage {
  conversationId: string
  senderId: string
  content: string
}

interface UseRealtimeInboxParams {
  accessToken?: string | null
  onNewMessage: (message: IncomingMessage) => void
}

export const useRealtimeInbox = ({ accessToken, onNewMessage }: UseRealtimeInboxParams) => {
  const onNewMessageRef = useLatestRef(onNewMessage)

  useEffect(() => {
    if (!accessToken) return

    let channel: RealtimeChannel | undefined
    let isCancelled = false

    authenticateRealtime(accessToken).then(() => {
      if (isCancelled) return
      channel = realtimeClient
        .channel(`inbox:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Message' },
          (payload) => {
            if (isCancelled || payload.errors?.length) return
            onNewMessageRef.current(payload.new as IncomingMessage)
          }
        )
        .subscribe()
    }).catch((error) => console.error('Could not subscribe to inbox updates:', error))

    return () => {
      isCancelled = true
      if (channel) realtimeClient.removeChannel(channel)
    }
  }, [accessToken, onNewMessageRef])
}
