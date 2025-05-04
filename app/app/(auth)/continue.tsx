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
} from 'react-native';
import { Stack } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../../context/AuthContext';

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

// Supabase client setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  // Pick image from library
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Take a new photo
  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Upload the selected image to Supabase Storage
  const uploadImage = async () => {
    if (!image) return null;
    try {
      setUploading(true);
      const response = await fetch(image);
      const blob = await response.blob();
      const fileExt = image.split('.').pop();
      const fileName = `${new Date().getTime()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, blob);

      if (error) {
        console.error('Error uploading image: ', error);
        return null;
      }

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(data.path);
      return publicUrl;
    } catch (error) {
      console.error('Upload image error: ', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Submit to Supabase
  const handlePost = async () => {
    if (!description || !itemName || !image) {
      Alert.alert('Please fill out description, item, and image');
      return;
    }
    
    if (!user) {
      Alert.alert('You must be logged in to create a post');
      return;
    }

    const uploadedImageUrl = await uploadImage();
    if (!uploadedImageUrl) {
      Alert.alert('Image upload failed');
      return;
    }

    // Use the current user's ID from auth context
    const userId = user.id;
    const itemData = {
      title: itemName,
      description,
      imageUrl: uploadedImageUrl,
      url: store || '',
      price: price ? parseFloat(price) : 0,
      userId,
      category: '',
      yes_count: 0,
      no_count: 0,
      total_count: 0,
      audience_type: audience
    };

    const { data, error } = await supabase
      .from('SharedItem')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting item: ', error);
      Alert.alert('Error creating post');
    } else {
      Alert.alert('Post created successfully!');
      // Reset the form
      setDescription('');
      setItemName('');
      setStore('');
      setPrice('');
      setImage(null);
      setAudience('closeFriends');
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
      </View>

      {/* Scrollable content in a big white card */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.whiteCard}>
          {/* Post Description */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>post description</Text>
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
            <Text style={styles.fieldLabel}>item</Text>
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
            <Text style={styles.fieldLabel}>store</Text>
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
            <Text style={styles.fieldLabel}>$0</Text>
            <FontAwesome
              name="pencil"
              size={16}
              color={COLORS.text}
              style={styles.editIcon}
            />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Price"
            placeholderTextColor="#999"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          {/* Alert (audience) */}
          <View style={[styles.fieldRow, { marginTop: SPACING.md }]}>
            <Text style={[styles.fieldLabel, { marginRight: 10 }]}>alert</Text>
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
            disabled={uploading}
          >
            <Text style={styles.postButtonText}>
              {uploading ? 'Uploading...' : 'post'}
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