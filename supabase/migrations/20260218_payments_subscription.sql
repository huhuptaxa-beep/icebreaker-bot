-- ============================================================
-- Add generations_balance to users (other fields already exist)
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS generations_balance INT NOT NULL DEFAULT 0;

-- ============================================================
-- Payments table (pack purchases)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  amount_stars INT NOT NULL,
  plan TEXT NOT NULL,
  telegram_payment_charge_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for payments"
  ON public.payments FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON public.payments(telegram_id);

-- ============================================================
-- Atomic increment helper for generations_balance
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_generations_balance(
  p_telegram_id BIGINT,
  p_amount INT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET generations_balance = generations_balance + p_amount
  WHERE telegram_id = p_telegram_id;
END;
$$;
