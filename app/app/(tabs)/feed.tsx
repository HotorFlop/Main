import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  StatusBar,
  Linking,
  Share,
  Alert,
  RefreshControl,
} from "react-native";
import { COLORS, SPACING, FONTS } from "../../constants/theme";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { SvgXml } from "react-native-svg";
import CommentsModal from "../../components/CommentsModal";
import ReportModal from "../../components/ReportModal";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { moderationAPI } from "../../lib/moderation";
// import { Product } from "../types/product";

// You'll need to create these environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const profileSvg = `<svg width="440" height="275" viewBox="0 0 440 275" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M-441.718 230.928C-415.983 198.362 -386.23 194.144 -352.457 218.273C-298.729 270.111 -268.975 265.892 -263.196 205.618C-241.705 143.116 -211.951 138.898 -173.934 192.963C-135.287 248.561 -105.533 244.342 -84.6732 180.309C-63.4078 116.218 -33.654 111.999 4.58807 167.654C49.8604 240.689 79.6141 236.471 93.8493 154.999C112.561 72.8932 142.315 68.6749 183.111 142.345C210.859 177.867 240.613 173.649 272.372 129.69C296.642 86.7926 326.396 82.5743 361.633 117.035C395.615 149.242 425.369 145.023 450.894 104.38C475.503 63.8674 505.256 59.6492 540.156 91.7256C593.177 154.744 622.931 150.525 629.417 79.0709C649.368 5.70735 679.122 1.48911 718.678 66.4162" stroke="#FFEBB4" stroke-width="40"/></svg>`;

// Use a reliable online default profile picture URL
const DEFAULT_PROFILE_PIC = require("../../assets/default.jpg");

interface Comment {
  id: number;
  comment: string;
  created_at: string;
  userId: number;
  sharedItemId: number;
  user: {
    name: string;
  };
}

interface UserDetails {
  id: string;
  username: string;
  profile_pic: string;
}

interface Product {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  no_count: number;
  yes_count: number;
  total_count: number;
  url: string;
  user_id: string;
  userId?: string; // For backward compatibility
  user: UserDetails;
}

const SWIPE_THRESHOLD = 120; // minimum distance for a swipe
const SWIPE_OUT_DURATION = 200; // how long the card takes to swipe out

const isValidUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export default function Feed() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteStats, setVoteStats] = useState<{
    yes: number;
    no: number;
  } | null>(null);
  const [yesBarHeight] = useState(new Animated.Value(0));
  const [noBarHeight] = useState(new Animated.Value(0));
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [imageHeight, setImageHeight] = useState<number | null>(null);
  const [isCommentsModalVisible, setCommentsModalVisible] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [votedItemIds, setVotedItemIds] = useState<number[]>([]);
  const [wishlistedItems, setWishlistedItems] = useState<number[]>([]);

  const position = useRef(new Animated.ValueXY()).current;
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardVisibility = useRef(new Animated.Value(1)).current;
  const [preloadedImages, setPreloadedImages] = useState<{
    [key: string]: boolean;
  }>({});

  const isItemWishlisted = (itemId: number) => {
    return wishlistedItems.includes(itemId);
  };

  const handleToggleWishlist = async (itemId: number) => {
    if (!user?.id) return;

    try {
      if (isItemWishlisted(itemId)) {
        // Remove from wishlist
        const { error } = await supabase
          .from("Wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);

        if (error) {
          console.error("Error removing from wishlist:", error);
          throw error;
        }

        setWishlistedItems((prev) => prev.filter((id) => id !== itemId));
        console.log(`Successfully removed item ${itemId} from wishlist`);
      } else {
        // Add to wishlist
        const { error } = await supabase.from("Wishlist").insert([
          {
            user_id: user.id,
            item_id: itemId,
          },
        ]);

        if (error) {
          console.error("Error adding to wishlist:", error);
          throw error;
        }

        setWishlistedItems((prev) => [...prev, itemId]);
        console.log(`Successfully added item ${itemId} to wishlist`);
      }

      // Store timestamp to trigger profile refresh when user navigates there
      await AsyncStorage.setItem(
        "lastWishlistUpdate",
        new Date().toISOString()
      );
    } catch (error) {
      console.error("Error updating wishlist:", error);
      Alert.alert(
        "Wishlist Update Failed",
        "There was a problem updating your wishlist. Please try again."
      );
    }
  };
  useEffect(() => {
    const fetchWishlistedItems = async () => {
      if (!user?.id) return;

      try {
        console.log("Fetching wishlisted items for user:", user.id);
        const { data, error } = await supabase
          .from("Wishlist")
          .select("item_id")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching wishlist:", error);
          throw error;
        }

        const itemIds = data.map((item) => item.item_id);
        console.log(`Found ${itemIds.length} items in wishlist:`, itemIds);
        setWishlistedItems(itemIds);
      } catch (error) {
        console.error("Error in fetchWishlistedItems:", error);
      }
    };

    fetchWishlistedItems();
  }, [user?.id]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          console.log("Start pan check:", {
            hasProduct: !!currentProduct,
            hasVoted,
            productId: currentProduct?.id,
          });
          return !hasVoted;
        },
        onMoveShouldSetPanResponder: () => !hasVoted,
        onPanResponderMove: (_, gesture) => {
          console.log("Pan move:", {
            dx: gesture.dx,
            productId: currentProduct?.id,
          });
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          console.log("Pan release:", {
            dx: gesture.dx,
            threshold: SWIPE_THRESHOLD,
            productId: currentProduct?.id,
          });

          if (gesture.dx > SWIPE_THRESHOLD) {
            forceSwipe("right");
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            forceSwipe("left");
          } else {
            resetPosition();
          }
        },
      }),
    [currentProduct, hasVoted]
  );

  useEffect(() => {
    console.log("PanResponder state check:", {
      hasProduct: !!currentProduct,
      productId: currentProduct?.id,
      hasVoted: hasVoted,
      canSwipe: !hasVoted && !!currentProduct,
    });
  }, [currentProduct, hasVoted]);

  useEffect(() => {
    if (user?.id) {
      loadInitialFeed();
    }
  }, [user?.id]);

  useEffect(() => {
    if (allProducts?.length > 0 && user?.id) {
      // Double-check no self-posts made it through
      const selfPosts = allProducts.filter((post) => post.userId === user.id);
      if (selfPosts.length > 0) {
        console.error("Error: Found self posts after filtering:", selfPosts);
        // Auto-correct by removing them
        setAllProducts((prev) =>
          prev.filter((post) => post.userId !== user.id)
        );
      }
    }
  }, [allProducts, user?.id]);

  useEffect(() => {
    if (allProducts?.length > 0) {
      // Check if any of your own posts slipped through
      const ownPostsStillShowing = allProducts.filter(
        (post) => post.userId === user?.id
      );
      if (ownPostsStillShowing.length > 0) {
        console.error(
          "ERROR: Own posts are still showing in feed!",
          ownPostsStillShowing
        );
      } else {
        console.log("Success: No own posts in feed");
      }
    }
  }, [allProducts, user]);

  useEffect(() => {
    if (user?.id) {
      setVotedItemIds([]);
      console.log("Reset votedItemIds for new session");
    }
  }, [user?.id]);

  useEffect(() => {
    if (allProducts.length > 0) {
      // Preload the next 3 images
      for (
        let i = currentIndex;
        i < Math.min(currentIndex + 3, allProducts.length);
        i++
      ) {
        if (
          allProducts[i]?.imageUrl &&
          !preloadedImages[allProducts[i].imageUrl!]
        ) {
          console.log(`Preloading image for product ${allProducts[i].id}`);
          Image.prefetch(allProducts[i].imageUrl!)
            .then(() => {
              setPreloadedImages((prev) => ({
                ...prev,
                [allProducts[i].imageUrl!]: true,
              }));
            })
            .catch((err) => console.log("Failed to preload:", err));
        }
      }
    }
  }, [allProducts, currentIndex]);

  const loadInitialFeed = async () => {
    setLoading(true);
    try {
      const posts = await fetchFeedPosts();
      if (posts.length > 0) {
        setAllProducts(posts);
        setCurrentProduct(posts[0]);
        setCurrentIndex(0);
        // Store the timestamp of the most recent post
        setMostRecentPostTimestamp(posts[0].createdAt);
      }
    } catch (error) {
      console.error("Error loading initial feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedPosts = async (sinceTimestamp = null) => {
    if (!user?.id) return [];

    try {
      // 1. Get relationship data
      const [closeRelationships, followingData] = await Promise.all([
        supabase
          .from("Friends")
          .select("user_id")
          .eq("friend_id", user.id)
          .eq("close_friend", true),
        supabase.from("Friends").select("friend_id").eq("user_id", user.id),
      ]);

      const usersWithMeAsCloseFriend =
        closeRelationships.data?.map((rel) => rel.user_id) || [];
      const followingUsers =
        followingData.data?.map((rel) => rel.friend_id) || [];

      // 2. Build query for posts
      let query = supabase
        .from("SharedItem")
        .select("*, user:User(id, username, profile_pic)")
        .neq("userId", user.id)
        .order("createdAt", { ascending: false });

      // If we're refreshing, only get posts newer than what we've seen
      if (sinceTimestamp) {
        query = query.gte("createdAt", sinceTimestamp);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // 3. Filter by audience rules
      const filteredPosts = data.filter((post) => {
        // Remove any quotes and convert to lowercase for comparison
        const audienceType = (post.audience_type || "followers")
          .replace(/['"]/g, "") // Remove both single and double quotes
          .toLowerCase();

        if (audienceType === "followers") {
          return followingUsers.includes(post.userId);
        }

        if (audienceType === "closefriends") {
          return usersWithMeAsCloseFriend.includes(post.userId);
        }

        return false;
      });

      // 4. Filter out posts the user has already voted on
      return filteredPosts.filter((post) => !votedItemIds.includes(post.id));
    } catch (error) {
      console.error("Error fetching feed posts:", error);
      return [];
    }
  };

  const animateVoteResults = (yesPercentage: number, noPercentage: number) => {
    yesBarHeight.setValue(0);
    noBarHeight.setValue(0);

    Animated.parallel([
      Animated.timing(yesBarHeight, {
        toValue: yesPercentage,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(noBarHeight, {
        toValue: noPercentage,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleVote = async (productId: number, voteType: "yes" | "no") => {
    if (!user || !currentProduct) return;

    console.log(
      `=== VOTE PROCESS STARTED: ${voteType} for product ${productId} ===`
    );

    try {
      // Add to voted items immediately to prevent duplicate votes
      setVotedItemIds((prev) => {
        if (prev.includes(productId)) return prev;
        return [...prev, productId];
      });

      const updateField = voteType === "yes" ? "yes_count" : "no_count";

      // First get current values to ensure we have the latest data
      const { data: currentData, error: fetchError } = await supabase
        .from("SharedItem")
        .select("yes_count, no_count, total_count")
        .eq("id", currentProduct.id)
        .single();

      if (fetchError) {
        console.error("Error fetching current DB values:", fetchError);
        throw fetchError;
      }

      console.log("Current Database Values:", currentData);

      // Calculate new values
      const newYesCount =
        voteType === "yes"
          ? (currentData.yes_count || 0) + 1
          : currentData.yes_count;
      const newNoCount =
        voteType === "no"
          ? (currentData.no_count || 0) + 1
          : currentData.no_count;
      const newTotalCount = newYesCount + newNoCount;

      // Update both counts and total
      const { data, error } = await supabase
        .from("SharedItem")
        .update({
          yes_count: newYesCount,
          no_count: newNoCount,
          total_count: newTotalCount,
        })
        .eq("id", currentProduct.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating database:", error);
        throw error;
      }

      console.log("Updated Database Values:", data);

      if (data) {
        // Calculate percentages based on new total
        const totalVotes = newTotalCount;
        const yesPercent =
          totalVotes === 0 ? 0 : Math.round((newYesCount / totalVotes) * 100);
        const noPercent =
          totalVotes === 0 ? 0 : Math.round((newNoCount / totalVotes) * 100);

        console.log("Calculated Percentages:", {
          yes_votes: newYesCount,
          no_votes: newNoCount,
          total_votes: totalVotes,
          yes_percent: yesPercent,
          no_percent: noPercent,
        });

        // Update local state
        const updatedProducts = [...allProducts];
        updatedProducts[currentIndex] = {
          ...currentProduct,
          yes_count: newYesCount,
          no_count: newNoCount,
          total_count: newTotalCount,
        };
        setAllProducts(updatedProducts);
        setCurrentProduct(updatedProducts[currentIndex]);
        setVoteStats({ yes: yesPercent, no: noPercent });
        setHasVoted(true);

        // Trigger animations
        requestAnimationFrame(() => {
          console.log("Starting animations with percentages:", {
            yesPercent,
            noPercent,
          });
          animateVoteResults(yesPercent, noPercent);
        });
      }
    } catch (error) {
      console.error("=== VOTE PROCESS ERROR ===", error);
    } finally {
      console.log("=== VOTE PROCESS COMPLETE ===");
    }
  };

  const fadeOutCard = () => {
    cardVisibility.setValue(0);
  };

  const forceSwipe = (direction: "left" | "right") => {
    if (!currentProduct) {
      console.error("Cannot swipe: No current product");
      return;
    }

    // Hide card first
    cardVisibility.setValue(0);

    const x = direction === "right" ? width * 2 : -width * 2;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction: "left" | "right") => {
    if (!currentProduct) return;

    const vote = direction === "right" ? "yes" : "no";

    // Reset position
    position.setValue({ x: 0, y: 0 });

    // Process vote
    await handleVote(currentProduct.id, vote);

    // Make sure the results are shown (force hasVoted to true if needed)
    if (!hasVoted) {
      setHasVoted(true);
    }

    // Display results immediately
    swipeAnimation.setValue(1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < allProducts.length) {
      const nextIndex = currentIndex + 1;
      const nextProduct = allProducts[nextIndex];

      // Update state immediately
      setCurrentIndex(nextIndex);
      setCurrentProduct(nextProduct);

      // First show new card, keep results visible on top
      cardVisibility.setValue(1);

      // Then after card is visible, fade out results
      setTimeout(() => {
        setHasVoted(false);
        setVoteStats(null);

        Animated.timing(swipeAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          yesBarHeight.setValue(0);
          noBarHeight.setValue(0);
        });
      }, 50);
    } else {
      // No more products
      Animated.timing(swipeAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        Alert.alert(
          "End of Feed",
          "You've seen all available posts. Pull down to refresh for new content."
        );
      });
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false, // Must be false for position animations
      friction: 5,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-width * 1.5, 0, width * 1.5],
      outputRange: ["-30deg", "0deg", "30deg"],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const getOverlayStyle = (type: "yes" | "no") => {
    const overlayOpacity = position.x.interpolate({
      inputRange: type === "yes" ? [0, width * 0.5] : [-width * 0.5, 0],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    return {
      opacity: overlayOpacity,
      transform: [{ scale: overlayOpacity }],
    };
  };

  const handleScreenTap = () => {
    if (hasVoted && allProducts.length > 0) {
      console.log("Screen tapped, current state:", {
        currentIndex,
        totalItems: allProducts.length,
        currentProduct: currentProduct?.id,
      });

      // Reset all animations
      swipeAnimation.setValue(0);
      position.setValue({ x: 0, y: 0 });
      yesBarHeight.setValue(0);
      noBarHeight.setValue(0);

      // Check if there are more products to show
      if (currentIndex + 1 < allProducts.length) {
        // Move to the next product without cycling
        const nextIndex = currentIndex + 1;
        console.log("Moving to next product:", {
          previousIndex: currentIndex,
          nextIndex,
          nextProduct: allProducts[nextIndex],
        });
        setCurrentIndex(nextIndex);
        setCurrentProduct(allProducts[nextIndex]);
      } else {
        // User has reached the end of available posts
        console.log("Reached the end of available posts");

        // You can either:
        // 1. Show a message that there are no more posts
        // 2. Provide a refresh button to fetch new posts
        // 3. Or simply stay on the last item

        Alert.alert("End of Feed", "You've seen all available posts.");
      }

      setHasVoted(false);
      setVoteStats(null);
    }
  };

  const handleAddComment = async (productId: number, newComment: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("Comments")
        .insert([
          {
            userId: user.id,
            sharedItemId: productId,
            comment: newComment,
          },
        ])
        .select("*, user:User(name)")
        .single();

      if (error) throw error;

      setComments((prev) => ({
        ...prev,
        [productId]: [...(prev[productId] || []), data],
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await moderationAPI.deleteComment(commentId, session?.access_token);
      
      // Remove comment from local state
      setComments((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach(productId => {
          updated[productId] = updated[productId].filter(comment => comment.id !== commentId);
        });
        return updated;
      });
      
      Alert.alert("Success", "Comment deleted successfully.");
    } catch (error) {
      console.error("Error deleting comment:", error);
      Alert.alert("Error", "Failed to delete comment.");
    }
  };

  const handleOpenCommentReport = (commentId: number) => {
    console.log("Feed: Opening comment report alert for comment", commentId);
    
    Alert.prompt(
      "Report Comment",
      "Please select a reason for reporting this comment:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Submit", 
          onPress: async (reason) => {
            if (!reason?.trim()) return;
            try {
              await moderationAPI.reportComment(commentId, reason, undefined, session?.access_token);
              Alert.alert("Success", "Comment reported successfully.");
            } catch (error) {
              console.error("Feed: Error reporting comment:", error);
              Alert.alert("Error", "Failed to report comment.");
            }
          }
        },
      ],
      "plain-text",
      "",
      "default"
    );
  };

  const handleReportPost = async (reason: string, description?: string) => {
    if (!currentProduct) return;
    
    try {
      await moderationAPI.reportPost(currentProduct.id, reason, description, session?.access_token);
      Alert.alert("Success", "Post reported successfully.");
    } catch (error) {
      console.error("Error reporting post:", error);
      Alert.alert("Error", "Failed to report post.");
    }
  };

  useEffect(() => {
    const fetchComments = async () => {
      if (!currentProduct) return;

      try {
        const { data, error } = await supabase
          .from("Comments")
          .select("*, user:User(name)")
          .eq("sharedItemId", currentProduct.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setComments((prev) => ({
          ...prev,
          [currentProduct.id]: data,
        }));
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();
  }, [currentProduct?.id]);

  const handleShare = async () => {
    if (!currentProduct) return;

    try {
      const result = await Share.share({
        message: `Check out this product: ${currentProduct.title}\n${currentProduct.description}\n${currentProduct.url}`,
        title: currentProduct.title,
        url: currentProduct.url,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const getProfilePicUri = (user: { profile_pic?: string } | null) => {
    if (!user || !user.profile_pic) {
      return DEFAULT_PROFILE_PIC;
    }
    return { uri: user.profile_pic };
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshFeed(true).then(() => {
      setRefreshing(false);
      setCurrentIndex(0);
      if (allProducts.length > 0) {
        setCurrentProduct(allProducts[0]);
      }
      setHasVoted(false);
      setVoteStats(null);
    });
  }, [votedItemIds]);

  const refreshFeed = async (showNotifications = true) => {
    console.log("Refreshing feed...");
    console.log("Currently voted items:", votedItemIds);

    try {
      setLoading(true);

      // Make sure current item is tracked as voted if needed
      if (
        currentProduct &&
        hasVoted &&
        !votedItemIds.includes(currentProduct.id)
      ) {
        setVotedItemIds((prev) => [...prev, currentProduct.id]);
      }

      // Fetch new posts since the most recent one we've seen
      const newPosts = await fetchFeedPosts(null);

      console.log(`Found ${newPosts.length} new posts`);

      if (newPosts.length > 0) {
        // Update the most recent timestamp
        setMostRecentPostTimestamp(newPosts[0].createdAt);

        // Merge with existing posts, removing duplicates
        const existingIds = allProducts.map((p) => p.id);
        const uniqueNewPosts = newPosts.filter(
          (p) => !existingIds.includes(p.id)
        );

        if (uniqueNewPosts.length > 0) {
          setAllProducts((prev) => [...uniqueNewPosts, ...prev]);

          // Only reset to first item if user has voted on current
          if (hasVoted) {
            setCurrentIndex(0);
            setCurrentProduct(uniqueNewPosts[0]);
            setHasVoted(false);
          }
        } else if (showNotifications) {
          Alert.alert(
            "No New Content",
            "You've already seen all available posts. Check back later!"
          );
        }
      } else if (showNotifications) {
        Alert.alert(
          "No New Content",
          "You've already seen all available posts. Check back later!"
        );
      }
    } catch (error) {
      console.error("Error refreshing feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    console.log("Manual refresh button pressed");
    setLoading(true);

    try {
      // Get ALL posts first to see total count
      const { data: allPosts, error: countError } = await supabase
        .from("SharedItem")
        .select("id")
        .neq("userId", user?.id);

      console.log(
        "Total posts in database (excluding mine):",
        allPosts?.length || 0
      );

      // Get relationship data
      const [relationshipsResponse, followingResponse] = await Promise.all([
        supabase
          .from("Friends")
          .select("user_id")
          .eq("friend_id", user?.id)
          .eq("close_friend", true),
        supabase.from("Friends").select("friend_id").eq("user_id", user?.id),
      ]);

      const usersWithMeAsCloseFriend =
        relationshipsResponse.data?.map((rel) => rel.user_id) || [];
      const followingUsers =
        followingResponse.data?.map((rel) => rel.friend_id) || [];

      console.log(
        "Users who have me as close friend:",
        usersWithMeAsCloseFriend.length
      );
      console.log("Users I follow:", followingUsers.length);

      // Get all posts with user details
      const { data, error } = await supabase
        .from("SharedItem")
        .select("*, user:User(id, username, profile_pic)")
        .neq("userId", user?.id)
        .order("createdAt", { ascending: false });

      if (error) throw error;

      // Filter posts by audience rules - CORRECTED LOGIC
      const audienceFilteredData =
        data?.filter((post) => {
          // Default to followers if no audience_type specified
          const audienceType = post.audience_type || "followers";

          if (audienceType === "followers") {
            // Show post if I follow the creator
            return followingUsers.includes(post.userId);
          }

          if (audienceType === "closeFriends") {
            // Show post if the creator has me as a close friend
            return usersWithMeAsCloseFriend.includes(post.userId);
          }

          return false;
        }) || [];

      console.log(
        "Posts after audience filtering:",
        audienceFilteredData.length
      );

      // Remove already voted posts
      const unvotedItems = audienceFilteredData.filter(
        (post) => !votedItemIds.includes(post.id)
      );
      console.log("Final unvoted posts:", unvotedItems.length);

      if (unvotedItems.length > 0) {
        setAllProducts(unvotedItems);
        setCurrentIndex(0);
        setCurrentProduct(unvotedItems[0]);
        setHasVoted(false);
        setVoteStats(null);
      } else {
        Alert.alert(
          "No New Content",
          "You've already seen all available posts. Check back later!"
        );
      }
    } catch (error) {
      console.error("Error in manual refresh:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFocused = useIsFocused();
  const [mostRecentPostTimestamp, setMostRecentPostTimestamp] = useState<
    string | null
  >(null);

  // Check for new posts when the feed is focused
  useEffect(() => {
    if (isFocused && user?.id) {
      checkForNewPosts();
    }
  }, [isFocused, user?.id]);

  // Check for new posts
  const checkForNewPosts = async () => {
    try {
      const lastPostTime = await AsyncStorage.getItem("lastPostCreated");

      if (
        lastPostTime &&
        (!mostRecentPostTimestamp ||
          new Date(lastPostTime) > new Date(mostRecentPostTimestamp))
      ) {
        console.log("New post detected, refreshing feed");
        refreshFeed(false); // Silent refresh
      }
    } catch (error) {
      console.error("Error checking for new posts:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (allProducts.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No products available</Text>
      </View>
    );
  }

  const ResultsOverlay = () => {
    // Remove the slideUp animation to simplify
    return hasVoted ? (
      <View
        style={[
          styles.resultsOverlay,
          {
            zIndex: 50,
            elevation: 50,
          },
        ]}
      >
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Here's what people think</Text>

          <View style={styles.barsContainer}>
            <View style={styles.barColumn}>
              <View style={styles.barBackground}>
                <Animated.View
                  style={[
                    styles.bar,
                    styles.noBar,
                    {
                      height: noBarHeight.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.percentageText}>{voteStats?.no || 0}%</Text>
              <Text style={styles.barLabel}>No</Text>
            </View>
            <View style={styles.barColumn}>
              <View style={styles.barBackground}>
                <Animated.View
                  style={[
                    styles.bar,
                    styles.yesBar,
                    {
                      height: yesBarHeight.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.percentageText}>{voteStats?.yes || 0}%</Text>
              <Text style={styles.barLabel}>Yes</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null;
  };

  // Card with info
  return (
    <View style={styles.container}>
      {/* Add pull-to-refresh wrapper */}
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        colors={["#3498db"]}
      >
        {/* Your existing content */}
      </RefreshControl>

      {/* Squiggle Line - Positioned Behind Everything */}
      <SvgXml xml={profileSvg} style={styles.squiggle} />

      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Text style={styles.logo}>hot or flop?</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleManualRefresh}
          >
            <MaterialIcons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Card Section */}
      <View style={styles.productCardWrapper}>
        {currentProduct && !hasVoted && (
          <Animated.View
            style={[
              styles.productCard,
              getCardStyle(),
              {
                opacity: cardVisibility,
                zIndex: hasVoted ? -1 : 1,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.userHeaderContainer}>
              <TouchableOpacity
                style={styles.userContainer}
                onPress={() => {
                  // Make sure we're passing the correct user_id parameter
                  router.push({
                    pathname: "/friendprofile", // Change this to a different route
                    params: { userId: currentProduct.user.id },
                  });
                }}
              >
                <Image
                  source={getProfilePicUri(currentProduct?.user)}
                  style={styles.profilePic}
                  onError={(e) => {
                    console.log(
                      "Profile image failed to load:",
                      e.nativeEvent.error
                    );
                  }}
                />
                <Text style={styles.username}>
                  @{currentProduct.user.username}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setReportModalVisible(true)}
                style={styles.reportButton}
              >
                <FontAwesome name="flag" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <Stack.Screen options={{ headerShown: false }} />
            {/* <Text
                style={styles.username}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                @{currentProduct?.user?.username || "user"}
              </Text>
            </TouchableOpacity> */}

            <Text
              style={styles.description}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {currentProduct.description}
            </Text>

            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentProduct.imageUrl }}
                style={[styles.productImage, { backgroundColor: "#f0f0f0" }]}
                progressiveRenderingEnabled={true}
                resizeMode="cover"
                onError={(e) => {
                  console.log(
                    "Product image failed to load:",
                    e.nativeEvent.error
                  );
                }}
              />
            </View>

            <Text
              style={styles.productTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {currentProduct.title}
            </Text>
            {currentProduct?.url && isValidUrl(currentProduct.url) ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(currentProduct.url)}
                style={styles.linkContainer}
              >
                <Text
                  style={styles.linkText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentProduct.url.includes("amazon")
                    ? "Amazon"
                    : "See Item on Website"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.linkContainer}>
                <Text
                  style={[
                    styles.linkText,
                    {
                      color: "#888",
                      textDecorationLine: "none",
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentProduct.url}
                </Text>
              </View>
            )}

            <Text style={styles.priceText}>
              ${currentProduct.price?.toFixed(2) || "0.00"}
            </Text>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setCommentsModalVisible(true)}
              >
                <FontAwesome name="comment-o" size={20} color="#666" />
                <Text style={styles.actionText}>Comments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
              >
                <FontAwesome name="share" size={20} color="#666" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isItemWishlisted(currentProduct.id) &&
                    styles.activeActionButton,
                ]}
                onPress={() => handleToggleWishlist(currentProduct.id)}
              >
                <FontAwesome
                  name={
                    isItemWishlisted(currentProduct.id)
                      ? "bookmark"
                      : "bookmark-o"
                  }
                  size={20}
                  color={
                    isItemWishlisted(currentProduct.id) ? COLORS.accent : "#333"
                  }
                />
                <Text
                  style={[
                    styles.actionText,
                    isItemWishlisted(currentProduct.id) &&
                      styles.activeActionText,
                  ]}
                >
                  {isItemWishlisted(currentProduct.id) ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Swipe Indicators */}
      {currentProduct && !hasVoted && (
        <View style={styles.swipeIndicators}>
          <View style={styles.swipeIndicator}>
            <Text style={styles.swipeText}>Flop</Text>
            {/* <FontAwesome name="arrow-left" size={24} style={styles.swipeArrow} /> */}
          </View>
          <View style={styles.swipeIndicator}>
            {/* <FontAwesome name="arrow-right" size={24} style={styles.swipeArrow} /> */}
            <Text style={styles.swipeText}>Hot</Text>
          </View>
        </View>
      )}

      <CommentsModal
        visible={isCommentsModalVisible}
        comments={currentProduct ? comments[currentProduct.id] || [] : []}
        onClose={() => setCommentsModalVisible(false)}
        postOwnerId={currentProduct?.user_id}
        addComment={(newComment) => {
          if (currentProduct) {
            handleAddComment(currentProduct.id, newComment);
          }
        }}
        onDeleteComment={handleDeleteComment}
        onReportComment={handleOpenCommentReport}
      />

      <ReportModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportPost}
        title="Report Post"
      />

      {/* Results Overlay (After Voting) */}
      {hasVoted && currentProduct && <ResultsOverlay />}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === "ios"
        ? StatusBar.currentHeight || 60
        : StatusBar.currentHeight || 40,
    paddingHorizontal: 12, // Small buffer on left and right
  },
  productCard: {
    width: "100%",
    height: 580, // Fixed height for all cards
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    marginTop: 0,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    justifyContent: "space-between", // This will help distribute content evenly
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8, // Reduced from 12
    height: 40, // Fixed height
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#E1E1E1", // Light gray background for empty images
  },
  username: {
    fontWeight: "bold",
    fontSize: 14, // Reduced from 16
    flex: 1, // Take remaining space
    flexShrink: 1, // Allow text to shrink
  },
  description: {
    fontSize: 14, // Reduced from 16
    marginBottom: 8, // Reduced from 12
    lineHeight: 18, // Reduced from 22
    height: 36, // Fixed height for 2 lines
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 320, // Fixed height, reduced from 350
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8, // Reduced from 12
    backgroundColor: "#f0f0f0", // Background color for loading state
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // This will ensure the image covers the container
  },
  productTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: "bold",
    marginBottom: 4, // Reduced from 6
    height: 40, // Fixed height for 2 lines
    overflow: "hidden",
  },
  linkContainer: {
    marginTop: 4, // Reduced from 8
    marginBottom: 4, // Reduced from 8
    height: 20, // Fixed height
  },
  linkText: {
    color: "#0066CC",
    fontSize: 14, // Reduced from 16
    textDecorationLine: "underline",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8, // Reduced from 12
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4, // Reduced from 8
    height: 24, // Fixed height
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 12, // Reduced font size
  },
  resultsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  resultsContainer: {
    width: "100%",
    height: "80%",
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Mandali",
    color: "#000",
    marginBottom: 40,
    textAlign: "center",
  },
  barsContainer: {
    flexDirection: "row",
    width: "100%",
    height: 300,
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginTop: "auto",
    paddingBottom: 40,
  },
  barColumn: {
    alignItems: "center",
    width: 80,
  },
  barBackground: {
    width: "100%",
    height: 250,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 15,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  yesBar: {
    backgroundColor: "#E0CA3C",
  },
  noBar: {
    backgroundColor: "#A799B7",
  },
  percentageText: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Mandali",
    marginTop: 10,
    color: "#000",
  },
  barLabel: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  nextButton: {
    backgroundColor: "#ffacac",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Mandali",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  commentText: {
    fontSize: 14,
    fontFamily: FONTS.mandali,
    color: "#333",
    marginBottom: 5,
  },
  commentsButton: {
    marginLeft: 5,
    fontFamily: FONTS.mandali,
  },
  shopNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  visitText: {
    fontSize: 16,
    color: "#000",
    fontFamily: FONTS.mandali,
  },
  shopName: {
    fontSize: 16,
    color: "#3F78FF",
    fontFamily: FONTS.mandali,
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    marginBottom: 5,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.primary,
    position: "absolute", // Fixes the nav at the top
    top: 35,
    left: 0,
    right: 0,
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
    padding: 8,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.lg,
    position: "relative",
    alignItems: "center",
  },
  squiggle: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  commentsPreview: {
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  previewComment: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  previewCommentAuthor: {
    fontWeight: "600",
    color: "#000",
    fontSize: 12,
    fontFamily: FONTS.mandali,
  },
  previewCommentText: {
    color: "#666",
    fontSize: 12,
    fontFamily: FONTS.mandali,
    flex: 1,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1, // Take up remaining space
  },
  userProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  logoContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  refreshButton: {
    padding: 8,
    position: "absolute",
    right: 16,
    top: 0,
  },
  productCardWrapper: {
    position: "relative",
    width: "100%",
    height: 580,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  activeActionButton: {
    opacity: 1,
  },
  activeActionText: {
    color: "#333",
    fontWeight: "600",
  },
  reportButton: {
    padding: 8,
    marginLeft: 8, // Small spacing from username
  },
  userHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  swipeIndicators: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  swipeIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  swipeText: {
    fontSize: 23,
    fontFamily: "Mandali",
    fontWeight: "bold",
    marginHorizontal: 8,
    color: COLORS.accent,
  },
  swipeArrow: {
    color: COLORS.accent,
    marginBottom: 40,
  },
});
