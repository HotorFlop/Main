import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../lib/supabase";

interface User {
  id: string;
  name: string;
  profile_pic: string;
}

export default function AccountCenter() {
  const { user } = useAuth();
  const router = useRouter();

  // State variables
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);

  // Fetch user details from Supabase
  const fetchUserDetails = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("User") // ✅ Correct table name
      .select("id, name, username, password, profile_pic")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user details:", error);
      return;
    }

    setFullName(data.name);
    setUsername(data.username);
    setProfilePic(data.profile_pic);
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  // ✅ Request Permission to Access iPhone Photos
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please enable photo library access in settings."
      );
      return false;
    }
    return true;
  };

  // ✅ Open iPhone Photo Library to Pick an Image
  const pickImage = async () => {
    try {
      // ✅ Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable photo access in settings."
        );
        return;
      }

      console.log("Opening photo library...");

      // ✅ Correct mediaTypes usage
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], // 🔥 Fix: Corrected for expo-image-picker@16.0.6
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("User canceled photo selection.");
        return;
      }

      const base64 = result.assets[0].base64;
      if (!base64) return;

      // ✅ Confirm before uploading
      Alert.alert(
        "Confirm Upload",
        "Do you want to upload this profile picture?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upload",
            onPress: () => uploadProfilePicture(base64),
          },
        ]
      );
    } catch (error) {
      console.error("Error opening photo library:", error);
      Alert.alert("Error", "Failed to open the photo library.");
    }
  };

  // Upload image to Supabase storage
  const uploadProfilePicture = async (base64: string) => {
    if (!user?.id) return;

    const filePath = `avatars/${user.id}.jpg`;
    const { error } = await supabase.storage
      .from("Images")
      .upload(filePath, decode(base64), {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload profile picture.");
      return;
    }

    console.log(filePath);
    const { data } = supabase.storage.from("Images").getPublicUrl(filePath);
    if (data?.publicUrl) {
      const imageUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
      setProfilePic(imageUrl);
      await updateProfilePicUrl(imageUrl);
      setUploadModalVisible(false);
    }
  };

  // Update profile_pic field in the User table
  const updateProfilePicUrl = async (url: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from("User")
      .update({ profile_pic: url })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating profile picture:", error);
      Alert.alert("Error", "Failed to update profile picture.");
    } else {
      // Alert.alert("Success", "Profile picture updated!");
    }
  };
  // Handle account updates
  const handleSaveChanges = async () => {
    try {
      const updates: any = {
        name: fullName,
        username: username,
      };

      const { error } = await supabase
        .from("User") // ✅ Correct table name
        .update(updates)
        .eq("id", user?.id);

      if (error) {
        Alert.alert("Error", "Failed to update account details.");
        console.error("Update error:", error);
        return;
      }

      Alert.alert("Success", "Your account details have been updated!");
      fetchUserDetails(); // ✅ Refresh user data
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert("Error", "Could not update user details.");
    }
  };

  // Handle account deletion
  const confirmDeleteAccount = async () => {
    try {
      if (!confirmPassword) {
        Alert.alert("Error", "Please enter your password to confirm.");
        return;
      }

      // Delete user from the database
      const { error } = await supabase
        .from("User") // ✅ Correct table name
        .delete()
        .eq("id", user?.id);

      if (error) {
        Alert.alert("Error", "Failed to delete account.");
        console.error("Delete error:", error);
        return;
      }

      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted."
      );
      router.replace("/login"); // ✅ Redirect to login after deletion
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          router.canGoBack() ? router.back() : router.push("./settings")
        }
      >
        <FontAwesome name="arrow-left" size={22} color="white" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Account Center</Text>

      {/* Profile Picture */}
      <TouchableOpacity>
        <Image
          key={profilePic}
          source={
            profilePic
              ? { uri: profilePic }
              : require("../../assets/default.jpg")
          }
          style={styles.profileImage}
        />

        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Change Profile Photo</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Full Name */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />

      {/* Username */}
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

      {/* Save Changes Button */}
      <TouchableOpacity style={styles.button} onPress={handleSaveChanges}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </TouchableOpacity>

      {/* Delete Account Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setDeleteModalVisible(true)}
      >
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={isUploadModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Profile Picture</Text>
            <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
              <Text style={styles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setUploadModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete your account? This action is
              irreversible.
            </Text>

            {/* Password Input */}
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {/* Confirm & Cancel Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    paddingHorizontal: 20,
    backgroundColor: "#FFACAC",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginTop: 15,
    marginBottom: 15,
  },
  backButton: {
    position: "absolute",
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 35,
    left: 15,
    padding: 15,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#FFBFA9",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  label: { fontSize: 16, color: "#FFF", fontWeight: "bold", marginBottom: 5 },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: "#F78119",
  },
  button: {
    backgroundColor: "#FFBFA9",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  deleteButton: {
    backgroundColor: "#ed2d2d",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },

  /* Modal Styles */
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "#DDD",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: { color: "#333", fontSize: 16 },
  confirmDeleteButton: {
    backgroundColor: "#ed2d2d",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmDeleteText: { color: "#FFF", fontSize: 16 },
});
