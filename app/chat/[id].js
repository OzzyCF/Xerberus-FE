import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { createWebSocket } from "../../src/api/client";
import { fetchPendingMessages, burnMessage } from "../../src/api/messages";
import { bytesToHex } from "../../src/utils/crypto";
import PeepholeMessage from "../../src/components/PeepholeMessage";

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const publicKeyHash = useAuthStore((s) => s.publicKeyHash);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const wsRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadPendingMessages();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadPendingMessages = async () => {
    try {
      const { messages: pending } = await fetchPendingMessages(accessToken);
      const filtered = pending.filter((m) => m.conversation_id === conversationId);
      if (filtered.length > 0) {
        setMessages(filtered);
      }
    } catch (error) {
      console.log("Failed to load pending messages:", error.message);
    }
  };

  const connectWebSocket = () => {
    const ws = createWebSocket(accessToken);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message" && data.conversation_id === conversationId) {
        setMessages((prev) => [...prev, data]);
      }
    };

    ws.onerror = (error) => {
      console.log("WebSocket error:", error.message);
    };

    wsRef.current = ws;
  };

  const handleSend = () => {
    if (!inputText.trim() || !wsRef.current) return;

    // For MVP: send plaintext as hex (real E2EE comes with shared key exchange)
    const payloadHex = bytesToHex(new TextEncoder().encode(inputText.trim()));

    wsRef.current.send(
      JSON.stringify({
        action: "send",
        conversation_id: conversationId,
        encrypted_payload: payloadHex,
      })
    );

    // Optimistic: add to local list
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        conversation_id: conversationId,
        sender_hash: publicKeyHash,
        encrypted_payload: payloadHex,
        created_at: new Date().toISOString(),
      },
    ]);

    setInputText("");
  };

  const decodePayload = (hex) => {
    try {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      return "[encrypted]";
    }
  };

  const handleBurned = (messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    burnMessage(messageId, accessToken).catch(() => {});
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_hash === publicKeyHash;
    return (
      <PeepholeMessage
        text={decodePayload(item.encrypted_payload)}
        isMine={isMine}
        onRevealStart={() => setIsRevealing(true)}
        onRevealEnd={() => setIsRevealing(false)}
        onBurned={() => handleBurned(item.id)}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        scrollEnabled={!isRevealing}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message..."
          placeholderTextColor="#666666"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    backgroundColor: "#1a1a1a",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: "#1c1c2e",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: "center",
  },
  sendText: {
    color: "#0a0a0a",
    fontWeight: "600",
    fontSize: 14,
  },
});
