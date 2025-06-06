import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { DMService, Message } from '../lib/dmService';
import { COLORS, FONTS } from '../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import SharedPostCard from '../components/SharedPostCard';

export default function Chat() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract params with proper typing
  const otherUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const otherUsername = Array.isArray(params.username) ? params.username[0] : params.username;
  const otherProfilePic = Array.isArray(params.profilePic) ? params.profilePic[0] : params.profilePic;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user?.id && otherUserId) {
      loadMessages();
    }
  }, [user?.id, otherUserId]);

  // Mark messages as read when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id && otherUserId) {
        markMessagesAsRead();
        // Reload messages to catch any new ones (like shared posts)
        loadMessages();
      }
    }, [user?.id, otherUserId])
  );

  const loadMessages = async () => {
    if (!user?.id || !otherUserId) return;

    try {
      const msgs = await DMService.getMessages(user.id, otherUserId);
      setMessages(msgs); // Don't reverse - keep chronological order (newest at bottom)
      
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user?.id || !otherUserId) return;

    try {
      await DMService.markMessagesAsRead(user.id, otherUserId);
      console.log('Messages marked as read for conversation with', otherUserId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !otherUserId || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await DMService.sendMessage(
        user.id,
        otherUserId,
        messageContent
      );

      if (sentMessage) {
        setMessages(prev => [...prev, sentMessage]);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;
    const showTimestamp = index === 0 || 
      new Date(item.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000; // 5 minutes

    if (item.message_type === 'shared_post') {
      return (
        <View style={styles.messageContainer}>
          {showTimestamp && (
            <Text style={styles.messageTimestamp}>
              {formatMessageTime(item.created_at)}
            </Text>
          )}
          <SharedPostCard 
            sharedPostData={item.shared_post_data || '{}'}
            isMyMessage={isMyMessage}
          />
        </View>
      );
    }

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <Text style={styles.messageTimestamp}>
            {formatMessageTime(item.created_at)}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image
            source={
              otherProfilePic
                ? { uri: otherProfilePic }
                : require('../assets/default.jpg')
            }
            style={styles.headerProfilePic}
          />
          <Text style={styles.headerUsername}>@{otherUsername}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Future: Add call, video call icons here */}
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        onLayout={() => {
          // Scroll to bottom when layout is complete
          if (messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 50);
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="comments-o" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Start the conversation!</Text>
            <Text style={styles.emptySubtext}>
              Send a message to @{otherUsername}
            </Text>
          </View>
        }
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome 
              name="send" 
              size={16} 
              color={newMessage.trim() ? '#fff' : '#ccc'} 
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProfilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONTS.mandali,
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 2,
  },
  messageTimestamp: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    fontFamily: FONTS.mandali,
    marginVertical: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 2,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    backgroundColor: '#e9ecef',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FONTS.mandali,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    maxHeight: 100,
    fontSize: 16,
    fontFamily: FONTS.mandali,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ddd',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
    fontFamily: FONTS.mandali,
  },
}); 