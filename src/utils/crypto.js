import nacl from "tweetnacl";
import * as Crypto from "expo-crypto";

// --- Hex encoding helpers ---

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// --- Keypair generation ---

export async function generateKeypair() {
  const keyPair = nacl.sign.keyPair();
  const publicKey = bytesToHex(keyPair.publicKey);
  const privateKey = bytesToHex(keyPair.secretKey);

  const hashBytes = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    keyPair.publicKey
  );
  const publicKeyHash = bytesToHex(new Uint8Array(hashBytes));

  return { publicKey, privateKey, publicKeyHash };
}

// --- Signing ---

export function signMessage(message, privateKeyHex) {
  const privateKey = hexToBytes(privateKeyHex);
  const messageBytes = new TextEncoder().encode(message);
  const signed = nacl.sign.detached(messageBytes, privateKey);
  return bytesToHex(signed);
}

// --- Message encryption (X25519 + XSalsa20-Poly1305) ---

export function encryptMessage(plaintext, sharedKey) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = new TextEncoder().encode(plaintext);
  const encrypted = nacl.secretbox(messageBytes, nonce, sharedKey);

  // Prepend nonce to ciphertext
  const full = new Uint8Array(nonce.length + encrypted.length);
  full.set(nonce);
  full.set(encrypted, nonce.length);
  return bytesToHex(full);
}

export function decryptMessage(encryptedHex, sharedKey) {
  const full = hexToBytes(encryptedHex);
  const nonce = full.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = full.slice(nacl.secretbox.nonceLength);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedKey);

  if (!decrypted) {
    throw new Error("Decryption failed");
  }
  return new TextDecoder().decode(decrypted);
}

export { bytesToHex, hexToBytes };
