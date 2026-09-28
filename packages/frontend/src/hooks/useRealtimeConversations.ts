import { useEffect, useRef } from 'react'
import { supabase } from '@/services/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeConversationsParams {
  advisorId?: string
  onConversationUpdated?: (conversation: any) => void
  onNewMessage?: (message: any) => void
}

export const useRealtimeConversations = ({
  advisorId,
  onConversationUpdated,
  onNewMessage,
}: UseRealtimeConversationsParams) => {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!advisorId) return

    const channel = supabase
      .channel('conversations:all')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Conversation',
        },
        (payload) => {
          onConversationUpdated?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
        },
        (payload) => {
          onNewMessage?.(payload.new)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [advisorId, onConversationUpdated, onNewMessage])

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    },
  }
}
