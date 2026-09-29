-- Row Level Security and Realtime publication for messaging.
-- Idempotent: safe to run after every `db:push`.
-- The backend connects as a privileged role (Prisma / service role) and bypasses RLS;
-- these policies only govern browser clients authenticated with a Supabase JWT.

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "Conversation", "ConversationParticipant", "Message" FROM anon, authenticated;
GRANT SELECT ON "Conversation", "ConversationParticipant", "Message" TO authenticated;

DROP POLICY IF EXISTS participant_reads_own_rows ON "ConversationParticipant";
CREATE POLICY participant_reads_own_rows ON "ConversationParticipant"
  FOR SELECT TO authenticated
  USING ("advisorId" = auth.uid()::text);

DROP POLICY IF EXISTS participant_reads_conversation ON "Conversation";
CREATE POLICY participant_reads_conversation ON "Conversation"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "ConversationParticipant" p
    WHERE p."conversationId" = "Conversation"."id" AND p."advisorId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS participant_reads_messages ON "Message";
CREATE POLICY participant_reads_messages ON "Message"
  FOR SELECT TO authenticated
  USING (EXISTS (
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
