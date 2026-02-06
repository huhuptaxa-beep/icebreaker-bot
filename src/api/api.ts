/**
 * API сервис для работы с backend
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
  type: 'LIMIT_REACHED';
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
  const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-telegram`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Authentication failed");
  }

  return response.json();
};

/**
 * Генерация сообщений через AI
 */
export const generateMessages = async (
  request: GenerateRequest
): Promise<GenerateResponse> => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    // Проверяем, достигнут ли лимит (403 с LIMIT_REACHED)
    if (response.status === 403 && errorData.error === 'LIMIT_REACHED') {
      const limitError: LimitReachedError = {
        type: 'LIMIT_REACHED',
        weekly_limit: errorData.weekly_limit,
        weekly_used: errorData.weekly_used,
        reset_at: errorData.reset_at,
      };
      throw limitError;
    }
    
    if (response.status === 402) {
      throw new Error("Исчерпаны AI-кредиты. Обратитесь в поддержку.");
    }
    if (response.status === 401) {
      throw new Error("Необходима авторизация через Telegram.");
    }
    
    throw new Error(errorData.error || "Generation failed");
  }

  return response.json();
};

/**
 * Проверка, является ли ошибка LimitReachedError
 */
export const isLimitReachedError = (error: unknown): error is LimitReachedError => {
  return typeof error === 'object' && error !== null && (error as LimitReachedError).type === 'LIMIT_REACHED';
};
