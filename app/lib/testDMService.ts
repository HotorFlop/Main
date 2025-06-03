import { DMService } from './dmService';
import { supabase } from './supabase';

/**
 * Test script for DMService functions
 * Run this to verify all functions work before building the UI
 */
export class DMServiceTester {
  private static testUserId: string | null = null;
  private static testFriendId: string | null = null;

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Starting DMService Tests...');
    console.log('====================================');

    try {
      // Setup: Get current user
      await this.setupTestUser();
      
      if (!this.testUserId) {
        console.error('❌ No authenticated user found. Please log in first.');
        return;
      }

      // Test 1: Get Friends
      console.log('\n📋 Test 1: Getting Friends List');
      await this.testGetFriends();

      // Test 2: Get Conversations
      console.log('\n💬 Test 2: Getting Conversations');
      await this.testGetConversations();

      // Test 3: Send Message (if we have a friend)
      if (this.testFriendId) {
        console.log('\n📤 Test 3: Sending Test Message');
        await this.testSendMessage();

        console.log('\n📥 Test 4: Getting Messages');
        await this.testGetMessages();

        console.log('\n✅ Test 5: Marking Messages as Read');
        await this.testMarkAsRead();
      } else {
        console.log('\n⚠️  Skipping message tests - no friends found');
        console.log('   Add some friends first to test messaging functions');
      }

      // Test 6: Unread Count
      console.log('\n🔢 Test 6: Getting Unread Count');
      await this.testUnreadCount();

      console.log('\n🎉 All tests completed!');
      console.log('====================================');

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  /**
   * Setup: Get current authenticated user
   */
  private static async setupTestUser(): Promise<void> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        this.testUserId = user.id;
        console.log(`✅ Found authenticated user: ${user.id}`);
      } else {
        console.log('❌ No authenticated user found');
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  /**
   * Test getting friends list
   */
  private static async testGetFriends(): Promise<void> {
    try {
      const friends = await DMService.getFriends(this.testUserId!);
      
      console.log(`   Found ${friends.length} friends`);
      
      if (friends.length > 0) {
        this.testFriendId = friends[0].id;
        console.log(`   First friend: @${friends[0].username} (${friends[0].id})`);
        
        // Show all friends
        friends.forEach((friend, index) => {
          console.log(`   ${index + 1}. @${friend.username} - ${friend.name || 'No name'}`);
        });
      } else {
        console.log('   No friends found. Add some friends to test messaging.');
      }
      
      console.log('✅ getFriends() test passed');
    } catch (error) {
      console.error('❌ getFriends() test failed:', error);
    }
  }

  /**
   * Test getting conversations
   */
  private static async testGetConversations(): Promise<void> {
    try {
      const conversations = await DMService.getConversations(this.testUserId!);
      
      console.log(`   Found ${conversations.length} conversations`);
      
      conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. @${conv.user.username}`);
        console.log(`      Last: "${conv.last_message}"`);
        console.log(`      Time: ${new Date(conv.last_message_time).toLocaleString()}`);
        console.log(`      Unread: ${conv.unread_count}`);
      });
      
      console.log('✅ getConversations() test passed');
    } catch (error) {
      console.error('❌ getConversations() test failed:', error);
    }
  }

  /**
   * Test sending a message
   */
  private static async testSendMessage(): Promise<void> {
    try {
      const testMessage = `Test message from DMService tester - ${new Date().toLocaleTimeString()}`;
      
      const message = await DMService.sendMessage(
        this.testUserId!,
        this.testFriendId!,
        testMessage
      );
      
      console.log(`   ✅ Message sent successfully`);
      console.log(`   Message ID: ${message.id}`);
      console.log(`   Content: "${message.message}"`);
      console.log(`   Time: ${new Date(message.created_at).toLocaleString()}`);
      
      console.log('✅ sendMessage() test passed');
    } catch (error) {
      console.error('❌ sendMessage() test failed:', error);
    }
  }

  /**
   * Test getting messages between users
   */
  private static async testGetMessages(): Promise<void> {
    try {
      const messages = await DMService.getMessages(this.testUserId!, this.testFriendId!, 10);
      
      console.log(`   Found ${messages.length} messages in conversation`);
      
      if (messages.length > 0) {
        console.log('   Recent messages:');
        messages.slice(-3).forEach((msg, index) => {
          const isMyMessage = msg.sender_id === this.testUserId;
          const sender = isMyMessage ? 'Me' : 'Friend';
          console.log(`   ${index + 1}. [${sender}]: "${msg.message}"`);
          console.log(`      Time: ${new Date(msg.created_at).toLocaleString()}`);
          console.log(`      Read: ${msg.read}`);
        });
      }
      
      console.log('✅ getMessages() test passed');
    } catch (error) {
      console.error('❌ getMessages() test failed:', error);
    }
  }

  /**
   * Test marking messages as read
   */
  private static async testMarkAsRead(): Promise<void> {
    try {
      await DMService.markMessagesAsRead(this.testUserId!, this.testFriendId!);
      console.log('   ✅ Messages marked as read');
      console.log('✅ markMessagesAsRead() test passed');
    } catch (error) {
      console.error('❌ markMessagesAsRead() test failed:', error);
    }
  }

  /**
   * Test getting unread count
   */
  private static async testUnreadCount(): Promise<void> {
    try {
      const unreadCount = await DMService.getUnreadCount(this.testUserId!);
      console.log(`   Total unread messages: ${unreadCount}`);
      console.log('✅ getUnreadCount() test passed');
    } catch (error) {
      console.error('❌ getUnreadCount() test failed:', error);
    }
  }

  /**
   * Test conversation existence check
   */
  static async testConversationExists(partnerId: string): Promise<void> {
    try {
      const exists = await DMService.conversationExists(this.testUserId!, partnerId);
      console.log(`   Conversation exists: ${exists}`);
      console.log('✅ conversationExists() test passed');
    } catch (error) {
      console.error('❌ conversationExists() test failed:', error);
    }
  }

  /**
   * Quick test to verify basic connectivity
   */
  static async quickTest(): Promise<void> {
    console.log('🚀 Quick DMService Test...');
    
    try {
      await this.setupTestUser();
      
      if (!this.testUserId) {
        console.error('❌ No authenticated user. Please log in first.');
        return;
      }

      const friends = await DMService.getFriends(this.testUserId);
      const conversations = await DMService.getConversations(this.testUserId);
      const unreadCount = await DMService.getUnreadCount(this.testUserId);

      console.log(`✅ Connected! Found ${friends.length} friends, ${conversations.length} conversations, ${unreadCount} unread messages`);
    } catch (error) {
      console.error('❌ Quick test failed:', error);
    }
  }
} 