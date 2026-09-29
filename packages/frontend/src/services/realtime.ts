import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let currentAccessToken: string | null = null

// Login goes through our backend, so this client has no Supabase Auth session.
// The token provider makes Realtime join channels as the logged-in advisor
// (RLS applies) instead of falling back to the anonymous key.
export const realtimeClient = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => currentAccessToken ?? supabaseAnonKey,
})

export const authenticateRealtime = async (accessToken: string) => {
  currentAccessToken = accessToken
  await realtimeClient.realtime.setAuth(accessToken)
}
