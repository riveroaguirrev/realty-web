import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { authenticateRealtime, realtimeClient } from '@/services/realtime'
import { useLatestRef } from './useLatestRef'

interface UseRealtimeMessagesParams {
  conversationId?: string
  accessToken?: string | null
  onChange: () => void
}

export const useRealtimeMessages = ({
  conversationId,
  accessToken,
  onChange,
}: UseRealtimeMessagesParams) => {
  const onChangeRef = useLatestRef(onChange)

  useEffect(() => {
    if (!conversationId || !accessToken) return

    const handleChange = (payload: { errors?: unknown }) => {
      if (!payload.errors) onChangeRef.current()
    }

    let channel: RealtimeChannel | undefined
    let isCancelled = false

    authenticateRealtime(accessToken).then(() => {
      if (isCancelled) return
      channel = realtimeClient
        .channel(`messages:${conversationId}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'Message',
            filter: `conversationId=eq.${conversationId}`,
          },
          handleChange
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'Message',
            filter: `conversationId=eq.${conversationId}`,
          },
          handleChange
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'Message' },
          handleChange
        )
        .subscribe()
    })

    return () => {
      isCancelled = true
      if (channel) realtimeClient.removeChannel(channel)
    }
  }, [conversationId, accessToken, onChangeRef])
}
