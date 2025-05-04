import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [closeFriendsCount, setCloseFriendsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;

      // Fetch close friends count
      const { count: closeFriendCount, error: closeFriendError } =
        await supabase
          .from("Friends")
          .select("close_friend", { count: "exact" })
          .eq("user_id", user.id)
          .eq("close_friend", true);

      if (closeFriendError) {
        console.error("Error fetching close friends count:", closeFriendError);
      } else {
        setCloseFriendsCount(closeFriendCount || 0);
      }

      // Fetch all friends count
      const { count: allFriendsCount, error: friendsError } = await supabase
        .from("Friends")
        .select("friend_id", { count: "exact" })
        .eq("user_id", user.id);

      if (friendsError) {
        console.error("Error fetching friends count:", friendsError);
      } else {
        setFriendsCount(allFriendsCount || 0);
      }
    };

    fetchCounts();
  }, [user]);

  return (
    <View style={styles.container}>
      {/* Back Button - Updated to use our custom handler */}
      <TouchableOpacity
        onPress={() =>
          router.canGoBack() ? router.back() : router.push("../(tabs)/profile")
        }
        style={styles.backButton}
      >
        <FontAwesome name="arrow-left" size={22} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Your Account</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("./account-center")}
        >
          <FontAwesome name="user-circle" size={20} color="#FFF" />
          <Text style={styles.menuText}>Account Center</Text>
        </TouchableOpacity>

        {/* Friends */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("./friends")}
        >
          <FontAwesome name="users" size={20} color="#FFF" />
          <Text style={styles.menuText}>Add Friends</Text>
          <Text style={styles.subtext}>{friendsCount}</Text>
        </TouchableOpacity>

        {/* Close Friends */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("./close-friends")}
        >
          <FontAwesome name="star" size={20} color="#FFF" />
          <Text style={styles.menuText}>Close Friends</Text>
          <Text style={styles.subtext}>{closeFriendsCount}</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            signOut();
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 70,
    paddingHorizontal: 20,
    backgroundColor: "#FFACAC",
  },
  backButton: {
    position: "absolute",
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 57,
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
  scrollContainer: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 20,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFBFA9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 10,
    flex: 1,
  },
  subtext: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ed2d2d",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  logoutText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
});
