-- Deny browser access by default before installing the Realtime SELECT policies.
-- This migration also works before Supabase Auth has created auth.sessions.
DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['Organization','InviteCode','Advisor','AccountSession','AuthChallenge','AuthRateLimit',
    'Property','Requirement','Match','CommissionStructure','Notification','Conversation',
    'ConversationParticipant','Message','Transaction','Review','ActivityLog','SavedSearch','Favorite']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', target);
  END LOOP;
END $$;
