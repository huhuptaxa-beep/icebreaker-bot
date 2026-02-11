const BASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  last_message?: string;
}

export interface Message {
  id: string;
  role: "user" | "girl";
  text: string;
  created_at: string;
}

export interface GenerateResponse {
  suggestions: string[];
}

export const createConversation = async (
  telegram_id: number
): Promise<Conversation> => {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegram_id }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
};

export const getConversations = async (
  telegram_id: number
): Promise<Conversation[]> => {
  const res = await fetch(
    `${BASE_URL}/functions/v1/chat-conversations?telegram_id=${telegram_id}`
  );
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
};

export const getConversation = async (
  conversation_id: string
): Promise<{ conversation: Conversation; messages: Message[] }> => {
  const res = await fetch(
    `${BASE_URL}/functions/v1/chat-conversations?id=${conversation_id}`
  );
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
};

export const chatGenerate = async (
  conversation_id: string,
  message: string | null,
  action: "normal" | "reengage" | "contact" | "date"
): Promise<GenerateResponse> => {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id, message, action }),
  });
  if (!res.ok) throw new Error("Failed to generate response");
  return res.json();
};

export const chatSave = async (
  conversation_id: string,
  text: string,
  role: "user" | "girl",
  girl_message?: string
): Promise<Message> => {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id, text, role, girl_message }),
  });
  if (!res.ok) throw new Error("Failed to save message");
  return res.json();
};
