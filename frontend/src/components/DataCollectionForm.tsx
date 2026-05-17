import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Image, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { httpClient } from '@/shared/api/http-client';
import { useSessionStore } from '@/features/auth/store/session-store';

// Helper to recursively search an object for fileUrl, url, or s3Key starting with http
const findFileUrlDeep = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  const targetKeys = ['fileUrl', 'url', 's3Url', 'imageUrl'];
  for (const key of targetKeys) {
    if (obj[key] && typeof obj[key] === 'string' && obj[key].startsWith('http')) {
      return obj[key];
    }
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        const found = findFileUrlDeep(val);
        if (found) {
          return found;
        }
      }
    }
  }
  return null;
};

export default function DataCollectionForm() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const pickImage = () => {
    console.log('PickImage Pressed'); // Debug log
    setPickerVisible(true);
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    try {
      console.log('[DEBUG] Selected Asset Detail:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        type: asset.type,
        fileSize: asset.fileSize,
      });

      const localUri = asset.uri;
      const filename = localUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : `image/jpeg`;

      const formData = new FormData();

      if (Platform.OS === 'web') {
        console.log('[DEBUG] Web environment detected. Converting URI to Blob...');
        
        // Fetch raw binary from objectURL / dataURL
        const responseBlob = await fetch(localUri);
        const blob = await responseBlob.blob();

        console.log('[DEBUG] Converted Blob details:', {
          size: blob.size,
          type: blob.type,
        });

        // 1. Validate file size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (blob.size > MAX_SIZE) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
          setImageUri(null);
          setIsUploading(false);
          return;
        }

        // 2. Validate file type
        if (!blob.type.startsWith('image/')) {
          Alert.alert('Invalid File Type', 'Please upload a valid image file.');
          setImageUri(null);
          setIsUploading(false);
          return;
        }

        formData.append('file', blob, filename);
      } else {
        console.log('[DEBUG] Native platform detected (Android/iOS/Expo Go). Preparing custom FormData...');
        
        // 1. Validate file size if available (10MB limit)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
          setImageUri(null);
          setIsUploading(false);
          return;
        }

        // @ts-ignore - React Native polyfill expects this object format
        formData.append('file', {
          uri: localUri,
          name: filename,
          type,
        });
      }

      console.log('[DEBUG] FormData built successfully. Sending post request to S3 upload endpoint...');
      
      const response = await httpClient.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[DEBUG] Full Backend Response Object:', JSON.stringify(response.data, null, 2));

      const responseData = response.data;
      const s3Url = findFileUrlDeep(responseData);

      console.log('[DEBUG] Extracted Final URL:', s3Url);

      if (s3Url && typeof s3Url === 'string' && s3Url.startsWith('http')) {
        setImageUrl(s3Url);
        Alert.alert('Success', 'Image uploaded securely to AWS S3!');
      } else {
        throw new Error(`Upload response missing valid URL. Parsed payload: ${JSON.stringify(responseData)}`);
      }
    } catch (error: any) {
      console.error('[ERROR] Secure Upload Failed:', {
        message: error?.message,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        errorRaw: error,
      });
      
      const serverErrMsg = error?.response?.data?.message || 'Failed to upload the image to AWS S3. Please try again.';
      Alert.alert('Upload Failed', serverErrMsg);
      setImageUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please login before submitting your survey.', [
        { text: 'Login', onPress: () => router.push('/login') },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }
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

    setIsSubmitting(true);
    try {
      console.log('--- Submitting ML Survey ---');
      console.log('Name:', name);
      console.log('Age:', age);
      console.log('Gender:', gender);
      console.log('Image URL (S3):', imageUrl);

      const response = await httpClient.post('/ml-survey', {
        name: name.trim(),
        age: Number(age),
        gender,
        imageUrl,
      });

      console.log('Survey Submission Response:', response.data);

      Alert.alert(
        'Survey Submitted',
        'Your details and eye image scan have been successfully uploaded and saved in the database!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      console.error('Survey Submission Error:', error?.response?.data ?? error?.message ?? error);
      const errMsg = error?.response?.data?.message || 'Failed to submit the survey. Please try again.';
      Alert.alert('Submission Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
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
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
        disabled={isUploading || isSubmitting}
        style={({ pressed }) => ({
          backgroundColor: (isUploading || isSubmitting) ? '#555' : '#9A723B',
          borderRadius: 30,
          paddingVertical: 18,
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 40,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        })}
      >
        {isSubmitting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={{ color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Submitting...</Text>
          </View>
        ) : (
          <Text style={{ color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Submit Survey</Text>
        )}
      </Pressable>

      {/* Premium Media Picker Modal for Web and Native */}
      <Modal
        visible={pickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          onPress={() => setPickerVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: '#161616',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: '#2A2A2A',
              padding: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 15,
              elevation: 10,
              ...Platform.select({
                web: {
                  boxShadow: '0px 10px 15px rgba(0, 0, 0, 0.5)',
                },
              }),
            }}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={{ backgroundColor: '#1A1A1A', borderRadius: 50, padding: 16, marginBottom: 16 }}>
              <Ionicons name="camera-reverse-outline" size={32} color="#9A723B" />
            </View>
            
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
              Select Eye Photo
            </Text>
            <Text style={{ color: '#888888', fontSize: 14, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
              Choose whether to take a new scan using your camera or select an existing one.
            </Text>

            {/* Open Camera Button */}
            <Pressable
              onPress={async () => {
                setPickerVisible(false);
                try {
                  console.log('Requesting camera permissions...');
                  const permission = await ImagePicker.requestCameraPermissionsAsync();
                  console.log('Camera permission result:', permission);
                  if (!permission.granted) {
                    Alert.alert('Permission Denied', 'Camera permission is required.');
                    return;
                  }
                  console.log('Launching camera...');
                  const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  console.log('Camera result:', result);
                  if (!result.canceled && result.assets?.length > 0) {
                    const asset = result.assets[0];
                    setImageUri(asset.uri);
                    await uploadImage(asset);
                  }
                } catch (err) {
                  console.error('Camera launch error:', err);
                  Alert.alert('Error', 'Failed to open camera on this device.');
                }
              }}
              style={({ pressed }) => ({
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? '#222222' : '#1E1E1E',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: pressed ? '#9A723B' : '#2A2A2A',
              })}
            >
              <Ionicons name="camera-outline" size={22} color="#9A723B" style={{ marginRight: 16 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Open Camera</Text>
            </Pressable>

            {/* Choose from Gallery Button */}
            <Pressable
              onPress={async () => {
                setPickerVisible(false);
                try {
                  console.log('Requesting media library permissions...');
                  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  console.log('Media library permission result:', permission);
                  if (!permission.granted) {
                    Alert.alert('Permission Denied', 'Media library permission is required.');
                    return;
                  }
                  console.log('Launching image library...');
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });
                  console.log('Image library result:', result);
                  if (!result.canceled && result.assets?.length > 0) {
                    const asset = result.assets[0];
                    setImageUri(asset.uri);
                    await uploadImage(asset);
                  }
                } catch (err) {
                  console.error('Library launch error:', err);
                  Alert.alert('Error', 'Failed to open image library on this device.');
                }
              }}
              style={({ pressed }) => ({
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? '#222222' : '#1E1E1E',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: pressed ? '#9A723B' : '#2A2A2A',
              })}
            >
              <Ionicons name="images-outline" size={22} color="#9A723B" style={{ marginRight: 16 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Choose from Gallery</Text>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              onPress={() => setPickerVisible(false)}
              style={({ pressed }) => ({
                width: '100%',
                alignItems: 'center',
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: '#888888', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}
