import { apiRequest } from "./client";

export function createInvite(token) {
  return apiRequest("/invites", { method: "POST", token });
}

export function acceptInvite(inviteToken, authToken) {
  return apiRequest("/invites/accept", {
    method: "POST",
    token: authToken,
    body: { token: inviteToken },
  });
}
