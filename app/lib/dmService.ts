import { supabase } from './supabase';

export interface Message {
  id: number;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  message_type?: string;
  media_url?: string;
  edited_at?: string;
  reply_to_id?: number;
}

export interface Conversation {
  user_id: string;
  user: {
    id: string;
    username: string;
    name?: string;
    profile_pic?: string;
  };
  last_message: string;
  last_message_time: string;
  unread_count: number;
  last_sender_id: string;
}

export interface Friend {
  id: string;
  username: string;
  name?: string;
  profile_pic?: string;
}

export class DMService {
  /**
   * Get all conversations for a user
   * Returns conversations sorted by most recent message
   */
  static async getConversations(userId: string): Promise<Conversation[]> {
    try {
      // Get all messages where user is sender or receiver
      const { data: dmData, error } = await supabase
        .from('DMs')
        .select(`
          id,
          sender_id,
          receiver_id,
          message,
          created_at,
          read
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!dmData || dmData.length === 0) return [];

      // Group messages by conversation partner
      const conversationMap = new Map<string, any>();
      
      dmData.forEach(dm => {
        const partnerId = dm.sender_id === userId ? dm.receiver_id : dm.sender_id;
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            user_id: partnerId,
            last_message: dm.message,
            last_message_time: dm.created_at,
            last_sender_id: dm.sender_id,
            unread_count: 0,
          });
        }
        
        const conversation = conversationMap.get(partnerId);
        
        // Update if this message is newer (since we ordered by created_at DESC, first occurrence is newest)
        if (new Date(dm.created_at) > new Date(conversation.last_message_time)) {
          conversation.last_message = dm.message;
          conversation.last_message_time = dm.created_at;
          conversation.last_sender_id = dm.sender_id;
        }
        
        // Count unread messages (messages sent TO this user that are unread)
        if (!dm.read && dm.receiver_id === userId) {
          conversation.unread_count++;
        }
      });

      // Get user details for conversation partners
      const partnerIds = Array.from(conversationMap.keys());
      
      if (partnerIds.length === 0) return [];
      
      const { data: userData, error: userError } = await supabase
        .from('User')
        .select('id, username, name, profile_pic')
        .in('id', partnerIds);

      if (userError) throw userError;

      // Combine conversation data with user details
      const conversations = Array.from(conversationMap.values())
        .map(conv => ({
          ...conv,
          user: userData?.find(u => u.id === conv.user_id) || null
        }))
        .filter(conv => conv.user !== null) // Remove conversations where user wasn't found
        .sort((a, b) => 
          new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
        );

      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages between two users
   * Returns messages ordered chronologically (oldest first)
   */
  static async getMessages(userId: string, partnerId: string, limit = 50, offset = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('DMs')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true }) // Oldest first for chat display
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Get recent messages between two users (for loading more)
   * Returns messages newer than a specific timestamp
   */
  static async getRecentMessages(userId: string, partnerId: string, since: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('DMs')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .gt('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      throw error;
    }
  }

  /**
   * Send a message
   * Returns the created message
   */
  static async sendMessage(
    senderId: string, 
    receiverId: string, 
    message: string, 
    messageType = 'text',
    mediaUrl?: string,
    replyToId?: number
  ): Promise<Message> {
    try {
      const messageData: any = {
        sender_id: senderId,
        receiver_id: receiverId,
        message: message.trim(),
        read: false,
        message_type: messageType
      };

      if (mediaUrl) {
        messageData.media_url = mediaUrl;
      }

      if (replyToId) {
        messageData.reply_to_id = replyToId;
      }

      const { data, error } = await supabase
        .from('DMs')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   * Marks all unread messages from a specific sender as read
   */
  static async markMessagesAsRead(userId: string, partnerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('DMs')
        .update({ read: true })
        .eq('sender_id', partnerId)
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get friends list for starting new conversations
   * Returns users that the current user is friends with
   */
  static async getFriends(userId: string): Promise<Friend[]> {
    try {
      const { data, error } = await supabase
        .from('Friends')
        .select(`
          friend_id,
          User:friend_id (
            id,
            username,
            name,
            profile_pic
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      if (!data) return [];

      // Transform the data to a cleaner format
      const friends: Friend[] = [];
      
      for (const friendship of data) {
        const user = friendship.User as any;
        if (user && !Array.isArray(user)) {
          friends.push({
            id: user.id,
            username: user.username,
            name: user.name || undefined,
            profile_pic: user.profile_pic || undefined
          });
        }
      }

      return friends;
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  }

  /**
   * Get total unread message count for a user
   * Returns the total number of unread messages across all conversations
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('DMs')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Delete a message (only sender can delete their own messages)
   */
  static async deleteMessage(userId: string, messageId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('DMs')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId); // Only allow deleting own messages

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Edit a message (only sender can edit their own messages)
   */
  static async editMessage(userId: string, messageId: number, newMessage: string): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('DMs')
        .update({ 
          message: newMessage.trim(),
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId) // Only allow editing own messages
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Check if a conversation exists between two users
   */
  static async conversationExists(userId: string, partnerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('DMs')
        .select('id')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking conversation existence:', error);
      return false;
    }
  }

  /**
   * Search messages within a conversation
   */
  static async searchMessages(userId: string, partnerId: string, searchTerm: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('DMs')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .ilike('message', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }
} 