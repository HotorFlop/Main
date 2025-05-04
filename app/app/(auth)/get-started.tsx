import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function GetStarted() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>hot or flop?</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFACAC", // Updated background color
  },
  topStripe: {
    position: "absolute",
    top: 0,
    width: width,
    height: 40, // Adjust height as needed
    backgroundColor: "#FFE8A3",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#FFFFFF"
  },
  subtitle: {
    fontSize: 18,
    color: "white",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#FFBFA9",
    width: "70%",
    paddingVertical: 20,
    alignItems: "center",
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
