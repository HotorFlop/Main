import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { DMService, Conversation } from '../../lib/dmService';
import { COLORS, FONTS } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    if (!user?.id) return;
    
    try {
      const convos = await DMService.getConversations(user.id);
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  // Refresh conversations when screen comes into focus
  // This ensures unread counts are updated after returning from chat
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadConversations();
      }
    }, [user?.id])
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push({
        pathname: '/chat',
        params: {
          userId: item.user_id,
          username: item.user.username,
          profilePic: item.user.profile_pic || ''
        }
      })}
    >
      <Image
        source={
          item.user.profile_pic
            ? { uri: item.user.profile_pic }
            : require('../../assets/default.jpg')
        }
        style={styles.profilePic}
      />
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.username}>@{item.user.username}</Text>
          <Text style={styles.timestamp}>
            {formatTime(item.last_message_time)}
          </Text>
        </View>
        <View style={styles.messagePreview}>
          <Text
            style={[
              styles.lastMessage,
              item.unread_count > 0 && styles.unreadMessage
            ]}
            numberOfLines={1}
          >
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newMessageButton}
          onPress={() => router.push('/new-conversation')}
        >
          <FontAwesome name="edit" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.user_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="comments-o" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start a conversation with your friends
            </Text>
            <TouchableOpacity
              style={styles.startConversationButton}
              onPress={() => router.push('/new-conversation')}
            >
              <Text style={styles.startConversationText}>Start Messaging</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: FONTS.mandali,
    color: '#000',
  },
  newMessageButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.mandali,
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    fontFamily: FONTS.mandali,
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    fontFamily: FONTS.mandali,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONTS.mandali,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 4,
    textAlign: 'center',
    fontFamily: FONTS.mandali,
  },
  startConversationButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  startConversationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONTS.mandali,
  },
}); 