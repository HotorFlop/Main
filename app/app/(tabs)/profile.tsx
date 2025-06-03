import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  Animated,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { COLORS, SPACING, SIZES, FONTS } from "../../constants/theme";
import { Stack } from "expo-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { SvgXml } from "react-native-svg";
import ImageModal from "../../components/profile/ImageModal";
import { FontAwesome } from "@expo/vector-icons";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "../../context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { debounce } from "lodash";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_WIDTH =
  (SCREEN_WIDTH - (NUM_COLUMNS - 1) * GRID_SPACING) / NUM_COLUMNS;

const profileSvg = `<svg width="440" height="275" viewBox="0 0 440 275" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M-441.718 230.928C-415.983 198.362 -386.23 194.144 -352.457 218.273C-298.729 270.111 -268.975 265.892 -263.196 205.618C-241.705 143.116 -211.951 138.898 -173.934 192.963C-135.287 248.561 -105.533 244.342 -84.6732 180.309C-63.4078 116.218 -33.654 111.999 4.58807 167.654C49.8604 240.689 79.6141 236.471 93.8493 154.999C112.561 72.8932 142.315 68.6749 183.111 142.345C210.859 177.867 240.613 173.649 272.372 129.69C296.642 86.7926 326.396 82.5743 361.633 117.035C395.615 149.242 425.369 145.023 450.894 104.38C475.503 63.8674 505.256 59.6492 540.156 91.7256C593.177 154.744 622.931 150.525 629.417 79.0709C649.368 5.70735 679.122 1.48911 718.678 66.4162" stroke="#FFEBB4" stroke-width="40"/></svg>`;

interface SharedItem {
  id: number;
  title: string;
  imageUrl: string;
  description?: string;
  url: string;
  price?: number;
  yes_count: number;
  no_count: number;
  total_count: number;
  createdAt: string;
  updatedAt: string;
  userId: number;
  audience_type: "followers" | "closeFriends";
}

interface User {
  id: string;
  username: string;
  email: string;
  profile_pic: string;
}

interface FriendItem {
  id: string;
  username: string;
  profile_pic?: string;
  name?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "wishlist">("posts");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SharedItem | null>(null);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [Username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const { user_id } = useLocalSearchParams();
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const isFocused = useIsFocused();
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [wishlistItems, setWishlistItems] = useState<SharedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // First, start fetching the data
      const fetchPromise = fetchAllData();

      // Add a minimum delay of 750ms to ensure the animation runs smoothly
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 750));

      // Wait for both the data fetch and the delay to complete
      await Promise.all([fetchPromise, delayPromise]);
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      // Ensure refreshing is set to false after everything is done
      setRefreshing(false);
    }
  }, [user?.id]);

  const fetchAllData = async () => {
    if (!user?.id) return;

    console.log("Fetching profile data...");
    setLoading(true);

    try {
      const [
        { data: userDetails, error: userError },
        { data: itemsData, error: itemsError },
        { count: friendsCount, error: friendsError },
        { data: wishlistData, error: wishlistError },
      ] = await Promise.all([
        supabase
          .from("User")
          .select("username, profile_pic")
          .eq("id", user.id)
          .single(),
        supabase
          .from("SharedItem")
          .select("*")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false }),
        supabase
          .from("Friends")
          .select("friend_id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("Wishlist")
          .select(
            `
          item_id,
          SharedItem:item_id (*)
        `
          )
          .eq("user_id", user.id),
      ]);

      if (wishlistError) {
        console.error("Error fetching wishlist:", wishlistError);
      } else if (wishlistData) {
        const formattedWishlistItems = wishlistData
          .map((item) => item.SharedItem)
          .filter((item) => item !== null) as unknown as SharedItem[];

        console.log("Wishlist items:", formattedWishlistItems);
        setWishlistItems(formattedWishlistItems);
      }

      if (userError) console.error("Error fetching user details:", userError);
      else {
        setUsername(userDetails.username);
        setProfilePic(userDetails.profile_pic);
      }

      if (itemsError) console.error("Error fetching items:", itemsError);
      else setItems(itemsData || []);

      if (friendsError)
        console.error("Error fetching friends count:", friendsError);
      else setFriendsCount(friendsCount || 0);
    } catch (error) {
      console.error("Unexpected error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetchData = debounce(fetchAllData, 1000);

  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (isFocused && user?.id) {
      console.log("Profile screen focused, refreshing data for user:", user?.id);
      // Always refresh data when screen comes into focus
      debouncedFetchData();
      
      // Also check for new posts
      const checkForNewPosts = async () => {
        try {
          const lastPostTime = await AsyncStorage.getItem("lastPostCreated");
          if (lastPostTime && lastPostTime !== lastCheckTime) {
            console.log("New post detected during focus refresh");
            setLastCheckTime(lastPostTime);
          }
        } catch (error) {
          console.error("Error checking for new posts:", error);
        }
      };

      checkForNewPosts();
    }

    return () => {
      debouncedFetchData.cancel();
    };
  }, [isFocused, user?.id]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab === "posts" ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH / 2],
  });

  useEffect(() => {
    const fetchFriendCount = async () => {
      if (!user) return;

      const { count, error } = await supabase
        .from("Friends")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching friend count:", error);
        return;
      }

      setFriendCount(count || 0);
    };

    fetchFriendCount();
  }, []);

  const currentItems = items;

  useEffect(() => {
    const loadUserProfile = async () => {
      const profileUserId = user_id ? String(user_id) : user?.id;
      if (!profileUserId) return;

      setLoading(true);

      try {
        const [
          { data: userDetails, error: userError },
          { data: itemsData, error: itemsError },
          { count: friendsCount, error: friendsError },
          { data: wishlistData, error: wishlistError },
        ] = await Promise.all([
          supabase
            .from("User")
            .select("username, profile_pic")
            .eq("id", profileUserId)
            .single(),
          supabase
            .from("SharedItem")
            .select("*")
            .eq("userId", profileUserId)
            .order("createdAt", { ascending: false }),
          supabase
            .from("Friends")
            .select("friend_id", { count: "exact", head: true })
            .eq("user_id", profileUserId),
          profileUserId === user?.id
            ? supabase
                .from("Wishlist")
                .select(
                  `
                  item_id,
                  SharedItem:item_id (*)
                `
                )
                .eq("user_id", profileUserId)
            : { data: [], error: null },
        ]);

        if (userError) console.error("User details fetch error:", userError);
        else {
          setUsername(userDetails.username);
          setProfilePic(userDetails.profile_pic);
        }

        if (itemsError) console.error("Items fetch error:", itemsError);
        else setItems(itemsData || []);

        if (friendsError) console.error("Friends count error:", friendsError);
        else setFriendsCount(friendsCount || 0);

        // Only process wishlist if viewing own profile
        if (profileUserId === user?.id) {
          if (wishlistError) {
            console.error("Error fetching wishlist:", wishlistError);
          } else if (wishlistData) {
            const formattedWishlistItems = wishlistData
              .map((item) => item.SharedItem)
              .filter((item) => item !== null) as unknown as SharedItem[];

            setWishlistItems(formattedWishlistItems);
          }
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user_id, user?.id]);

  // Fetch friends list data
  const fetchFriendsList = async () => {
    if (!user?.id) return;

    setLoadingFriends(true);

    try {
      // Get friend IDs
      const { data: friendIdsData, error: friendIdsError } = await supabase
        .from("Friends")
        .select("friend_id")
        .eq("user_id", user.id);

      if (friendIdsError) {
        console.error("Error fetching friend IDs:", friendIdsError);
        return;
      }

      if (!friendIdsData || friendIdsData.length === 0) {
        setFriendsList([]);
        return;
      }

      const friendIds = friendIdsData.map((friend) => friend.friend_id);

      // Get friend details
      const { data: friendsData, error: friendsError } = await supabase
        .from("User")
        .select("id, username, name, profile_pic")
        .in("id", friendIds);

      if (friendsError) {
        console.error("Error fetching friend details:", friendsError);
        return;
      }

      setFriendsList(friendsData || []);
    } catch (error) {
      console.error("Unexpected error fetching friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Handle opening the friends modal
  const handleOpenFriendsModal = async () => {
    await fetchFriendsList();
    setShowFriendsModal(true);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topNav}>
        <Text style={styles.logo}>hot or flop?</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("../(private)/settings")}
          >
            <FontAwesome name="bars" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.header, { paddingTop: SPACING.md }]}>
        <SvgXml xml={profileSvg} style={styles.squiggle} />
        <View style={styles.profileInfo}>
          {/* Profile Picture */}
          <Image
            source={
              profilePic
                ? { uri: profilePic }
                : require("../../assets/default.jpg")
            }
            style={styles.profileImage}
          />

          {/* User Name */}
          <Text style={styles.handle}>@{Username}</Text>
        </View>
        <View style={styles.stats}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={handleOpenFriendsModal}
          >
            <Text style={styles.statNumber}>{friendsCount}</Text>
            <Text style={styles.statLabel}>friends</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{items.length}</Text>
            <Text style={styles.statLabel}>posts</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{ translateX }],
              height: 4,
            },
          ]}
        />
        <Pressable style={styles.tab} onPress={() => setActiveTab("posts")}>
          <Text
            style={[
              styles.tabText,
              activeTab === "posts" && styles.activeTabText,
            ]}
          >
            Posts
          </Text>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setActiveTab("wishlist")}>
          <Text
            style={[
              styles.tabText,
              activeTab === "wishlist" && styles.activeTabText,
            ]}
          >
            Wishlist
          </Text>
        </Pressable>
      </View>

      {/* Now the ScrollView with RefreshControl comes after the tabs */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.accent]} // Android
              tintColor={COLORS.accent} // iOS
              title="Pull to refresh" // iOS
              titleColor={COLORS.accent} // iOS
              progressBackgroundColor="#ffffff"
              progressViewOffset={10}
            />
          }
        >
          {activeTab === "wishlist" ? (
            wishlistItems.length > 0 ? (
              <View style={styles.grid}>
                {wishlistItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gridItem}
                    onPress={() => {
                      setSelectedImage(item.imageUrl || "");
                      setSelectedItem(item);
                    }}
                  >
                    <View style={styles.gridItemCard}>
                      <Image
                        source={{
                          uri:
                            item.imageUrl || "https://via.placeholder.com/150",
                        }}
                        style={styles.gridImage}
                        resizeMode="cover"
                      />
                      <View style={styles.gridItemContent}>
                        <Text
                          style={styles.gridItemTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.gridItemPrice}>
                          ${item.price?.toFixed(2) || "0.00"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateTitle}>
                  No items in wishlist yet
                </Text>
              </View>
            )
          ) : (
            <View style={styles.grid}>
              {currentItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridItem}
                  onPress={() => {
                    setSelectedImage(item.imageUrl || "");
                    setSelectedItem(item);
                  }}
                >
                  <View style={styles.gridItemCard}>
                    <Image
                      source={{
                        uri: item.imageUrl || "https://via.placeholder.com/150",
                      }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                    <View style={styles.gridItemContent}>
                      <Text
                        style={styles.gridItemTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.gridItemPrice}>
                        ${item.price?.toFixed(2) || "0.00"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <ImageModal
        isVisible={!!selectedImage && !!selectedItem}
        imageUrl={selectedImage || ""}
        onClose={() => {
          setSelectedItem(null);
          setSelectedImage(null);
          // Refresh wishlist data after modal closes
          if (user?.id) {
            fetchAllData();
          }
        }}
        item={selectedItem!}
      />

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Friends</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFriendsModal(false)}
              >
                <FontAwesome name="times" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {loadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={friendsList}
                keyExtractor={(item: FriendItem) => item.id}
                renderItem={({ item }: { item: FriendItem }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => {
                      setShowFriendsModal(false); // Close the modal first
                      router.push({
                        pathname: "/friendprofile",
                        params: { userId: item.id },
                      });
                    }}
                  >
                    <Image
                      source={
                        item.profile_pic
                          ? { uri: item.profile_pic }
                          : require("../../assets/default.jpg")
                      }
                      style={styles.friendImage}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.username}>@{item.username}</Text>
                      {item.name && (
                        <Text style={styles.name}>{item.name}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    You don't have any friends yet.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === "ios"
        ? StatusBar.currentHeight || 35
        : StatusBar.currentHeight,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  logo: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
    fontFamily: FONTS.mandali,
  },
  navIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: SPACING.md,
    padding: 15, // Makes it easier to click
    zIndex: 100, // Ensures it's on top of everything
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.lg,
    position: "relative",
    alignItems: "center",
  },
  squiggle: {
    position: "absolute",
    width: "110%",
    height: "100%",
    zIndex: 1,
    transform: [{ rotate: "355deg" }, { translateY: -80 }],
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: SPACING.lg,
    zIndex: 4,
  },
  profileImage: {
    width: SIZES.profileImageSize,
    height: SIZES.profileImageSize,
    borderRadius: SIZES.profileImageSize / 2,
    // borderWidth: 1,
    // borderColor: COLORS.gray,
  },
  handle: {
    marginTop: SPACING.sm,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around", // Ensures even spacing around items
    width: "100%", // Ensures it spans the full width of the container
    marginTop: 20, // Adds spacing from elements above
    alignItems: "center",
  },
  statItem: {
    alignItems: "center", // Centers text within each stat item
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
  },
  statLabel: {
    fontSize: 16,
    color: "#FFF",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.xl,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: SPACING.lg,
    left: 0,
    width: "50%",
    height: 2,
    backgroundColor: COLORS.accent,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
    color: COLORS.accent,
    fontFamily: FONTS.mandali,
  },
  activeTabText: {
    color: COLORS.accent,
    fontWeight: "bold",
    fontFamily: FONTS.mandali,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: GRID_SPACING / 2,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    padding: GRID_SPACING / 2,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl * 2,
    backgroundColor: COLORS.primary,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.accent,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.mandali,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.gray,
    fontFamily: FONTS.mandali,
  },
  manageFriendsButton: {
    marginTop: SPACING.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderColor: COLORS.accent,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  manageFriendsText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: FONTS.mandali,
  },
  buttonContainer: {
    flexDirection: "row", // Arrange buttons in a row
    justifyContent: "center", // Center the buttons horizontally
    alignItems: "center", // Align buttons vertically
    marginTop: SPACING.sm,
    gap: 12, // Adds spacing between buttons
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 5,
  },
  listContainer: {
    padding: 15,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  friendImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
  },
  name: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#999",
    fontSize: 16,
  },
  gridItemPrice: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: "600",
  },
  gridItemContent: {
    padding: 8,
    flex: 1,
  },
  gridItemCard: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gridItemTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});
