import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";

export default function IndexScreen() {
  const router = useRouter();
  const isReady = useAuthStore((s) => s.isReady);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!isReady) return;

    if (isLoggedIn()) {
      router.replace("/conversations");
    } else {
      router.replace("/welcome");
    }
  }, [isReady]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.text}>Xerberus</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#ffffff",
    fontSize: 18,
    marginTop: 16,
    fontWeight: "300",
    letterSpacing: 4,
  },
});
