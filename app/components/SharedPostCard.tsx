import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import SharedPostModal from './SharedPostModal';

const DEFAULT_PROFILE_PIC = require('../assets/default.jpg');

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

interface SharedPostCardProps {
  sharedPostData: string; // JSON string
  isMyMessage: boolean;
}

export default function SharedPostCard({ sharedPostData, isMyMessage }: SharedPostCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  let postData: SharedPostData;
  
  try {
    postData = JSON.parse(sharedPostData);
  } catch (error) {
    console.error('Error parsing shared post data:', error);
    return (
      <View style={[styles.errorCard, isMyMessage ? styles.myCard : styles.otherCard]}>
        <Text style={styles.errorText}>Unable to load shared post</Text>
      </View>
    );
  }

  const getProfilePicUri = (profilePic?: string) => {
    if (!profilePic) return DEFAULT_PROFILE_PIC;
    return { uri: profilePic };
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isMyMessage ? styles.myCard : styles.otherCard]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        {/* Post Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: postData.imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
            defaultSource={require('../assets/default.jpg')}
            onError={(e) => {
              console.log('Shared post image failed to load:', e.nativeEvent.error);
            }}
            onLoadStart={() => {
              // Image started loading
            }}
            onLoadEnd={() => {
              // Image finished loading
            }}
          />
          <View style={styles.playIconOverlay}>
            <FontAwesome name="external-link" size={16} color="white" />
          </View>
        </View>

        {/* Post Info */}
        <View style={styles.postInfo}>
          <Text style={styles.postTitle} numberOfLines={2}>
            {postData.title}
          </Text>
          
          <View style={styles.posterInfo}>
            <Image
              source={getProfilePicUri(postData.originalPoster.profile_pic)}
              style={styles.posterAvatar}
            />
            <Text style={styles.posterUsername}>
              @{postData.originalPoster.username}
            </Text>
          </View>
          
          <Text style={styles.price}>
            ${postData.price?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </TouchableOpacity>

      <SharedPostModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        postData={postData}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 360,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginVertical: 4,
    flexShrink: 0,
  },
  myCard: {
    alignSelf: 'flex-end',
  },
  otherCard: {
    alignSelf: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    width: 280,
    height: 280,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  postInfo: {
    padding: 12,
    height: 80,
    backgroundColor: 'white',
    justifyContent: 'space-between',
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    lineHeight: 18,
    height: 36,
    marginBottom: 4,
  },
  posterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginBottom: 4,
  },
  posterAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
    backgroundColor: '#eee',
  },
  posterUsername: {
    fontSize: 12,
    color: '#666',
    fontFamily: FONTS.mandali,
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    height: 16,
    textAlign: 'right',
  },
  errorCard: {
    width: 280,
    height: 360,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
}); 