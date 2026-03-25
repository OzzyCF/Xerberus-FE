import { useAuthStore } from "../stores/authStore";
import { requestChallenge, verifyChallenge } from "./auth";
import { signMessage } from "../utils/crypto";

// Use your Mac's local IP so the phone can reach the backend
export const API_URL = "http://192.168.0.35:8000";

async function refreshToken() {
  const { publicKeyHash, privateKey, saveAccessToken } = useAuthStore.getState();
  if (!publicKeyHash || !privateKey) return null;

  const { nonce } = await requestChallenge(publicKeyHash);
  const signature = signMessage(nonce, privateKey);
  const { access_token } = await verifyChallenge(publicKeyHash, nonce, signature);
  await saveAccessToken(access_token);
  return access_token;
}

export async function apiRequest(endpoint, options = {}) {
  let { token, method = "GET", body } = options;

  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (response.status === 401 && token) {
    const newToken = await refreshToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Request failed: ${response.status}`);
  }

  return data;
}

export function createWebSocket(token) {
  const ws = new WebSocket(`${API_URL.replace("http", "ws")}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ token }));
  };

  return ws;
}
