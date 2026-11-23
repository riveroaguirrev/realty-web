-- Prisma connects as a privileged role; browser roles do not need migration metadata.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."_prisma_migrations" FROM anon, authenticated;

-- Existing installations may still have the public helper until the release script
-- replaces its policies with private.application_session_allowed().
DO $$ BEGIN
  IF to_regprocedure('public.application_session_allowed()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.application_session_allowed() FROM PUBLIC, anon;
  END IF;
END $$;
