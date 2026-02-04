/**
 * API сервис для работы с backend
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is not defined");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined");
}

export interface TelegramUser {
  id: string;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language: string;
  created_at: string;
  last_active_at: string;
}

export interface AuthResponse {
  success: boolean;
  user: TelegramUser;
  is_new: boolean;
  error?: string;
}

export interface GenerateRequest {
  telegram_id: number;
  platform: string;
  stage: string;
  girl_info: string;
}

export interface GenerateResponse {
  messages: string[];
  weekly_limit: number;
  weekly_used: number;
}

export interface LimitReachedError {
  type: "LIMIT_REACHED";
  weekly_limit: number;
  weekly_used: number;
  reset_at: string;
}

/**
 * Авторизация через Telegram
 */
export const authTelegram = async (userData: {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language?: string;
}): Promise<AuthResponse> => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/auth-telegram`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(userData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Authentication failed");
  }

  return data;
};

/**
 * Генерация сообщений через AI
 */
export const generateMessages = async (
  request: GenerateRequest
): Promise<GenerateResponse> => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(request),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403 && data.error === "LIMIT_REACHED") {
      throw {
        type: "LIMIT_REACHED",
        weekly_limit: data.weekly_limit,
        weekly_used: data.weekly_used,
        reset_at: data.reset_at,
      } as LimitReachedError;
    }

    if (response.status === 402) {
      throw new Error("Исчерпаны AI-кредиты");
    }

    if (response.status === 401) {
      throw new Error("Необходима авторизация");
    }

    throw new Error(data.error || "Generation failed");
  }

  return data;
};

export const isLimitReachedError = (
  error: unknown
): error is LimitReachedError => {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as LimitReachedError).type === "LIMIT_REACHED"
  );
};
