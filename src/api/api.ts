/**
 * API сервис для работы с backend
 */

// 👉 URL твоего backend (Vercel или localhost)
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("❌ VITE_API_URL is not defined");
}

// =====================
// TYPES
// =====================

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

// =====================
// GENERATE MESSAGES
// =====================

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

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid server response");
  }

  if (!response.ok) {
    // лимит
    if (data?.error === "LIMIT_REACHED") {
      throw new Error("LIMIT_REACHED");
    }

    throw new Error(data?.error || "Generation failed");
  }

  return data;
};
