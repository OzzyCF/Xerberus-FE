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
