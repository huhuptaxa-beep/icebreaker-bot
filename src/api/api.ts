/**
 * API сервис для работы с backend (Express)
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export interface TelegramUser {
  id: string;
  telegram_id: number;
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
  weekly_limit?: number;
  weekly_used?: number;
  error?: string;
}

/**
 * 🔐 Инициализация пользователя (можно вызывать 1 раз)
 */
export const authTelegram = async (userData: {
  telegram_id: number;
}): Promise<AuthResponse> => {
  const response = await fetch(`${BACKEND_URL}/user/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Auth failed");
  }

  return response.json();
};

/**
 * ✨ Генерация сообщений (С ЛИМИТАМИ)
 */
export const generateMessages = async (
  request: GenerateRequest
): Promise<GenerateResponse> => {
  const response = await fetch(`${BACKEND_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.error === "LIMIT_REACHED") {
      throw new Error("LIMIT_REACHED");
    }
    throw new Error(data.error || "Generation failed");
  }

  return data;
};
