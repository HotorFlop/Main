import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DMService, Friend } from '../lib/dmService';
import { COLORS, FONTS } from '../constants/theme';

export default function NewConversation() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFriends();
  }, [user?.id]);

  useEffect(() => {
    // Filter friends based on search query
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (friend.name && friend.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    if (!user?.id) return;

    try {
      const friendsList = await DMService.getFriends(user.id);
      setFriends(friendsList);
      setFilteredFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
      Alert.alert('Error', 'Failed to load friends list');
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (friend: Friend) => {
    try {
      // Check if conversation already exists
      const conversations = await DMService.getConversations(user!.id);
      const existingConvo = conversations.find(convo => convo.user_id === friend.id);

      if (existingConvo) {
        // Navigate to existing conversation
        router.push({
          pathname: '/chat',
          params: {
            userId: friend.id,
            username: friend.username,
            profilePic: friend.profile_pic || ''
          }
        });
      } else {
        // Start new conversation by navigating to chat
        // The chat screen will handle the first message
        router.push({
          pathname: '/chat',
          params: {
            userId: friend.id,
            username: friend.username,
            profilePic: friend.profile_pic || ''
          }
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => startConversation(item)}
    >
      <Image
        source={
          item.profile_pic
            ? { uri: item.profile_pic }
            : require('../assets/default.jpg')
        }
        style={styles.profilePic}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        {item.name && (
          <Text style={styles.displayName}>{item.name}</Text>
        )}
      </View>
      <FontAwesome name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="chevron-left" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>New Conversation</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>New Conversation</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <FontAwesome name="times-circle" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Friends List */}
      <FlatList
        data={filteredFriends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        style={styles.friendsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchQuery.length > 0 ? (
              <>
                <FontAwesome name="search" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No friends found</Text>
                <Text style={styles.emptySubtext}>
                  Try searching with a different name or username
                </Text>
              </>
            ) : (
              <>
                <FontAwesome name="user-plus" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySubtext}>
                  Add some friends to start messaging!
                </Text>
                <TouchableOpacity
                  style={styles.addFriendsButton}
                  onPress={() => router.push('/profile')}
                >
                  <Text style={styles.addFriendsText}>Find Friends</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
        ListHeaderComponent={
          friends.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Choose a friend to message ({filteredFriends.length})
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: FONTS.mandali,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.mandali,
    color: '#000',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.mandali,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.mandali,
    color: '#000',
  },
  displayName: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.mandali,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    fontFamily: FONTS.mandali,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FONTS.mandali,
  },
  addFriendsButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  addFriendsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.mandali,
  },
}); 