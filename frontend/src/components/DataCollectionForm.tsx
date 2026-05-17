import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { httpClient } from '@/shared/api/http-client';
import { useSessionStore } from '@/features/auth/store/session-store';

export default function DataCollectionForm() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    Alert.alert(
      'Select Image',
      'Choose how to upload your eye image',
      [
        {
          text: 'Open Camera',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Denied', 'Camera permission is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.length > 0) {
              const asset = result.assets[0];
              setImageUri(asset.uri);
              await uploadImage(asset);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission Denied', 'Media library permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled && result.assets?.length > 0) {
              const asset = result.assets[0];
              setImageUri(asset.uri);
              await uploadImage(asset);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    try {
      const localUri = asset.uri;
      const filename = localUri.split('/').pop() || 'photo.jpg';

      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : `image/jpeg`;

      const formData = new FormData();
      // @ts-ignore - React Native FormData expects this format
      formData.append('file', {
        uri: localUri,
        name: filename,
        type,
      });

      const response = await httpClient.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Backend wraps response: { data: { success, data: { fileUrl }, message } }
      const payload = response.data?.data;
      if (payload?.success && payload?.data?.fileUrl) {
        setImageUrl(payload.data.fileUrl);
        Alert.alert('Success', 'Image uploaded securely to AWS S3!');
      } else {
        throw new Error('Upload response missing fileUrl');
      }
    } catch (error: any) {
      console.error('Upload Error:', JSON.stringify(error?.response?.data ?? error?.message ?? error));
      Alert.alert('Upload Failed', 'Failed to upload the image. Please try again.');
      setImageUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter your name.');
      return;
    }
    if (!age.trim() || isNaN(Number(age))) {
      Alert.alert('Missing Field', 'Please enter a valid age.');
      return;
    }
    if (!gender) {
      Alert.alert('Missing Field', 'Please select your gender.');
      return;
    }
    if (!imageUrl) {
      Alert.alert('Missing Field', 'Please upload an eye image first.');
      return;
    }

    console.log('--- ML Survey Data ---');
    console.log('Name:', name);
    console.log('Age:', age);
    console.log('Gender:', gender);
    console.log('Image URL (S3):', imageUrl);

    Alert.alert('Survey Submitted', 'Your data has been successfully sent for ML processing!', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') }
    ]);
  };

  // Show auth banner only after hydration confirms user is logged out
  const showLoginBanner = hydrated && !user;

  return (
    <View style={{ width: '100%', marginTop: 16 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', marginBottom: 8 }}>
        ML Data Collection
      </Text>
      <Text style={{ color: '#888888', fontSize: 16, marginBottom: showLoginBanner ? 16 : 32 }}>
        We need a few details and an eye scan for our Machine Learning model.
      </Text>

      {/* Login Banner — visible prompt, does NOT block form */}
      {showLoginBanner && (
        <Pressable
          onPress={() => router.push('/login')}
          style={{ backgroundColor: '#1C1409', borderWidth: 1, borderColor: '#9A723B', borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#9A723B" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Login required to submit</Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Tap here to login — you can still fill the form first</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9A723B" />
        </Pressable>
      )}

      {/* Name */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={{ backgroundColor: '#121212', color: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, borderWidth: 1, borderColor: '#222222', fontSize: 16 }}
          placeholder="Enter your full name"
          placeholderTextColor="#555555"
        />
      </View>

      {/* Age */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Age</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          style={{ backgroundColor: '#121212', color: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, borderWidth: 1, borderColor: '#222222', fontSize: 16 }}
          placeholder="Enter your age"
          placeholderTextColor="#555555"
          keyboardType="numeric"
        />
      </View>

      {/* Gender */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Gender</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {['Male', 'Female', 'Other'].map((g) => {
            const isSelected = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, backgroundColor: isSelected ? '#9A723B' : '#121212', borderColor: isSelected ? '#9A723B' : '#222222' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 16, color: isSelected ? '#000000' : '#FFFFFF' }}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Image of Eye */}
      <View style={{ marginBottom: 40 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Image of Eye (ML Input)</Text>
        <Pressable
          onPress={pickImage}
          disabled={isUploading}
          style={{ backgroundColor: '#121212', borderWidth: 1, borderColor: '#333333', borderStyle: imageUri ? 'solid' : 'dashed', borderRadius: 24, paddingVertical: imageUri ? 0 : 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 200 }}
        >
          {imageUri ? (
            <View style={{ width: '100%', height: 200, position: 'relative' }}>
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              {isUploading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#9A723B" />
                  <Text style={{ color: '#FFF', marginTop: 12 }}>Uploading to S3...</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={{ backgroundColor: '#1A1A1A', borderRadius: 50, padding: 20, marginBottom: 16 }}>
                <Ionicons name="camera-outline" size={36} color="#9A723B" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4, letterSpacing: 0.5 }}>Tap to capture or pick image</Text>
              <Text style={{ color: '#666666', fontSize: 14 }}>Camera or gallery — clear photo of your eye</Text>
            </>
          )}
        </Pressable>
        {imageUrl && !isUploading && (
          <Text style={{ color: '#4CAF50', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            ✓ Successfully stored securely in AWS S3
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={isUploading}
        style={({ pressed }) => ({
          backgroundColor: isUploading ? '#555' : '#9A723B',
          borderRadius: 30,
          paddingVertical: 18,
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 40,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        })}
      >
        <Text style={{ color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Submit Survey</Text>
      </Pressable>

    </View>
  );
}
