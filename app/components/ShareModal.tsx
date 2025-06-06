import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { DMService, Friend } from '../lib/dmService';
import { useAuth } from '../context/AuthContext';

const DEFAULT_PROFILE_PIC = require('../assets/default.jpg');

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: number;
    title: string;
    description?: string;
    imageUrl?: string;
    price?: number;
    url: string;
    user: {
      id: string;
      username: string;
      profile_pic?: string;
    };
  } | null;
}

export default function ShareModal({ visible, onClose, post }: ShareModalProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null); // friend ID being shared to

  useEffect(() => {
    if (visible && user?.id) {
      loadFriends();
    }
  }, [visible, user?.id]);

  const loadFriends = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const friendsList = await DMService.getFriends(user.id);
      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
      Alert.alert('Error', 'Failed to load friends list');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToFriend = async (friend: Friend) => {
    if (!post || !user?.id || sharing) return;

    setSharing(friend.id);

    try {
      // Create a JSON string with post data for shared_post message type
      const sharedPostData = JSON.stringify({
        postId: post.id,
        title: post.title,
        description: post.description,
        imageUrl: post.imageUrl,
        price: post.price,
        url: post.url,
        originalPoster: {
          id: post.user.id,
          username: post.user.username,
          profile_pic: post.user.profile_pic,
        },
        sharedBy: {
          id: user.id,
          username: user.user_metadata?.username || user.email,
        },
      });

      await DMService.sendMessage(
        user.id,
        friend.id,
        `Shared a post: ${post.title}`,
        'shared_post',
        undefined,
        undefined,
        sharedPostData
      );

      Alert.alert(
        'Shared!',
        `Post shared with @${friend.username}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    } finally {
      setSharing(null);
    }
  };

  const getProfilePicUri = (profilePic?: string) => {
    if (!profilePic) return DEFAULT_PROFILE_PIC;
    return { uri: profilePic };
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => handleShareToFriend(item)}
      disabled={!!sharing}
    >
      <Image
        source={getProfilePicUri(item.profile_pic)}
        style={styles.friendAvatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendUsername}>@{item.username}</Text>
        {item.name && <Text style={styles.friendName}>{item.name}</Text>}
      </View>
      {sharing === item.id ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <FontAwesome name="chevron-right" size={16} color="#999" />
      )}
    </TouchableOpacity>
  );

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share to</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          <View style={styles.postPreview}>
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
            />
            <View style={styles.postInfo}>
              <Text style={styles.postTitle} numberOfLines={2}>
                {post.title}
              </Text>
              <Text style={styles.postPrice}>
                ${post.price?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="users" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No friends found</Text>
              <Text style={styles.emptySubtext}>
                Add some friends to share posts with them!
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              renderItem={renderFriend}
              keyExtractor={(item) => item.id}
              style={styles.friendsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONTS.mandali,
    color: COLORS.black,
  },
  closeButton: {
    padding: 8,
  },
  postPreview: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  postImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  postInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  postPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    fontFamily: FONTS.mandali,
  },
  friendName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
}); 