import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import * as FileSystem from 'expo-file-system';
// Import decode directly
import { decode } from 'base64-arraybuffer';
// Import ImageManipulator instead of individual functions
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';

/* -- SAMPLE THEME CONSTANTS -- 
   Replace these with your own theme if you have one
*/
const COLORS = {
  primary: '#FFACAC', // Pink background
  white: '#FFFFFF',
  text: '#333333',
  buttonPink: '#FFC6C6',
  buttonRed: '#FFACAC',
};
const SPACING = {
  sm: 8,
  md: 16,
  lg: 24,
};
const FONTS = {
  mandali: 'Mandali', // or your loaded font name
};

// Example: the squiggle from feed.tsx
const squiggleSvg = `
<svg width="440" height="275" viewBox="0 0 440 275" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M-441.718 230.928C-415.983 198.362 -386.23 194.144 -352.457 218.273C-298.729 270.111 -268.975 265.892 -263.196 205.618C-241.705 143.116 -211.951 138.898 -173.934 192.963C-135.287 248.561 -105.533 244.342 -84.6732 180.309C-63.4078 116.218 -33.654 111.999 4.58807 167.654C49.8604 240.689 79.6141 236.471 93.8493 154.999C112.561 72.8932 142.315 68.6749 183.111 142.345C210.859 177.867 240.613 173.649 272.372 129.69C296.642 86.7926 326.396 82.5743 361.633 117.035C395.615 149.242 425.369 145.023 450.894 104.38C475.503 63.8674 505.256 59.6492 540.156 91.7256C593.177 154.744 622.931 150.525 629.417 79.0709C649.368 5.70735 679.122 1.48911 718.678 66.4162" stroke="#FFEBB4" stroke-width="40"/>
</svg>
`;

export default function CreatePostScreen() {
  // Get the current user from auth context
  const { user } = useAuth();
  
  // Form state
  const [description, setDescription] = useState('');
  const [itemName, setItemName] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [audience, setAudience] = useState<'closeFriends' | 'followers'>('closeFriends');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Helper to get mime type from uri
  const getMimeType = (uri: string) => {
    const extension = uri.split('.').pop()?.toLowerCase() || '';
    const types: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'heic': 'image/heic',
      'heif': 'image/heif',
      'webp': 'image/webp'
    };
    return types[extension] || 'image/jpeg';
  };

  // Pick image from library
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  
  // Take a photo
  const takePhoto = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'There was an error taking a photo.');
    }
  };

  // Upload the selected image to Supabase Storage
  const uploadImage = async (retryAttempt = 0) => {
    if (!image || !user?.id) return null;
    
    try {
      setUploading(true);
      console.log(`Upload attempt ${retryAttempt + 1} for user ${user.id}`);
      
      // Get current session and validate
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.log('Session invalid, attempting refresh...');
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !newSession?.access_token) {
          console.error('Session refresh failed:', refreshError);
          throw new Error('Failed to get valid session');
        }
        console.log('Session refreshed successfully');
      }

      const processedImage = await manipulateAsync(
        image,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const base64 = await FileSystem.readAsStringAsync(processedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filePath = `posts/${user.id}/${Date.now()}.jpg`;
      console.log('Uploading to:', filePath);

      const { error: uploadError } = await supabase.storage
        .from("Images")
        .upload(filePath, decode(base64), { 
          contentType: "image/jpeg", 
          upsert: true 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage.from("Images").getPublicUrl(filePath);
      return data?.publicUrl || null;

    } catch (error) {
      console.error(`Upload attempt ${retryAttempt + 1} failed:`, error);
      if (retryAttempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return uploadImage(retryAttempt + 1);
      }
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Submit to Supabase
  const handlePost = async () => {
    if (!description || !itemName) {
      Alert.alert('Missing Information', 'Please add description and item name');
      return;
    }

    if (!image) {
      Alert.alert('Missing Image', 'Please select an image');
      return;
    }

    try {
      const imageUrl = await uploadImage();
      if (!imageUrl) {
        Alert.alert('Upload Failed', 'Failed to upload image');
        return;
      }

      const now = new Date().toISOString();
      const postData = {
        title: itemName,
        description,
        imageUrl,
        url: store || '',
        userId: user.id,
        price: price ? parseFloat(price) : null,
        category: null,
        updatedAt: now,
        createdAt: now,
        yes_count: 0,
        no_count: 0,
        total_count: 0,
        audience_type: audience
      };

      const { error } = await supabase
        .from('SharedItem')
        .insert(postData);

      if (error) throw error;

      // Set timestamp for profile refresh
      await AsyncStorage.setItem('lastPostCreated', now);

      // Clear form
      setDescription('');
      setItemName('');
      setStore('');
      setPrice('');
      setImage(null);
      
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  };

  return (
    <View style={styles.container}>
      <SvgXml xml={squiggleSvg} style={styles.squiggle} />
      {/* Hide the default header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Nav */}
      <View style={styles.topNav}>
        <Text style={styles.logo}>hot or flop?</Text>
        <View style={styles.navIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <FontAwesome name="bell" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <FontAwesome name="bars" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content in a big white card */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.whiteCard}>
          {/* Post Description */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Post Description</Text>
            <FontAwesome
              name="pencil"
              size={16}
              color={COLORS.text}
              style={styles.editIcon}
            />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
          />

          {/* Image placeholder */}
          <View style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.selectedImage} />
            ) : (
              <TouchableOpacity style={styles.placeholder} onPress={pickImage}>
                <Text style={styles.placeholderText}>add image</Text>
              </TouchableOpacity>
            )}
            {/* small camera / library icons */}
            <View style={styles.imageButtonsRow}>
              <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
                <FontAwesome name="camera" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
                <FontAwesome name="image" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Item */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Item</Text>
            <FontAwesome
              name="pencil"
              size={16}
              color={COLORS.text}
              style={styles.editIcon}
            />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Sunglasses"
            placeholderTextColor="#999"
            value={itemName}
            onChangeText={setItemName}
          />

          {/* Store */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Store</Text>
            <FontAwesome
              name="pencil"
              size={16}
              color={COLORS.text}
              style={styles.editIcon}
            />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Amazon"
            placeholderTextColor="#999"
            value={store}
            onChangeText={setStore}
          />

          {/* Price */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Price</Text>
            <FontAwesome
              name="pencil"
              size={16}
              color={COLORS.text}
              style={styles.editIcon}
            />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. $12"
            placeholderTextColor="#999"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          {/* Alert (audience) */}
          <View style={[styles.fieldRow, { marginTop: SPACING.md }]}>
            <Text style={[styles.fieldLabel, { marginRight: 10 }]}>Share to</Text>
            {/* "close friends" / "followers" toggles */}
            <TouchableOpacity
              style={[
                styles.audienceButton,
                audience === 'closeFriends' && styles.audienceActive,
              ]}
              onPress={() => setAudience('closeFriends')}
            >
              <Text
                style={[
                  styles.audienceButtonText,
                  audience === 'closeFriends' && styles.audienceButtonTextActive,
                ]}
              >
                close friends
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.audienceButton,
                audience === 'followers' && styles.audienceActive,
              ]}
              onPress={() => setAudience('followers')}
            >
              <Text
                style={[
                  styles.audienceButtonText,
                  audience === 'followers' && styles.audienceButtonTextActive,
                ]}
              >
                followers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Post button */}
          <TouchableOpacity
            style={styles.postButton}
            onPress={handlePost}
          >
            <Text style={styles.postButtonText}>
              {uploading ? 'uploading...' : 'post'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* --- STYLES --- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingTop:
      Platform.OS === 'ios'
        ? StatusBar.currentHeight || 35
        : StatusBar.currentHeight,
  },
  squiggle: {
    position: 'absolute',
    width: '110%',
    height: '100%',
    zIndex: -1,
    transform: [{ rotate: '355deg' }, { translateY: -80 }],
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 35,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  logo: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: FONTS.mandali,
  },
  navIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 15,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 110, // so content starts below the top nav
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  whiteCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: FONTS.mandali,
    color: COLORS.text,
    marginRight: 4,
  },
  editIcon: {
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: SPACING.md,
    fontFamily: FONTS.mandali,
    fontSize: 16,
    color: COLORS.text,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  placeholderText: {
    fontFamily: FONTS.mandali,
    fontSize: 18,
    color: '#999',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageButtonsRow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
  },
  smallButton: {
    backgroundColor: '#888',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  audienceButton: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  audienceActive: {
    backgroundColor: COLORS.buttonPink,
    borderColor: COLORS.buttonPink,
  },
  audienceButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.mandali,
    fontSize: 14,
  },
  audienceButtonTextActive: {
    color: '#fff',
  },
  postButton: {
    backgroundColor: COLORS.buttonRed,
    borderRadius: 20,
    paddingVertical: 12,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  postButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.mandali,
    fontSize: 18,
    fontWeight: 'bold',
  },
});