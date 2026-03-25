import { apiRequest } from "./client";

export function sendMessage(conversationId, encryptedPayload, token) {
  return apiRequest("/messages", {
    method: "POST",
    token,
    body: { conversation_id: conversationId, encrypted_payload: encryptedPayload },
  });
}

export function fetchPendingMessages(token) {
  return apiRequest("/messages", { token });
}

export async function burnMessage(messageId, token) {
  const API_URL = "http://192.168.0.35:8000";
  await fetch(`${API_URL}/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
