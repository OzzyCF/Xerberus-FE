import { apiRequest } from "./client";

export function registerDevice(publicKey) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: { public_key: publicKey },
  });
}

export function requestChallenge(publicKeyHash) {
  return apiRequest("/auth/challenge", {
    method: "POST",
    body: { public_key_hash: publicKeyHash },
  });
}

export function verifyChallenge(publicKeyHash, nonce, signature) {
  return apiRequest("/auth/verify", {
    method: "POST",
    body: { public_key_hash: publicKeyHash, nonce, signature },
  });
}
