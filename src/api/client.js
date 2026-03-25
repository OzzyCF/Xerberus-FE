const API_URL = "http://localhost:8000";

export async function apiRequest(endpoint, options = {}) {
  const { token, method = "GET", body } = options;

  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
