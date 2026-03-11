-- Conversation progression refactor:
-- move to explicit channel counters and separate user/girl timestamps.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_user_message_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_girl_message_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS message_count_tinder INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message_count_tg INTEGER NOT NULL DEFAULT 0;

-- Best-effort backfill for existing rows.
UPDATE public.conversations
SET
  last_user_message_at = COALESCE(last_user_message_at, last_message_timestamp),
  last_girl_message_at = COALESCE(last_girl_message_at, last_message_timestamp),
  message_count_tinder = COALESCE(message_count_tinder, phase_message_count, 0),
  message_count_tg = COALESCE(message_count_tg, 0);

COMMENT ON COLUMN public.conversations.last_user_message_at IS 'Timestamp of latest user message saved via chat-save';
COMMENT ON COLUMN public.conversations.last_girl_message_at IS 'Timestamp of latest girl message saved via chat-save; primary source for freshness';
COMMENT ON COLUMN public.conversations.message_count_tinder IS 'Total saved messages while channel=app';
COMMENT ON COLUMN public.conversations.message_count_tg IS 'Total saved messages while channel=telegram';
