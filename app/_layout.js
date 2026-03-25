import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/stores/authStore";

export default function RootLayout() {
  const loadCredentials = useAuthStore((s) => s.loadCredentials);

  useEffect(() => {
    loadCredentials();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#ffffff",
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      />
    </>
  );
}
