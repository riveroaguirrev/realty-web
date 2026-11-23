-- Row Level Security and Realtime publication for messaging.
-- Idempotent: safe to run after every `db:push`.
-- The backend connects as a privileged role (Prisma / service role) and bypasses RLS;
-- these policies only govern browser clients authenticated with a Supabase JWT.

BEGIN;

-- Keep privileged lookups outside the schemas exposed by the Data API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Tokens from a replaced/unapproved/recovery session must not bypass the API.
CREATE OR REPLACE FUNCTION private.application_session_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."AccountSession" s
    JOIN public."Advisor" a ON a.id = s."advisorId"
    JOIN auth.users u ON u.id::text = a.id
    JOIN auth.sessions native ON native.id = s.id AND native.user_id = u.id
    WHERE a.id = auth.uid()::text AND s.id::text = auth.jwt()->>'session_id'
      AND s."revokedAt" IS NULL AND u.email_confirmed_at IS NOT NULL
      AND a.status NOT IN ('BLOCKED', 'INACTIVE')
      AND (a."userRole" = 'BUYER' OR a."activeSessionId" = s.id)
  );
$$;
REVOKE ALL ON FUNCTION private.application_session_allowed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.application_session_allowed() TO authenticated;

-- Application data is served by Prisma; only messaging SELECT is exposed to Realtime.
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

  -- Also protects installs that created the new table with db push.
  IF to_regclass('public."PropertyImage"') IS NOT NULL THEN
    ALTER TABLE public."PropertyImage" ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public."PropertyImage" FROM anon, authenticated;
  END IF;
END $$;

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "Conversation", "ConversationParticipant", "Message" FROM anon, authenticated;
GRANT SELECT ON "Conversation", "ConversationParticipant", "Message" TO authenticated;

DROP POLICY IF EXISTS participant_reads_own_rows ON "ConversationParticipant";
CREATE POLICY participant_reads_own_rows ON "ConversationParticipant"
  FOR SELECT TO authenticated
  USING (private.application_session_allowed() AND "advisorId" = auth.uid()::text);

DROP POLICY IF EXISTS participant_reads_conversation ON "Conversation";
CREATE POLICY participant_reads_conversation ON "Conversation"
  FOR SELECT TO authenticated
  USING (private.application_session_allowed() AND EXISTS (
    SELECT 1 FROM "ConversationParticipant" p
    WHERE p."conversationId" = "Conversation"."id" AND p."advisorId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS participant_reads_messages ON "Message";
CREATE POLICY participant_reads_messages ON "Message"
  FOR SELECT TO authenticated
  USING (private.application_session_allowed() AND EXISTS (
    SELECT 1 FROM "ConversationParticipant" p
    WHERE p."conversationId" = "Message"."conversationId" AND p."advisorId" = auth.uid()::text
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Message'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
  END IF;
END $$;

-- Policies now use the private helper; remove the old RPC if previously installed.
DROP FUNCTION IF EXISTS public.application_session_allowed();

COMMIT;
