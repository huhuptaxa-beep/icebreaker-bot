const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

export interface Conversation {
  id: string;
  girl_name: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "girl";
  text: string;
  created_at: string;
}

export interface GenerateResponse {
  suggestions: string[];
  limit_reached: boolean;
  weekly_used: number;
  weekly_limit: number;
  remaining: number;
}

/* ===========================
   CREATE CONVERSATION
=========================== */

export const createConversation = async (
  telegram_id: number,
  girl_name: string
): Promise<Conversation> => {
  const res = await fetch(`${BASE_URL}/functions/v1/create-conversation`, {
    method: "POST",
    headers,
    body: JSON.stringify({ telegram_id, girl_name }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("createConversation error:", text);
    throw new Error("Failed to create conversation");
  }

  const data = await res.json();
  return data.conversation;
};

/* ===========================
   LIST CONVERSATIONS
=========================== */

export const getConversations = async (
  telegram_id: number
): Promise<Conversation[]> => {
  const res = await fetch(`${BASE_URL}/functions/v1/list-conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ telegram_id }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("listConversations error:", text);
    throw new Error("Failed to fetch conversations");
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

/* ===========================
   GET SINGLE CONVERSATION
=========================== */

export const getConversation = async (
  conversation_id: string
): Promise<{ girl_name: string; messages: Message[] }> => {
  const res = await fetch(`${BASE_URL}/functions/v1/get-conversation`, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversation_id }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("getConversation error:", text);
    throw new Error("Failed to fetch conversation");
  }

  const data = await res.json();

  const normalizedMessages: Message[] = (data.messages || []).map(
    (msg: any) => ({
      ...msg,
      role: msg.role === "assistant" ? "user" : msg.role,
    })
  );

  return {
    girl_name: data.girl_name,
    messages: normalizedMessages,
  };
};

/* ===========================
   GENERATE
=========================== */

export const chatGenerate = async (
  conversation_id: string,
  incoming_message: string | null,
  action_type: "normal" | "reengage" | "contact" | "date",
  telegram_id: number
): Promise<GenerateResponse> => {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      conversation_id,
      incoming_message,
      action_type,
      telegram_id,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("chatGenerate error:", text);
    throw new Error("Failed to generate response");
  }

  return res.json();
};

/* ===========================
   SAVE MESSAGE
=========================== */

export const chatSave = async (
  conversation_id: string,
  selected_text: string,
  role: "user" | "girl"
): Promise<Message> => {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-save`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      conversation_id,
      selected_text,
      role,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("chatSave error:", text);
    throw new Error("Failed to save message");
  }

  const data = await res.json();

  return data.message;
};
