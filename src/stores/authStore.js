import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const KEYS = {
  PUBLIC_KEY: "xerberus_public_key",
  PRIVATE_KEY: "xerberus_private_key",
  PUBLIC_KEY_HASH: "xerberus_public_key_hash",
  ACCESS_TOKEN: "xerberus_access_token",
};

export const useAuthStore = create((set, get) => ({
  publicKey: null,
  privateKey: null,
  publicKeyHash: null,
  accessToken: null,
  isReady: false,

  // Load saved credentials from secure storage on app start
  loadCredentials: async () => {
    const publicKey = await SecureStore.getItemAsync(KEYS.PUBLIC_KEY);
    const privateKey = await SecureStore.getItemAsync(KEYS.PRIVATE_KEY);
    const publicKeyHash = await SecureStore.getItemAsync(KEYS.PUBLIC_KEY_HASH);
    const accessToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);

    set({ publicKey, privateKey, publicKeyHash, accessToken, isReady: true });
  },

  // Save keypair after generation
  saveKeypair: async (publicKey, privateKey, publicKeyHash) => {
    await SecureStore.setItemAsync(KEYS.PUBLIC_KEY, publicKey);
    await SecureStore.setItemAsync(KEYS.PRIVATE_KEY, privateKey);
    await SecureStore.setItemAsync(KEYS.PUBLIC_KEY_HASH, publicKeyHash);
    set({ publicKey, privateKey, publicKeyHash });
  },

  // Save JWT after login
  saveAccessToken: async (token) => {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
    set({ accessToken: token });
  },

  // Clear everything (logout / self-destruct)
  clearAll: async () => {
    await SecureStore.deleteItemAsync(KEYS.PUBLIC_KEY);
    await SecureStore.deleteItemAsync(KEYS.PRIVATE_KEY);
    await SecureStore.deleteItemAsync(KEYS.PUBLIC_KEY_HASH);
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    set({ publicKey: null, privateKey: null, publicKeyHash: null, accessToken: null });
  },

  isLoggedIn: () => {
    const { publicKeyHash, accessToken } = get();
    return !!(publicKeyHash && accessToken);
  },
}));
