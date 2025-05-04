import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, FlatList, Image, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { COLORS } from "../../constants/theme";
import { useRouter } from "expo-router";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface User {
  username: string;
  id: string;
  name: string;
  profile_pic: string;
  isFriend?: boolean;
}


export default function Friends() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [search, setSearch] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [myFriendIds, setMyFriendIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (user && isFocused) {
      setLoading(true);
      loadAllUsers().then(({ users, friendIds }) => {
        setMyFriendIds(friendIds);
        setAllUsers(users);
        setFilteredUsers(users);
        setLoading(false);
      });
    }
  }, [user?.id, isFocused]);

  const searchUsers = (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
  
    if (!trimmedQuery) {
      setFilteredUsers(allUsers); // Reset to full list if search is empty
      return;
    }
  
    const filtered = allUsers.filter(user => {
      const username = user.username ? user.username.toLowerCase() : ""; // Handle null/undefined
      const name = user.name ? user.name.toLowerCase() : ""; // Handle null/undefined
  
      return username.includes(trimmedQuery) || name.includes(trimmedQuery);
    });
  
    setFilteredUsers(filtered);
  };
  
  
  

  const loadAllUsers = async () => {
    if (!user) return { users: [], friendIds: [] };
    try {
      const { data: friendsData, error: friendsError } = await supabase
        .from("Friends")
        .select("friend_id")
        .eq("user_id", user.id);
      if (friendsError) throw friendsError;
      const friendIds = friendsData.map(f => f.friend_id);

      const { data: usersData, error: usersError } = await supabase
        .from("User")
        .select("id, name, username, profile_pic");
      if (usersError) throw usersError;

      const usersWithFriendStatus = usersData.map(userData => ({
        ...userData,
        isFriend: friendIds.includes(userData.id),
      }));

      return { users: usersWithFriendStatus, friendIds };
    } catch (error) {
      console.error("Error loading users and friends:", error);
      return { users: [], friendIds: [] };
    }
  };

  const toggleFriend = async (targetUser: User) => {
    if (!user) return;

    try {
      if (targetUser.isFriend) {
        const { error } = await supabase
          .from("Friends")
          .delete()
          .eq("user_id", user.id)
          .eq("friend_id", targetUser.id);

        if (error) {
          console.error("Error removing friend:", error);
          return;
        }

        setMyFriendIds(myFriendIds.filter(id => id !== targetUser.id));
        setAllUsers(users => users.map(u =>
          u.id === targetUser.id ? { ...u, isFriend: false } : u
        ));
        setFilteredUsers(users => users.map(u =>
          u.id === targetUser.id ? { ...u, isFriend: false } : u
        ));
      } else {
        const { error } = await supabase
          .from("Friends")
          .insert({ user_id: user.id, friend_id: targetUser.id });

        if (error) {
          console.error("Error adding friend:", error);
          return;
        }

        setMyFriendIds([...myFriendIds, targetUser.id]);
        setAllUsers(users => users.map(u =>
          u.id === targetUser.id ? { ...u, isFriend: true } : u
        ));
        setFilteredUsers(users => users.map(u =>
          u.id === targetUser.id ? { ...u, isFriend: true } : u
        ));
      }
    } catch (error) {
      console.error("Unexpected error toggling friend:", error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <TouchableOpacity onPress={() => router.push("./settings")} style={styles.backButton}>
        <FontAwesome name="arrow-left" size={22} color="white" />
      </TouchableOpacity>
      
      <Text style={styles.title}>Add Friends</Text>
      
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={20} color="white" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            searchUsers(text);
          }}
          placeholderTextColor="rgba(255,255,255,0.7)"
        />
      </View>

      <Text style={styles.subtitle}>Select users to add to your friends list</Text>

      {loading ? (
        <ActivityIndicator size="large" color="white" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.friendItem} onPress={() => toggleFriend(item)}>
              <View style={styles.friendInfo}>
                <Image source={item.profile_pic ? { uri: item.profile_pic } : require("../../assets/default.jpg")} style={styles.profilePic} />
                <Text style={styles.username}>{item.username}</Text>
              </View>
              <View style={[styles.circle, item.isFriend ? styles.circleActive : {}]}>
                {item.isFriend && <FontAwesome name="check" size={16} color="white" />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
  },
  backButton: {
    position: "absolute",
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    left: 16,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: StatusBar.currentHeight ? StatusBar.currentHeight + 60 : 100,
    marginBottom: 10,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: "#FFF",
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#FFF",
    marginBottom: 16,
    textAlign: "center",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.2)", // Lighter pink background (same as search bar)
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: "#FFF",
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  circleActive: {
    backgroundColor: "white",
  },
  loader: {
    marginTop: 20,
  },
});
