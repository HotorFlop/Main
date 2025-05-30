import React from "react";
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
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING } from "../constants/theme";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

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
  postOwnerId?: string; // ID of the post owner
  onDeleteComment?: (commentId: number) => void;
  onReportComment?: (commentId: number) => void; // Simplified to just pass commentId
}

export default function CommentsModal({
  visible,
  comments,
  onClose,
  addComment,
  postOwnerId,
  onDeleteComment,
  onReportComment,
}: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      addComment(newComment.trim());
      setNewComment("");
    }
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteComment?.(commentId),
        },
      ]
    );
  };

  const handleReportComment = (commentId: number) => {
    console.log("CommentsModal: handleReportComment called", commentId);
    if (onReportComment) {
      onReportComment(commentId);
    }
  };

  const canDeleteComment = (comment: Comment): boolean => {
    if (!user?.id) return false;
    // User can delete their own comments or comments on their posts
    return comment.userId.toString() === user.id || postOwnerId === user.id;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
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
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentName}>@{comment.user.name}</Text>
                    <View style={styles.commentActions}>
                      {canDeleteComment(comment) && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(comment.id)}
                          style={styles.actionButton}
                        >
                          <FontAwesome name="trash" size={14} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleReportComment(comment.id)}
                        style={styles.actionButton}
                      >
                        <FontAwesome name="flag" size={14} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
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
    </>
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
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  commentActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    padding: 4,
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
