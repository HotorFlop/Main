import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import FriendsList from '../../components/FriendsList';
import { COLORS, SPACING } from '../../constants/theme';

interface User {
  username: string;
  id: string;
  name: string;
  profile_pic: string;
}

export default function AddFriends() {
  const router = useRouter();
  const { selectedUsers } = useLocalSearchParams();
  const [search, setSearch] = useState<string>("");
  const [preSelectedUsers, setPreSelectedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('User')
        .select('id, username, name, profile_pic');
      
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setAllUsers(data || []);
        setFilteredUsers(data || []);
      }
      setIsLoading(false);
    };

    fetchUsers();
  }, []);

  // Filter users based on search input
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        user.username.toLowerCase().startsWith(search.toLowerCase()) ||
        (user.name && user.name.toLowerCase().startsWith(search.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [search, allUsers]);

  // Parse pre-selected users from params
  useEffect(() => {
    if (selectedUsers) {
      try {
        const parsedUsers: User[] = JSON.parse(decodeURIComponent(selectedUsers as string));
        setPreSelectedUsers(parsedUsers);
      } catch (error) {
        console.error("Error parsing pre-selected users:", error);
      }
    }
  }, [selectedUsers]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find friends and accounts you like</Text>
      <Text style={styles.subtitle}>Try following 5 or more accounts for a personalized experience.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Search users..."
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {/* Pass filtered users to FriendsList */}
      <FriendsList 
        search={search} 
        preSelectedUsers={preSelectedUsers} 
        filteredUsers={filteredUsers}
        isLoading={isLoading}
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.replace("/(tabs)/feed")}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#F78119',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    color: '#F78119',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#FFBFA9',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
