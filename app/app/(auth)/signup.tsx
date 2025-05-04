import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function SignUp() {
  const router = useRouter();
  const { signUp, loading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");

  const isButtonEnabled =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    username.trim().length > 0;

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhoneNumber = (phone: string) => {
    // const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phone.length !== 0;
  };

  const handleSignUp = async () => {
    setFormError(null);

    if (!isButtonEnabled) {
      return;
    }

    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setFormError("Please enter a valid phone number");
      return;
    }

    const { error, data } = await signUp(
      email,
      password,
      fullName,
      username,
      phoneNumber
    );

    if (error) {
      let errorMessage = "Failed to create account";
      if (typeof error === "object" && error !== null) {
        errorMessage = error.message || errorMessage;
      }
      setFormError(errorMessage);
    } else {
      if (data?.session) {
        router.replace("/allow-contacts");
      } else {
        Alert.alert(
          "Account Created",
          "Your account has been created successfully. Please check your email for confirmation if required.",
          [{ text: "OK", onPress: () => router.push("/allow-contacts") }]
        );
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView>
    <View style={styles.container}>
      <Text style={styles.title}>hot or flop?</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      {formError && <Text style={styles.errorText}>{formError}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#A9A9A9"
        autoCapitalize="words"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#A9A9A9"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#A9A9A9"
        keyboardType="phone-pad"
        autoCapitalize="none"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#A9A9A9"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        autoCorrect={false}
        textContentType="none"
        autoComplete="off"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#A9A9A9"
        secureTextEntry
        autoCorrect={false}
        textContentType="none"
        autoComplete="off"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={[styles.button]}
        onPress={handleSignUp}
      // disabled={!isButtonEnabled || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.signupText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: "#FFACAC",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFACAC",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 20,
    backgroundColor: "#FFACAC",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#FFF",
  },
  subtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#F78119",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: "#F78119",
  },
  button: {
    width: "100%",
    backgroundColor: "#FFBFA9",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#D3D3D3", // Gray for disabled state
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signupText: {
    marginTop: 20,
    color: "#FFF",
    fontSize: 16,
  },
  errorText: {
    color: "#FF2222",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: 10,
    borderRadius: 5,
    width: "100%",
    textAlign: "center",
    marginBottom: 20,
  },
});