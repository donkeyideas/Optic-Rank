-- ============================================================
-- Support Tickets System
-- Extends contact_submissions for in-app support
-- ============================================================

-- Add user_id and category to contact_submissions
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Replies table for threaded conversations
CREATE TABLE IF NOT EXISTS public.support_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  sender_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS on support_replies
ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view replies on their tickets"
  ON public.support_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_submissions
      WHERE id = support_replies.ticket_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add replies to their tickets"
  ON public.support_replies FOR INSERT
  WITH CHECK (
    sender_role = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.contact_submissions
      WHERE id = support_replies.ticket_id
      AND user_id = auth.uid()
    )
  );

-- Users can view their own support tickets
CREATE POLICY "Users can view their own support tickets"
  ON public.contact_submissions FOR SELECT
  USING (user_id = auth.uid());

-- Users can create support tickets
CREATE POLICY "Authenticated users can create support tickets"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Index for fast user ticket lookups
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user ON public.contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON public.support_replies(ticket_id);
