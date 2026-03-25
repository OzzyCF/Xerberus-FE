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

export async function freezeMessage(messageId, frozenPayload, token) {
  return apiRequest(`/messages/${messageId}/freeze`, {
    method: "PUT",
    token,
    body: { frozen_payload: frozenPayload },
  });
}

export async function burnMessage(messageId, token) {
  return apiRequest(`/messages/${messageId}`, { method: "DELETE", token });
}
