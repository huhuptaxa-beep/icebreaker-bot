-- Add summary fields to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ;

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id                         BIGSERIAL PRIMARY KEY,
  telegram_id                BIGINT NOT NULL,
  conversation_id            UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  action_type                TEXT,
  input_tokens               INT NOT NULL DEFAULT 0,
  output_tokens              INT NOT NULL DEFAULT 0,
  cache_read_input_tokens    INT NOT NULL DEFAULT 0,
  cache_creation_input_tokens INT NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only service role can access usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
