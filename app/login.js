import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { requestChallenge, verifyChallenge } from "../src/api/auth";
import { signMessage } from "../src/utils/crypto";

export default function LoginScreen() {
  const router = useRouter();
  const publicKeyHash = useAuthStore((s) => s.publicKeyHash);
  const privateKey = useAuthStore((s) => s.privateKey);
  const saveAccessToken = useAuthStore((s) => s.saveAccessToken);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!publicKeyHash || !privateKey) {
      alert("No keypair found. Please register first.");
      router.replace("/welcome");
      return;
    }

    setIsLoading(true);
    try {
      const { nonce } = await requestChallenge(publicKeyHash);
      const signature = signMessage(nonce, privateKey);
      const { access_token } = await verifyChallenge(publicKeyHash, nonce, signature);

      await saveAccessToken(access_token);
      router.replace("/conversations");
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>
          Authenticate with your device keypair
        </Text>
        {publicKeyHash && (
          <Text style={styles.hash}>
            {publicKeyHash.slice(0, 8)}...{publicKeyHash.slice(-8)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.buttonText}>Authenticate</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "space-between",
    padding: 32,
    paddingBottom: 64,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    color: "#666666",
    fontSize: 14,
    marginBottom: 24,
  },
  hash: {
    color: "#333333",
    fontSize: 12,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "600",
  },
});
