import {
  View,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Text,
  ScrollView,
  Linking,
  StatusBar,
} from "react-native";
import React, { useEffect, useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, FONTS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { createClient } from "@supabase/supabase-js";
import CommentsModal from "../CommentsModal";
import ShareModal from "../ShareModal";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
import Ratings from "./Ratings";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Use a reliable online default profile picture URL
const DEFAULT_PROFILE_PIC = require("../../assets/default.jpg");

interface ImageModalProps {
  isVisible: boolean;
  imageUrl: string;
  onClose: () => void;
  item: {
    id: number;
    title: string;
    description?: string;
    price?: number;
    yes_count: number;
    no_count: number;
    total_count: number;
    url?: string;
    user?: {
      id: string;
      username: string;
      profile_pic?: string;
    };
  };
}

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

const isValidUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const getProfilePicUri = (
  user: { profile_pic?: string } | null | undefined
) => {
  if (!user || !user.profile_pic) {
    return DEFAULT_PROFILE_PIC;
  }
  return { uri: user.profile_pic };
};

const FrontContent = ({
  imageUrl,
  item,
}: {
  imageUrl: string;
  item: ImageModalProps["item"];
}) => {
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Check if item is already in wishlist
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!user?.id || !item?.id) return;

      try {
        const { data, error } = await supabase
          .from("Wishlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("item_id", item.id)
          .single();

        if (error && error.code !== 'PGRST116') { 
          console.error("Error checking wishlist status:", error);
          return;
        }

        setIsWishlisted(!!data);
      } catch (error) {
        console.error("Error checking wishlist status:", error);
      }
    };

    checkWishlistStatus();
  }, [user?.id, item?.id]);

  const handleWishlistToggle = async () => {
    if (!user?.id || !item?.id) return;

    try {
      if (isWishlisted) {
        // Remove from wishlist
        const { error } = await supabase
          .from("Wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", item.id);

        if (error) {
          console.error("Error removing from wishlist:", error);
          return;
        }

        setIsWishlisted(false);
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from("Wishlist")
          .insert({
            user_id: user.id,
            item_id: item.id,
          });

        if (error) {
          console.error("Error adding to wishlist:", error);
          return;
        }

        setIsWishlisted(true);
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
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

  useEffect(() => {
    const fetchComments = async () => {
      if (!item) return;

      try {
        const { data, error } = await supabase
          .from("Comments")
          .select("*, user:User(name)")
          .eq("sharedItemId", item.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setComments((prev) => ({
          ...prev,
          [item.id]: data,
        }));
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();
  }, [item?.id]);

  const handleShare = () => {
    if (!item) return;
    setShareModalVisible(true);
  };
  // const {user} = useAuth();

  return (
    <View style={styles.cardContent}>
      {/* User Info */}
      {user && (
        <TouchableOpacity style={styles.userContainer}>
          <Image
            source={getProfilePicUri(item.user)}
            style={styles.profilePic}
            onError={(e) => {
              console.log("Profile image failed to load:", e.nativeEvent.error);
            }}
          />
          <Text style={styles.username}>@{user.user_metadata.name}</Text>
        </TouchableOpacity>
      )}

      {/* Description */}
      <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
        {item.description}
      </Text>

      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
          onError={(e) => {
            console.log("Product image failed to load:", e.nativeEvent.error);
          }}
        />
      </View>

      {/* Product Title */}
      <Text style={styles.productTitle} numberOfLines={2} ellipsizeMode="tail">
        {item.title}
      </Text>

      {/* URL Link */}
      {item?.url && isValidUrl(item.url) ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(item.url!)}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">
            {item.url.includes("amazon") ? "Amazon" : "See Item on Website"}
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
            {item.url}
          </Text>
        </View>
      )}

      {/* Price */}
      <Text style={styles.priceText}>${item.price?.toFixed(2) || "0.00"}</Text>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsCommentsModalVisible(true)}
        >
          <FontAwesome name="comment-o" size={20} color="#666" />
          <Text style={styles.actionText}>Comments</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <FontAwesome name="share" size={20} color="#666" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isWishlisted && styles.activeActionButton,
          ]}
          onPress={handleWishlistToggle}
        >
          <FontAwesome
            name={isWishlisted ? "bookmark" : "bookmark-o"}
            size={20}
            color={isWishlisted ? COLORS.accent : "#333"}
          />
          <Text
            style={[styles.actionText, isWishlisted && styles.activeActionText]}
          >
            {isWishlisted ? "Saved" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <CommentsModal
        visible={isCommentsModalVisible}
        comments={item ? comments[item.id] || [] : []}
        onClose={() => setIsCommentsModalVisible(false)}
        addComment={(newComment) => {
          if (item) {
            handleAddComment(item.id, newComment);
          }
        }}
      />

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        post={{
          id: item.id,
          title: item.title,
          description: item.description,
          imageUrl: imageUrl,
          price: item.price,
          url: item.url || '',
          user: {
            id: item.user?.id || '',
            username: item.user?.username || '',
            profile_pic: item.user?.profile_pic,
          },
        }}
      />
    </View>
  );
};

interface FlipCardProps {
  isFlipped: { value: boolean };
  cardStyle: any;
  FrontContent: React.ReactNode;
  BackContent: React.ReactNode;
}

const FlipCard = ({
  isFlipped,
  cardStyle,
  FrontContent,
  BackContent,
}: FlipCardProps) => {
  const regularCardAnimatedStyle = useAnimatedStyle(() => {
    const spinValue = interpolate(Number(isFlipped.value), [0, 1], [0, 180]);
    const rotateValue = withTiming(`${spinValue}deg`, { duration: 500 });

    return {
      transform: [{ rotateY: rotateValue }],
      opacity: withTiming(isFlipped.value ? 0 : 1, { duration: 250 }),
    };
  });

  const flippedCardAnimatedStyle = useAnimatedStyle(() => {
    const spinValue = interpolate(Number(isFlipped.value), [0, 1], [180, 360]);
    const rotateValue = withTiming(`${spinValue}deg`, { duration: 500 });

    return {
      transform: [{ rotateY: rotateValue }],
      opacity: withTiming(isFlipped.value ? 1 : 0, { duration: 250 }),
    };
  });

  return (
    <View style={styles.flipCardContainer}>
      <Animated.View
        style={[styles.cardBase, cardStyle, regularCardAnimatedStyle]}
      >
        {FrontContent}
      </Animated.View>
      <Animated.View
        style={[styles.cardBase, cardStyle, flippedCardAnimatedStyle]}
      >
        {BackContent}
      </Animated.View>
    </View>
  );
};

export default function ImageModal({
  isVisible,
  imageUrl,
  onClose,
  item,
}: ImageModalProps) {
  const isFlipped = useSharedValue(false);

  const handleFlip = () => {
    isFlipped.value = !isFlipped.value;
  };

  if (!isVisible || !item) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalWrapper}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome name="times" size={24} color={COLORS.accent} />
          </TouchableOpacity>
          <FlipCard
            isFlipped={isFlipped}
            cardStyle={styles.modalContent}
            FrontContent={<FrontContent imageUrl={imageUrl} item={item} />}
            BackContent={<Ratings item={item} />}
          />

          <TouchableOpacity style={styles.flipButton} onPress={handleFlip}>
            <Text style={styles.flipText}>Flip</Text>
            <FontAwesome
              name="refresh"
              size={18}
              color={COLORS.accent}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    // marginTop: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWrapper: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.72,
    position: "relative",
    zIndex: 1,
  },
  flipCardContainer: {
    width: "100%",
    height: "100%",
    zIndex: 2,
  },
  cardBase: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 0.8,
    justifyContent: "space-between",
  },
  backContent: {
    backgroundColor: COLORS.primary,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    // marginBottom: 10,
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#E1E1E1",
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  description: {
    fontSize: 14,
    marginVertical: 12,
    // marginBottom: 8,
    // lineHeight: 14,
    // height: 36,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 320,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    height: 40,
    overflow: "hidden",
  },
  linkContainer: {
    marginTop: 4,
    marginBottom: 4,
    height: 20,
  },
  linkText: {
    color: "#0066CC",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    height: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 12,
  },
  activeActionButton: {
    opacity: 1,
  },
  activeActionText: {
    color: "#333",
    fontWeight: "600",
  },
  flipButton: {
    position: "absolute",
    top: "25%",
    right: -15,
    backgroundColor: COLORS.accent,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 25,
    fontFamily: FONTS.mandali,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    transform: [{ translateY: -20 }],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 3,
  },
  flipText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
    fontFamily: FONTS.mandali,
    marginLeft: 10,
  },
  closeButton: {
    position: "absolute",
    top: -15,
    right: -15,
    backgroundColor: "white",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
