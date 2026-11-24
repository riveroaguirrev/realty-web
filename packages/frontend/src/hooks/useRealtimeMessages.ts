import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { authenticateRealtime, realtimeClient } from '@/services/realtime'
import { useLatestRef } from './useLatestRef'

interface UseRealtimeMessagesParams {
  conversationId?: string
  accessToken?: string | null
  onChange: () => void
  includesMessage: (id: string) => boolean
}

export const useRealtimeMessages = ({
  conversationId,
  accessToken,
  onChange,
  includesMessage,
}: UseRealtimeMessagesParams) => {
  const handlers = useLatestRef({ onChange, includesMessage })
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!conversationId || !accessToken) return

    let channel: RealtimeChannel | undefined
    let isCancelled = false

    authenticateRealtime(accessToken).then(() => {
      if (isCancelled) return
      channel = realtimeClient
        .channel(`messages:${conversationId}:${crypto.randomUUID()}`, {
          config: { postgres_changes_options: { wait: true } },
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Message' }, (payload) => {
          if (isCancelled || payload.errors?.length) return
          // RLS limits inserts and updates to participants. Deletes can carry only the message ID.
          const matches = payload.eventType === 'DELETE'
            ? typeof payload.old.id === 'string' && handlers.current.includesMessage(payload.old.id)
            : payload.new.conversationId === conversationId
          if (matches) handlers.current.onChange()
        })
        .on('system', {}, (status) => {
          if (isCancelled || status.extension !== 'postgres_changes') return
          const ready = status.status === 'ok'
          setIsLive(ready)
          if (ready) handlers.current.onChange()
        })
        .subscribe((status) => {
          if (!isCancelled && status !== 'SUBSCRIBED') setIsLive(false)
        })
    }).catch(() => { if (!isCancelled) setIsLive(false) })

    return () => {
      isCancelled = true
      if (channel) realtimeClient.removeChannel(channel)
      setIsLive(false)
    }
  }, [conversationId, accessToken, handlers])

  return isLive
}
