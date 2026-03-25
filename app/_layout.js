import "react-native-get-random-values";
import { useEffect } from "react";
import { TouchableOpacity, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/stores/authStore";

export default function RootLayout() {
  const router = useRouter();
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
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "", headerBackVisible: false }} />
        <Stack.Screen
          name="conversations"
          options={{
            title: "Xerberus",
            headerBackVisible: false,
            headerRight: () => (
              <TouchableOpacity onPress={() => router.push("/settings")}>
                <Text style={{ color: "#666666", fontSize: 22 }}>⚙</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen name="chat/[id]" options={{ title: "Chat", headerBackTitle: "Back" }} />
        <Stack.Screen name="settings" options={{ title: "Settings", headerBackTitle: "Back" }} />
      </Stack>
    </>
  );
}
