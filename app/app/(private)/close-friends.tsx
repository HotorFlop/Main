import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, FlatList, Image, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { COLORS } from "../../constants/theme";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface User {
  username: string;
  id: string;
  name: string;
  profile_pic: string;
  isCloseFriend?: boolean;
}

export default function CloseFriends() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [search, setSearch] = useState<string>("");
  const [friends, setFriends] = useState<User[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch ALL friends with their close friend status
  const getFriends = async () => {
    if (!user) return [];
    setLoading(true);

    try {
      // Get all friend relationships
      const { data: friendsData, error: friendsError } = await supabase
        .from("Friends")
        .select("friend_id, close_friend")
        .eq("user_id", user.id);

      if (friendsError) {
        console.error("Error fetching friends relationships:", friendsError);
        return [];
      }

      if (!friendsData || friendsData.length === 0) {
        setLoading(false);
        return [];
      }

      const friendIds = friendsData.map(friend => friend.friend_id);

      // Get user details for each friend
      const { data: usersData, error: usersError } = await supabase
        .from("User")
        .select("id, name, username, profile_pic")
        .in("id", friendIds);

      if (usersError) {
        console.error("Error fetching user details:", usersError);
        return [];
      }

      // Combine the friend status with user details
      const friendsWithStatus = usersData.map(userData => {
        const relationship = friendsData.find(rel => rel.friend_id === userData.id);
        return {
          ...userData,
          isCloseFriend: relationship?.close_friend || false
        };
      });

      setLoading(false);
      return friendsWithStatus;
    } catch (error) {
      console.error("Unexpected error in getFriends:", error);
      setLoading(false);
      return [];
    }
  };

  // Toggle close friend status
  const toggleCloseFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      // Find current friend in list
      const currentFriend = friends.find(f => f.id === friendId);
      if (!currentFriend) return;
      
      const newStatus = !currentFriend.isCloseFriend;
      
      // Update UI immediately for responsiveness
      setFriends(friends.map(f => 
        f.id === friendId ? {...f, isCloseFriend: newStatus} : f
      ));
      
      setFilteredFriends(filteredFriends.map(f => 
        f.id === friendId ? {...f, isCloseFriend: newStatus} : f
      ));
      
      // Update in database
      const { error } = await supabase
        .from("Friends")
        .update({ close_friend: newStatus })
        .eq("user_id", user.id)
        .eq("friend_id", friendId);
      
      if (error) {
        console.error("Error updating close friend status:", error);
        // Revert UI change on error
        setFriends(friends);
        setFilteredFriends(filteredFriends);
        return;
      }
      
      console.log(`Updated ${friendId} close friend status to ${newStatus}`);
    } catch (error) {
      console.error("Unexpected error toggling close friend:", error);
    }
  };

  // Fetch friends when component mounts or regains focus
  useEffect(() => {
    if (user && isFocused) {
      const loadFriends = async () => {
        const friendsList = await getFriends();
        setFriends(friendsList);
        setFilteredFriends(friendsList);
      };
      
      loadFriends();
    }
  }, [user?.id, isFocused]);

  // Filter friends based on search
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend => 
        friend.username.toLowerCase().includes(search.toLowerCase()) ||
        (friend.name && friend.name.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredFriends(filtered);
    }
  }, [search, friends]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <TouchableOpacity 
        onPress={() => router.push("./settings")}
        style={styles.backButton}
      >
        <FontAwesome name="arrow-left" size={22} color="white" />
      </TouchableOpacity>
      
      <Text style={styles.title}>Close Friends</Text>
      
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={20} color="white" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="rgba(255,255,255,0.7)"
        />
      </View>
      
      <Text style={styles.subtitle}>Select friends to add to your close friends list</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="white" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.friendItem}
              onPress={() => toggleCloseFriend(item.id)}
            >
              <View style={styles.friendInfo}>
                <Image 
                  source={ 
                    item.profile_pic 
                      ? { uri: item.profile_pic } 
                      : require('../../assets/default.jpg') 
                  }
                  style={styles.profilePic}
                />
                <Text style={styles.username}>{item.username}</Text>
              </View>
              <View style={[
                styles.checkbox, 
                item.isCloseFriend ? styles.checkboxActive : {}
              ]}>
                {item.isCloseFriend && (
                  <FontAwesome name="check" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search.trim() !== '' 
                ? "No friends match your search" 
                : "You don't have any friends yet. Add friends first!"}
            </Text>
          }
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
    marginBottom: 20,
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
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.2)",
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#FFF",
    borderColor: "#FFF",
  },
  emptyText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 16,
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
});
