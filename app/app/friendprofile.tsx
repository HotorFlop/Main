import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { createClient } from "@supabase/supabase-js";
import { COLORS, FONTS, SPACING, SIZES } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { SvgXml } from "react-native-svg";
import { FontAwesome } from "@expo/vector-icons";
import ImageModal from "../components/profile/ImageModal";

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Use a reliable default profile picture
const DEFAULT_PROFILE_PIC = require("../assets/default.jpg");

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_WIDTH =
  (SCREEN_WIDTH - (NUM_COLUMNS - 1) * GRID_SPACING) / NUM_COLUMNS;

// SVG for squiggle background
const profileSvg = `<svg width="440" height="275" viewBox="0 0 440 275" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M-441.718 230.928C-415.983 198.362 -386.23 194.144 -352.457 218.273C-298.729 270.111 -268.975 265.892 -263.196 205.618C-241.705 143.116 -211.951 138.898 -173.934 192.963C-135.287 248.561 -105.533 244.342 -84.6732 180.309C-63.4078 116.218 -33.654 111.999 4.58807 167.654C49.8604 240.689 79.6141 236.471 93.8493 154.999C112.561 72.8932 142.315 68.6749 183.111 142.345C210.859 177.867 240.613 173.649 272.372 129.69C296.642 86.7926 326.396 82.5743 361.633 117.035C395.615 149.242 425.369 145.023 450.894 104.38C475.503 63.8674 505.256 59.6492 540.156 91.7256C593.177 154.744 622.931 150.525 629.417 79.0709C649.368 5.70735 679.122 1.48911 718.678 66.4162" stroke="#FFEBB4" stroke-width="40"/></svg>`;

interface Post {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  audience_type: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  url?: string;
  yes_count?: number;
  no_count?: number;
  total_count?: number;
}

interface ProfileUser {
  id: string;
  username: string;
  bio?: string;
  profile_pic?: string;
}

export default function FriendProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [iOnTheirCloseFriendsList, setIOnTheirCloseFriendsList] =
    useState(false);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"posts" | "followers">("posts");
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Post | null>(null);

  // Track whether this component is mounted to prevent state updates after unmounting
  const isMounted = React.useRef(true);

  useEffect(() => {
    // This runs on component unmount
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Function to handle post visibility based on relationship status
  const calculateVisiblePosts = (
    posts: Post[],
    isUserFollowing: boolean,
    isUserCloseFriend: boolean,
    isOnTheirCloseFriendsList: boolean
  ) => {
    if (!posts) return [];

    return posts.filter((post) => {
      // Normalize audience type (remove quotes, lowercase)
      const audienceType = (post.audience_type || "followers")
        .replace(/['"]/g, "")
        .toLowerCase();

      // Show all posts if I'm on their close friends list
      if (isOnTheirCloseFriendsList) {
        return true;
      }

      // If I'm just a follower, only show posts for followers
      if (isUserFollowing && audienceType === "followers") {
        return true;
      }

      // If I'm a close friend, show posts for both followers and close friends
      if (
        isUserCloseFriend &&
        (audienceType === "followers" || audienceType === "closefriends")
      ) {
        return true;
      }

      return false;
    });
  };

  useEffect(() => {
    // Update displayed posts whenever relationship status changes
    const visiblePosts = calculateVisiblePosts(
      allPosts,
      isFollowing,
      isCloseFriend,
      iOnTheirCloseFriendsList
    );
    setDisplayedPosts(visiblePosts);
    setPostCount(visiblePosts.length);
  }, [allPosts, isFollowing, isCloseFriend, iOnTheirCloseFriendsList]);

  useEffect(() => {
    if (!userId) {
      // If no userId provided, go back to the feed
      router.replace("/(tabs)/feed");
      return;
    }

    // Check if viewing own profile
    if (user?.id === userId) {
      // Redirect to your own profile tab instead of showing another instance
      router.replace("/(tabs)/profile");
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);

        // Fetch user profile data
        const { data: userData, error: userError } = await supabase
          .from("User")
          .select("*")
          .eq("id", userId)
          .single();

        if (userError) throw userError;

        if (isMounted.current) {
          setProfileUser(userData);
        }

        // Parallel fetch of critical relationship data
        const [
          myRelationshipToThem,
          theirRelationshipToMe,
          followersData,
          postsData,
        ] = await Promise.all([
          // 1. Check if I follow them (and if they're my close friend)
          supabase
            .from("Friends")
            .select("*")
            .eq("user_id", user?.id)
            .eq("friend_id", userId)
            .single(),

          // 2. Check if I'm on their close friends list
          supabase
            .from("Friends")
            .select("*")
            .eq("user_id", userId)
            .eq("friend_id", user?.id)
            .eq("close_friend", true)
            .single(),

          // 3. Get all followers of this profile
          supabase
            .from("Friends")
            .select("user_id, User:user_id(id, username, profile_pic)")
            .eq("friend_id", userId),

          // 4. Get ALL posts for this user - we'll filter them later
          supabase
            .from("SharedItem")
            .select("*")
            .eq("userId", userId)
            .order("createdAt", { ascending: false }),
        ]);

        // Process my relationship to them
        if (
          !myRelationshipToThem.error &&
          myRelationshipToThem.data &&
          isMounted.current
        ) {
          setIsFollowing(true);
          setIsCloseFriend(myRelationshipToThem.data.close_friend || false);
        }

        // Process if I'm on their close friends list
        if (!theirRelationshipToMe.error && theirRelationshipToMe.data) {
          setIOnTheirCloseFriendsList(true);
        }

        // Process followers
        if (!followersData.error && followersData.data) {
          setFollowers(followersData.data);
          setFollowerCount(followersData.data.length);
        }

        // Process posts
        if (!postsData.error && postsData.data) {
          setAllPosts(postsData.data || []);
          // The displayedPosts will be set by the useEffect that watches relationship changes
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchProfileData();
  }, [userId, user?.id]);

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

  const handleFollow = async () => {
    if (!user?.id || !userId) return;

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("Friends")
          .delete()
          .eq("user_id", user.id)
          .eq("friend_id", userId);

        if (error) throw error;
        setIsFollowing(false);
        setIsCloseFriend(false);
      } else {
        // Follow
        const { error } = await supabase
          .from("Friends")
          .insert([
            { user_id: user.id, friend_id: userId, close_friend: false },
          ]);

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  const toggleCloseFriend = async () => {
    if (!user?.id || !userId || !isFollowing) return;

    try {
      const { error } = await supabase
        .from("Friends")
        .update({ close_friend: !isCloseFriend })
        .eq("user_id", user.id)
        .eq("friend_id", userId);

      if (error) throw error;
      setIsCloseFriend(!isCloseFriend);
    } catch (error) {
      console.error("Error updating close friend status:", error);
    }
  };

  const getProfilePicUri = (profileData: { profile_pic?: string } | null) => {
    if (!profileData || !profileData.profile_pic) {
      return DEFAULT_PROFILE_PIC;
    }
    return { uri: profileData.profile_pic };
  };

  // Handle navigation back to tab screens
  const navigateToFeed = () => {
    router.replace("/(tabs)/feed");
  };

  const navigateToProfile = () => {
    router.replace("/(tabs)/profile");
  };

  const navigateToCreatePost = () => {
    router.replace("/(tabs)/create-post");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.container}>
        <Text>User not found</Text>
        <TouchableOpacity onPress={navigateToFeed} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topNav}>
        {/* Removed top left navigation button */}
        <Text style={styles.logo}>hot or flop?</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity
            onPress={navigateToProfile}
            style={styles.iconButton}
          >
            <FontAwesome name="user" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.header, { paddingTop: SPACING.md }]}>
        <SvgXml xml={profileSvg} style={styles.squiggle} />
        <View style={styles.profileInfo}>
          {/* Profile Picture */}
          <Image
            source={getProfilePicUri(profileUser)}
            style={styles.profileImage}
          />

          {/* User Name */}
          <Text style={styles.handle}>@{profileUser.username}</Text>
          {profileUser.bio && <Text style={styles.bio}>{profileUser.bio}</Text>}

          {/* Follow/Close Friend Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
              onPress={handleFollow}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>

            {isFollowing && (
              <TouchableOpacity
                style={[
                  styles.closeFriendButton,
                  isCloseFriend && styles.isCloseFriendButton,
                ]}
                onPress={toggleCloseFriend}
              >
                <Text style={styles.closeFriendButtonText}>
                  {isCloseFriend ? "Close Friend" : "Add Close Friend"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Indicator if you're on their close friends list */}
          {iOnTheirCloseFriendsList && (
            <View style={styles.closeFriendIndicator}>
              <Text style={styles.closeFriendIndicatorText}>
                You're on their close friends list ✓
              </Text>
            </View>
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{postCount}</Text>
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
        <Pressable style={styles.tab} onPress={() => setActiveTab("followers")}>
          <Text
            style={[
              styles.tabText,
              activeTab === "followers" && styles.activeTabText,
            ]}
          >
            Followers
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollViewContent}
      >
        {activeTab === "posts" ? (
          displayedPosts.length > 0 ? (
            <View style={styles.grid}>
              {displayedPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => {
                    setSelectedImage(post.imageUrl || "");
                    setSelectedItem(post);
                  }}
                >
                  <Image
                    source={{
                      uri: post.imageUrl || "https://via.placeholder.com/150",
                    }}
                    style={styles.gridImage}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {isFollowing
                  ? "No posts available to view"
                  : "Follow this user to see their posts"}
              </Text>
            </View>
          )
        ) : // Followers tab
        followers.length > 0 ? (
          <View style={styles.followersList}>
            {followers.map((follower) => (
              <TouchableOpacity
                key={follower.user_id}
                style={styles.followerItem}
                onPress={() => {
                  router.push({
                    pathname: "/friendprofile",
                    params: { userId: follower.user_id },
                  });
                }}
              >
                <Image
                  source={
                    follower.User?.profile_pic
                      ? { uri: follower.User.profile_pic }
                      : DEFAULT_PROFILE_PIC
                  }
                  style={styles.followerImage}
                />
                <Text style={styles.followerName}>
                  @{follower.User?.username || "user"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No followers yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Image Modal for viewing selected post */}
      <ImageModal
        isVisible={!!selectedImage && !!selectedItem}
        imageUrl={selectedImage || ""}
        onClose={() => {
          setSelectedItem(null);
          setSelectedImage(null);
        }}
        item={selectedItem as any}
      />

      {/* Bottom navigation bar with added top margin */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => {
            navigateToFeed();
            setSelectedTabIndex(0);
          }}
        >
          <FontAwesome
            name="home"
            size={24}
            color={selectedTabIndex === 0 ? "#000" : "#999"}
          />
          <Text
            style={[
              styles.bottomTabText,
              selectedTabIndex === 0 ? styles.activeBottomTabText : null,
            ]}
          >
            Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => {
            navigateToCreatePost();
            setSelectedTabIndex(1);
          }}
        >
          <FontAwesome
            name="plus-square"
            size={24}
            color={selectedTabIndex === 1 ? "#000" : "#999"}
          />
          <Text
            style={[
              styles.bottomTabText,
              selectedTabIndex === 1 ? styles.activeBottomTabText : null,
            ]}
          >
            Create Post
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => {
            navigateToProfile();
            setSelectedTabIndex(2);
          }}
        >
          <FontAwesome
            name="user-circle"
            size={24}
            color={selectedTabIndex === 2 ? "#000" : "#999"}
          />
          <Text
            style={[
              styles.bottomTabText,
              selectedTabIndex === 2 ? styles.activeBottomTabText : null,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
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
    padding: 15,
    zIndex: 100,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.sm, // Reduced padding to move tabs up
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
    marginBottom: SPACING.sm, // Reduced margin to move elements up
    zIndex: 4,
  },
  profileImage: {
    width: SIZES.profileImageSize,
    height: SIZES.profileImageSize,
    borderRadius: SIZES.profileImageSize / 2,
  },
  handle: {
    marginTop: SPACING.sm,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  bio: {
    marginTop: 5,
    textAlign: "center",
    color: "#fff",
    maxWidth: "80%",
    fontFamily: FONTS.mandali,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.sm, // Reduced margin to move elements up
    gap: 10,
  },
  followButton: {
    backgroundColor: "#3F78FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  followButtonText: {
    color: "white",
    fontWeight: "600",
    fontFamily: FONTS.mandali,
  },
  followingButtonText: {
    color: "#333",
  },
  closeFriendButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  isCloseFriendButton: {
    backgroundColor: "#FFD700",
  },
  closeFriendButtonText: {
    color: "#444",
    fontWeight: "600",
    fontFamily: FONTS.mandali,
  },
  closeFriendIndicator: {
    marginTop: 8, // Reduced margin
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    paddingVertical: 4, // Smaller padding
    paddingHorizontal: 8, // Smaller padding
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  closeFriendIndicatorText: {
    fontSize: 11, // Smaller font
    color: "#333",
    fontWeight: "500",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12, // Reduced margin
    marginBottom: 10, // Added margin bottom to create space between stats and tabs
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    fontFamily: FONTS.mandali,
  },
  statLabel: {
    fontSize: 16,
    color: "#FFF",
    fontFamily: FONTS.mandali,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.md, // Reduced padding to move up
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: SPACING.sm, // Reduced bottom position
    left: 0,
    width: "50%",
    height: 2,
    backgroundColor: COLORS.accent,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.xs, // Reduced padding
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
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 100, // Increased bottom padding for content
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
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.accent,
    fontFamily: FONTS.mandali,
    textAlign: "center",
  },
  backButton: {
    margin: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    color: "#333",
    fontFamily: FONTS.mandali,
  },
  // Followers tab styles
  followersList: {
    padding: 10,
  },
  followerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    marginBottom: 10,
  },
  followerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  followerName: {
    color: "#fff",
    fontFamily: FONTS.mandali,
    fontSize: 16,
  },
  // Bottom tab bar
  bottomTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    marginTop: 15, // Added top margin
    backgroundColor: "#fff",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    paddingTop: 10, // Added top padding
  },
  bottomTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomTabText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontFamily: FONTS.mandali,
  },
  activeBottomTabText: {
    color: "#000",
  },
});
