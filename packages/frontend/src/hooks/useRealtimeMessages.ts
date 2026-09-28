import { useEffect, useRef } from 'react'
import { supabase } from '@/services/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeMessagesParams {
  conversationId: string
  onMessageReceived?: (message: any) => void
  onMessageDeleted?: (messageId: string) => void
  onMessageEdited?: (message: any) => void
}

export const useRealtimeMessages = ({
  conversationId,
  onMessageReceived,
  onMessageDeleted,
  onMessageEdited,
}: UseRealtimeMessagesParams) => {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          onMessageReceived?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          onMessageDeleted?.(payload.old.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          onMessageEdited?.(payload.new)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [conversationId, onMessageReceived, onMessageDeleted, onMessageEdited])

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    },
  }
}
