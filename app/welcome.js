import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { registerDevice, requestChallenge, verifyChallenge } from "../src/api/auth";
import { generateKeypair, signMessage } from "../src/utils/crypto";

export default function WelcomeScreen() {
  const router = useRouter();
  const saveKeypair = useAuthStore((s) => s.saveKeypair);
  const saveAccessToken = useAuthStore((s) => s.saveAccessToken);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      // Generate keypair
      const { publicKey, privateKey, publicKeyHash } = await generateKeypair();

      // Register with backend
      await registerDevice(publicKey);
      await saveKeypair(publicKey, privateKey, publicKeyHash);

      // Immediately login (challenge-response)
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
        <Text style={styles.title}>XERBERUS</Text>
        <Text style={styles.subtitle}>Private conversations{"\n"}that cease to exist.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGetStarted} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.buttonText}>Get Started</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.loginText}>Already registered? Sign in</Text>
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
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 8,
    marginBottom: 24,
  },
  subtitle: {
    color: "#666666",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
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
  loginLink: {
    marginTop: 16,
    alignItems: "center",
  },
  loginText: {
    color: "#666666",
    fontSize: 14,
  },
});
