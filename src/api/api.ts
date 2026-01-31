/**
 * API сервис для работы с backend
 */

// 🔥 ВАЖНО: это URL твоего backend (Express / Vercel)
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('❌ VITE_API_URL is not defined');
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
 * Генерация сообщений
 */
export const generateMessages = async (
  request: GenerateRequest
): Promise<GenerateResponse> => {
  const response = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();

    if (error.error === "LIMIT_REACHED") {
      throw new Error("LIMIT_REACHED");
    }

    throw new Error(error.error || "Generation failed");
  }

  return response.json();
};
