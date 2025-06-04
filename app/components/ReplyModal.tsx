import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING } from "../constants/theme";
import { useRouter } from "expo-router";
import { DMService } from "../lib/dmService";

const DEFAULT_PROFILE_PIC = require("../assets/default.jpg");

interface ReplyModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: number;
    title: string;
    description?: string;
    imageUrl?: string;
    user: {
      id: string;
      username: string;
      profile_pic?: string;
    };
  } | null;
  currentUserId?: string;
}

export default function ReplyModal({
  visible,
  onClose,
  post,
  currentUserId,
}: ReplyModalProps) {
  const [messageText, setMessageText] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!messageText.trim() || !post || !currentUserId) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    try {
      // Send as a DM
      const messageContent = `Regarding your post "${post.title}": ${messageText.trim()}`;
      
      await DMService.sendMessage(
        currentUserId,
        post.user.id,
        messageContent
      );

      Alert.alert("Success", "Message sent successfully!", [
        { 
          text: "View Chat", 
          onPress: () => {
            handleClose();
            router.push({
              pathname: "/chat",
              params: {
                userId: post.user.id,
                username: post.user.username,
                profilePic: post.user.profile_pic || "",
              },
            });
          }
        },
        { text: "OK", onPress: handleClose }
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleClose = () => {
    setMessageText("");
    onClose();
  };

  const getProfilePicUri = (profilePic?: string) => {
    if (!profilePic) {
      return DEFAULT_PROFILE_PIC;
    }
    return { uri: profilePic };
  };

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Message @{post.user.username}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          <View style={styles.postPreview}>
            <View style={styles.userInfo}>
              <Image
                source={getProfilePicUri(post.user.profile_pic)}
                style={styles.profilePic}
              />
              <Text style={styles.username}>@{post.user.username}</Text>
            </View>
            <Text style={styles.postTitle} numberOfLines={2}>
              {post.title}
            </Text>
            {post.imageUrl && (
              <Image
                source={{ uri: post.imageUrl }}
                style={styles.postImage}
              />
            )}
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your message:</Text>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Write your message about this post..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !messageText.trim() && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!messageText.trim()}
          >
            <FontAwesome name="paper-plane" size={16} color="white" style={styles.submitIcon} />
            <Text style={styles.submitText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  postPreview: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.sm,
    backgroundColor: "#E1E1E1",
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  postTitle: {
    fontSize: 16,
    fontFamily: FONTS.mandali,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  postImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    resizeMode: "cover",
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: SPACING.md,
    fontFamily: FONTS.mandali,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitIcon: {
    marginRight: SPACING.sm,
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
  },
}); 