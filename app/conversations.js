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
    // For now, we don't have a dedicated conversations endpoint
    // This will be enhanced later — for now it shows connected contacts
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

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
          <Text style={styles.emptyHint}>
            Create an invite and share it with someone you trust.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <Text style={styles.conversationText}>{item.id.slice(0, 12)}...</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
});
