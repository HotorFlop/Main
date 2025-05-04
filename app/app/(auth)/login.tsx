import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { signIn, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isButtonEnabled = email.trim().length > 0 && password.length > 0;

  const handleSignIn = async () => {
    setFormError(null);

    if (!isButtonEnabled) {
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = "Login failed";
      if (typeof error === "object" && error !== null) {
        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password";
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      setFormError(errorMessage);
    } else {
      router.replace("/(tabs)/feed");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
        <View style={styles.container}>
          <Text style={styles.title}>hot or flop?</Text>
          <Text style={styles.subtitle}>Shop smarter, together</Text>

          {formError && <Text style={styles.errorText}>{formError}</Text>}

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
            placeholderTextColor="#A9A9A9"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button]}
            onPress={handleSignIn}
            disabled={!isButtonEnabled || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.signupText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
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
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#FFACAC",
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#FFF",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    color: "#FFFFFF",
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
    color: "#fff",
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