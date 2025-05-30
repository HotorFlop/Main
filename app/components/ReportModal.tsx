import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING } from "../constants/theme";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => void;
  title: string;
}

export default function ReportModal({
  visible,
  onClose,
  onSubmit,
  title,
}: ReportModalProps) {
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  const submitReport = () => {
    if (!reportReason.trim()) {
      Alert.alert("Error", "Please select a reason for reporting.");
      return;
    }

    onSubmit(reportReason, reportDescription);
    setReportReason("");
    setReportDescription("");
    onClose();
  };

  const handleClose = () => {
    setReportReason("");
    setReportDescription("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason for reporting:</Text>
            {["Spam", "Harassment", "Inappropriate Content", "False Information", "Other"].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  reportReason === reason && styles.reasonOptionSelected
                ]}
                onPress={() => setReportReason(reason)}
              >
                <Text style={[
                  styles.reasonText,
                  reportReason === reason && styles.reasonTextSelected
                ]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.descriptionInput}
            value={reportDescription}
            onChangeText={setReportDescription}
            placeholder="Additional details (optional)..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitReport}
            >
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
    marginBottom: 15,
    textAlign: "center",
  },
  reasonContainer: {
    marginBottom: 15,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
    marginBottom: 10,
  },
  reasonOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: COLORS.accent,
    backgroundColor: `${COLORS.accent}10`,
  },
  reasonText: {
    fontSize: 14,
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  reasonTextSelected: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontFamily: FONTS.mandali,
    fontSize: 14,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: "top",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: FONTS.mandali,
    color: "#666",
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ff4444",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: FONTS.mandali,
    color: "white",
    fontWeight: "600",
  },
});