-- Таблица пользователей Telegram
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  language TEXT NOT NULL DEFAULT 'ru',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица запросов на генерацию
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  stage TEXT NOT NULL,
  girl_info TEXT NOT NULL,
  response_count INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Политики для users (публичный доступ для Telegram Mini App)
-- Так как авторизация через Telegram, а не Supabase Auth, делаем доступ через service role или публичный
CREATE POLICY "Allow public read for users" 
ON public.users 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert for users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update for users" 
ON public.users 
FOR UPDATE 
USING (true);

-- Политики для requests
CREATE POLICY "Allow public read for requests" 
ON public.requests 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert for requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (true);

-- Индексы для производительности
CREATE INDEX idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX idx_requests_user_id ON public.requests(user_id);
CREATE INDEX idx_requests_created_at ON public.requests(created_at DESC);