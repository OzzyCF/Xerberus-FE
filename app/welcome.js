import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { registerDevice } from "../src/api/auth";
import { generateKeypair } from "../src/utils/crypto";

export default function WelcomeScreen() {
  const router = useRouter();
  const saveKeypair = useAuthStore((s) => s.saveKeypair);

  const handleGetStarted = async () => {
    try {
      const { publicKey, privateKey, publicKeyHash } = await generateKeypair();

      await registerDevice(publicKey);
      await saveKeypair(publicKey, privateKey, publicKeyHash);

      router.replace("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>XERBERUS</Text>
        <Text style={styles.subtitle}>Private conversations{"\n"}that cease to exist.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
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
