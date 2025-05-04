import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  username: string;
  name?: string;
  profile_pic?: string;
}

interface FriendsListProps {
  search: string;
  preSelectedUsers: User[];
  filteredUsers?: User[]; // New prop for filtered users
  isLoading?: boolean;
}

export default function FriendsList({ search, preSelectedUsers, filteredUsers, isLoading = false }: FriendsListProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If filteredUsers is provided, use it instead of fetching
    if (filteredUsers) {
      setUsers(filteredUsers);
      setLoading(isLoading);
    } else {
      // Original fetching logic as fallback
      const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('User')
          .select('id, username, name, profile_pic')
          .ilike('username', `%${search}%`);
        
        if (error) {
          console.error('Error fetching users:', error);
        } else {
          setUsers(data || []);
        }
        setLoading(false);
      };

      fetchUsers();
    }
  }, [filteredUsers, isLoading, search]);

  useEffect(() => {
    // Initialize selected users from preSelectedUsers
    if (preSelectedUsers && preSelectedUsers.length > 0) {
      setSelectedUsers(preSelectedUsers);
    }
  }, [preSelectedUsers]);

  const toggleUserSelection = async (selectedUser: User) => {
    if (!user) return;

    // Check if user is already selected
    const isSelected = selectedUsers.some(u => u.id === selectedUser.id);
    
    // Update UI state
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id));
    } else {
      setSelectedUsers([...selectedUsers, selectedUser]);
    }

    // Update database relationship
    try {
      // First check if relationship already exists
      const { data: existingRelation, error: checkError } = await supabase
        .from('Friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', selectedUser.id)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking friend relationship:', checkError);
        return;
      }
      
      if (isSelected) {
        // Remove friend relationship
        await supabase
          .from('Friends')
          .delete()
          .eq('user_id', user.id)
          .eq('friend_id', selectedUser.id);
          
        console.log(`Removed friend relationship with ${selectedUser.id}`);
      } else if (existingRelation) {
        // Update existing relationship
        await supabase
          .from('Friends')
          .update({ close_friend: false }) // Default to regular friend
          .eq('user_id', user.id)
          .eq('friend_id', selectedUser.id);
          
        console.log(`Updated existing friend relationship with ${selectedUser.id}`);
      } else {
        // Add new friend relationship
        await supabase
          .from('Friends')
          .insert({
            user_id: user.id,
            friend_id: selectedUser.id,
            close_friend: false // Default to regular friend
          });
          
        console.log(`Added new friend relationship with ${selectedUser.id}`);
      }
    } catch (error) {
      console.error('Error updating friend relationship:', error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#FFBFA9" style={styles.loader} />;
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const isSelected = selectedUsers.some(u => u.id === item.id);
        
        return (
          <TouchableOpacity 
            style={styles.userItem} 
            onPress={() => toggleUserSelection(item)}
          >
            <Image 
              source={item.profile_pic ? { uri: item.profile_pic } : require('../assets/default.jpg')} 
              style={styles.profileImage} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>@{item.username}</Text>
              {item.name && <Text style={styles.name}>{item.name}</Text>}
            </View>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {search ? `No users found matching "${search}"` : "No users available"}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFACAC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FFACAC',
  },
  checkmark: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#FFF',
    fontSize: 16,
  },
  loader: {
    marginTop: 30,
  },
});
