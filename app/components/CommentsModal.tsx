import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING } from "../constants/theme";
import { useState } from "react";

interface Comment {
  id: number;
  comment: string;
  created_at: string;
  userId: number;
  sharedItemId: number;
  user: {
    name: string;
  };
}

interface CommentsModalProps {
  visible: boolean;
  comments: Comment[];
  onClose: () => void;
  addComment: (comment: string) => void;
}

export default function CommentsModal({
  visible,
  comments,
  onClose,
  addComment,
}: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      addComment(newComment.trim());
      setNewComment("");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.commentsContainer}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Text style={styles.commentName}>@{comment.user.name}</Text>
                <Text style={styles.commentText}>{comment.comment}</Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(comment.created_at)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitComment}
            >
              <Text style={styles.submitText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    height: "70%",
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
  commentsContainer: {
    flex: 1,
  },
  commentItem: {
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  commentName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    minHeight: 40,
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    fontFamily: FONTS.mandali,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  submitText: {
    color: "white",
    fontWeight: "600",
    fontFamily: FONTS.mandali,
  },
});
