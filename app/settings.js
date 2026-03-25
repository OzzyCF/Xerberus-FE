import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";

export default function SettingsScreen() {
  const router = useRouter();
  const publicKeyHash = useAuthStore((s) => s.publicKeyHash);
  const clearAll = useAuthStore((s) => s.clearAll);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "This will remove your keypair from this device. You cannot recover it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await clearAll();
            router.replace("/welcome");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Identity</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Key Hash</Text>
          <Text style={styles.value}>
            {publicKeyHash ? `${publicKeyHash.slice(0, 12)}...${publicKeyHash.slice(-8)}` : "—"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Tier</Text>
          <Text style={styles.value}>Trial</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: "#4CAF50" }]}>Active</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>0.1.0 (MVP)</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out & Delete Keypair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    padding: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: "#666666",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
  },
  value: {
    color: "#666666",
    fontSize: 15,
    fontFamily: "monospace",
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 48,
  },
  logoutText: {
    color: "#ff3b30",
    fontSize: 15,
    fontWeight: "600",
  },
});
