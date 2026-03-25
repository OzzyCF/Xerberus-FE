import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Share,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { createInvite, acceptInvite } from "../src/api/invites";
import { apiRequest } from "../src/api/client";

export default function ConversationsScreen() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [conversations, setConversations] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [accessToken])
  );

  const loadConversations = async () => {
    // Will be enhanced with a dedicated endpoint later
  };

  const handleCreateInvite = async () => {
    try {
      const { token } = await createInvite(accessToken);
      const inviteLink = `xerberus://invite/${token}`;

      await Share.share({
        message: `Join me on Xerberus: ${inviteLink}`,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const handlePasteInvite = () => {
    Alert.prompt("Accept Invite", "Paste the invite token:", async (token) => {
      if (!token) return;
      try {
        const { conversation_id } = await acceptInvite(token.trim(), accessToken);
        router.push(`/chat/${conversation_id}`);
      } catch (error) {
        alert(error.message);
      }
    });
  };

  const handleMockContact = async () => {
    try {
      const data = await apiRequest("/dev/mock-contact", {
        method: "POST",
        token: accessToken,
      });
      setConversations((prev) => [
        ...prev,
        { id: data.conversation_id, mockHash: data.mock_hash },
      ]);
      router.push(`/chat/${data.conversation_id}`);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversations</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateInvite}>
          <Text style={styles.actionText}>Create Invite</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handlePasteInvite}
        >
          <Text style={[styles.actionText, styles.secondaryText]}>Accept Invite</Text>
        </TouchableOpacity>
      </View>

      {conversations.length > 0 && (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <Text style={styles.conversationText}>
                {item.id.slice(0, 12)}...
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {conversations.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
          <Text style={styles.emptyHint}>
            Create an invite and share it with someone you trust.
          </Text>
        </View>
      )}

      {/* Dev tools — remove before production */}
      <TouchableOpacity style={styles.devButton} onPress={handleMockContact}>
        <Text style={styles.devText}>[ DEV ] Create mock contact + chat</Text>
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
  header: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#333333",
  },
  actionText: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryText: {
    color: "#ffffff",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666666",
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    color: "#333333",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  conversationItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  conversationText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "monospace",
  },
  devButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ff6600",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 32,
  },
  devText: {
    color: "#ff6600",
    fontSize: 13,
    fontWeight: "600",
  },
});
