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
  available_actions?: string[];
  limit_reached: boolean;
  free_remaining: number;
  paid_remaining: number;
  error?: string;
}

/* ===========================
   TELEGRAM INIT DATA
=========================== */

export const getInitData = (): string => {
  return (window as any)?.Telegram?.WebApp?.initData ?? "";
};

/* ===========================
   CREATE CONVERSATION
=========================== */

export const createConversation = async (
  girl_name: string
): Promise<Conversation> => {
  const res = await fetch(`${BASE_URL}/functions/v1/create-conversation`, {
    method: "POST",
    headers,
    body: JSON.stringify({ girl_name, init_data: getInitData() }),
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

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await fetch(`${BASE_URL}/functions/v1/list-conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ init_data: getInitData() }),
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
    body: JSON.stringify({ conversation_id, init_data: getInitData() }),
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
  action_type: "normal" | "reengage" | "contact" | "date" | "opener",
  facts?: string
): Promise<GenerateResponse> => {
  const res = await fetch(`${BASE_URL}/functions/v1/chat-generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      conversation_id,
      incoming_message,
      action_type,
      init_data: getInitData(),
      facts: facts || null,
    }),
  });

  if (!res.ok) {
    let errorMsg = "Failed to generate response";
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch {}
    console.error("chatGenerate error:", errorMsg);
    return {
      suggestions: [],
      limit_reached: false,
      free_remaining: 0,
      paid_remaining: 0,
      error: errorMsg,
    };
  }

  return res.json();
};

/* ===========================
   DELETE CONVERSATION
=========================== */

export const deleteConversation = async (
  conversation_id: string
): Promise<void> => {
  const res = await fetch(`${BASE_URL}/functions/v1/delete-conversation`, {
    method: "POST",
    headers,
    body: JSON.stringify({ conversation_id, init_data: getInitData() }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("deleteConversation error:", text);
    throw new Error("Failed to delete conversation");
  }
};

/* ===========================
   CREATE INVOICE
=========================== */

export interface SubscriptionInfo {
  free_remaining: number;
  paid_remaining: number;
  free_reset_at: string;
}

export const createInvoice = async (
  plan: "pack_30" | "pack_100" | "pack_200"
): Promise<{ invoice_link: string }> => {
  const res = await fetch(`${BASE_URL}/functions/v1/create-invoice`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan, init_data: getInitData() }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("createInvoice error:", text);
    throw new Error("Failed to create invoice");
  }

  return res.json();
};

/* ===========================
   GET SUBSCRIPTION
=========================== */

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const res = await fetch(`${BASE_URL}/functions/v1/get-subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify({ init_data: getInitData() }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("getSubscription error:", text);
    return {
      free_remaining: 7,
      paid_remaining: 0,
      free_reset_at: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    };
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
      init_data: getInitData(),
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
