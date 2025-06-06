import React from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

const DEFAULT_PROFILE_PIC = require('../assets/default.jpg');
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SharedPostData {
  postId: number;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  url: string;
  originalPoster: {
    id: string;
    username: string;
    profile_pic?: string;
  };
  sharedBy: {
    id: string;
    username: string;
  };
}

interface SharedPostModalProps {
  visible: boolean;
  onClose: () => void;
  postData: SharedPostData;
}

export default function SharedPostModal({ visible, onClose, postData }: SharedPostModalProps) {
  const getProfilePicUri = (profilePic?: string) => {
    if (!profilePic) return DEFAULT_PROFILE_PIC;
    return { uri: profilePic };
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Shared Post</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Original Poster Info */}
            <View style={styles.posterSection}>
              <Image
                source={getProfilePicUri(postData.originalPoster.profile_pic)}
                style={styles.posterAvatar}
              />
              <View style={styles.posterInfo}>
                <Text style={styles.posterUsername}>
                  @{postData.originalPoster.username}
                </Text>
                <Text style={styles.sharedByText}>
                  Shared by @{postData.sharedBy.username}
                </Text>
              </View>
            </View>

            {/* Post Description */}
            {postData.description && (
              <Text style={styles.description}>
                {postData.description}
              </Text>
            )}

            {/* Post Image */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: postData.imageUrl }}
                style={styles.postImage}
                resizeMode="cover"
                onError={(e) => {
                  console.log('Shared post modal image failed to load:', e.nativeEvent.error);
                }}
              />
            </View>

            {/* Post Title */}
            <Text style={styles.title}>
              {postData.title}
            </Text>

            {/* URL Link */}
            {postData.url && isValidUrl(postData.url) ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(postData.url)}
                style={styles.linkContainer}
              >
                <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">
                  {postData.url.includes("amazon") ? "Amazon" : "See Item on Website"}
                </Text>
              </TouchableOpacity>
            ) : (
              postData.url && (
                <View style={styles.linkContainer}>
                  <Text
                    style={[styles.linkText, { color: "#888", textDecorationLine: "none" }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {postData.url}
                  </Text>
                </View>
              )
            )}

            {/* Price */}
            <Text style={styles.price}>
              ${postData.price?.toFixed(2) || '0.00'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    fontFamily: FONTS.mandali,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  posterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  posterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  posterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  posterUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    fontFamily: FONTS.mandali,
  },
  sharedByText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
    lineHeight: 24,
  },
  linkContainer: {
    marginBottom: 8,
  },
  linkText: {
    color: '#0066CC',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
}); 