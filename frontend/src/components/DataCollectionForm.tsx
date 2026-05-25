import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { env } from '@/shared/config/env';

// ─── Helper: build absolute URL ───────────────────────────────────────────────
function toAbsoluteUrl(path: string): string {
  const base = (env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export default function DataCollectionForm() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const accessToken = useSessionStore(state => state.accessToken);
  const setPending = usePredictionStore(state => state.setPending);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!user) {
      Alert.alert('Login Required', 'Please login before submitting.', [
        { text: 'Login', onPress: () => router.push('/login') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return false;
    }
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter your name.');
      return false;
    }
    if (!age.trim() || isNaN(Number(age))) {
      Alert.alert('Missing Field', 'Please enter a valid age.');
      return false;
    }
    if (!gender) {
      Alert.alert('Missing Field', 'Please select your gender.');
      return false;
    }
    if (!imageAsset || !imageUri) {
      Alert.alert('Missing Field', 'Please capture or select an eye image.');
      return false;
    }
    return true;
  };

  // ── Submit: upload image + run ML predict in one step ─────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // ── Build multipart FormData ──────────────────────────────────────────
      const asset = imageAsset!;
      const localUri = asset.uri;
      const filename = localUri.split('/').pop() || 'eye.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const fetchResp = await fetch(localUri);
        const blob = await fetchResp.blob();

        if (blob.size > 20 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 20 MB.');
          return;
        }
        if (!blob.type.startsWith('image/')) {
          Alert.alert('Invalid File', 'Please upload a valid image file.');
          return;
        }
        formData.append('file', blob, filename);
      } else {
        if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 20 MB.');
          return;
        }
        // @ts-ignore — React Native FormData polyfill
        formData.append('file', { uri: localUri, name: filename, type: mimeType });
      }

      formData.append('patientId', name.trim());

      // ── POST to /v1/ai/predict ────────────────────────────────────────────
      const url = toAbsoluteUrl('ai/predict');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const msg =
          errBody?.data?.message ??
          errBody?.message ??
          `ML prediction failed (HTTP ${response.status})`;
        throw new Error(msg);
      }

      const json = await response.json();

      // Unwrap NestJS ResponseInterceptor envelope
      const predictionData = json?.data?.data ?? json?.data ?? json;

      const prediction: string = predictionData?.prediction ?? 'Unknown';
      const confidence: number = predictionData?.confidence ?? 0;
      const uploadedImageUrl: string = predictionData?.uploadedImageUrl ?? '';
      const chatId: string = predictionData?.chatId ?? 'default';

      // ── Store result in Zustand so Chat screen can pick it up ─────────────
      setPending({ prediction, confidence, uploadedImageUrl, chatId });

      // ── Show success modal ────────────────────────────────────────────────
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('[EyeScan] Submission error:', error?.message ?? error);
      Alert.alert('Submission Failed', error?.message ?? 'Failed to analyze your eye image. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setName('');
    setAge('');
    setGender(null);
    setImageUri(null);
    setImageAsset(null);
    setShowSuccessModal(false);
  };

  const pickImage = () => setPickerVisible(true);
  const showLoginBanner = hydrated && !user;

  return (
    <View style={{ width: '100%', marginTop: 16 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', marginBottom: 8 }}>
        Eye Scan Upload
      </Text>
      <Text style={{ color: '#888888', fontSize: 16, marginBottom: showLoginBanner ? 16 : 32 }}>
        Upload your eye image — our AI model will detect cataract and provide Ayurvedic guidance.
      </Text>

      {/* Login Banner */}
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
          {['Male', 'Female', 'Other'].map(g => {
            const isSelected = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, backgroundColor: isSelected ? '#9A723B' : '#121212', borderColor: isSelected ? '#9A723B' : '#222222' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 16, color: isSelected ? '#000000' : '#FFFFFF' }}>{g}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Eye Image */}
      <View style={{ marginBottom: 40 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Eye Image (for AI analysis)</Text>
        <Pressable
          onPress={pickImage}
          disabled={isSubmitting}
          style={{ backgroundColor: '#121212', borderWidth: 1, borderColor: imageUri ? '#9A723B' : '#333333', borderStyle: imageUri ? 'solid' : 'dashed', borderRadius: 24, paddingVertical: imageUri ? 0 : 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 200 }}
        >
          {imageUri ? (
            <View style={{ width: '100%', height: 200 }}>
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <View style={{ position: 'absolute', bottom: 8, right: 12, backgroundColor: 'rgba(154,114,59,0.9)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>Tap to change</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={{ backgroundColor: '#1A1A1A', borderRadius: 50, padding: 20, marginBottom: 16 }}>
                <Ionicons name="eye-outline" size={36} color="#9A723B" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4, letterSpacing: 0.5 }}>Tap to capture or select eye image</Text>
              <Text style={{ color: '#666666', fontSize: 14 }}>Camera or gallery — clear photo of your eye</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Submit */}
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => ({
          backgroundColor: isSubmitting ? '#555' : '#9A723B',
          borderRadius: 30,
          paddingVertical: 18,
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 40,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        {isSubmitting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color="#000000" />
            <Text style={{ color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Analyzing Eye Image...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="scan-circle-outline" size={20} color="#000" />
            <Text style={{ color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Analyze & Get AI Consultation</Text>
          </View>
        )}
      </Pressable>

      {/* Image Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable
          onPress={() => setPickerVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <View
            style={{ width: '100%', maxWidth: 400, backgroundColor: '#161616', borderRadius: 28, borderWidth: 1, borderColor: '#2A2A2A', padding: 24, alignItems: 'center' }}
            onStartShouldSetResponder={() => true}
            onTouchEnd={e => e.stopPropagation()}
          >
            <View style={{ backgroundColor: '#1A1A1A', borderRadius: 50, padding: 16, marginBottom: 16 }}>
              <Ionicons name="eye-outline" size={32} color="#9A723B" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>Select Eye Photo</Text>
            <Text style={{ color: '#888888', fontSize: 14, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
              Take a new scan using your camera or choose from gallery.
            </Text>

            {/* Camera */}
            <Pressable
              onPress={async () => {
                setPickerVisible(false);
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert('Permission Denied', 'Camera permission is required.');
                  return;
                }
                const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 });
                if (!result.canceled && result.assets?.length > 0) {
                  const asset = result.assets[0];
                  setImageUri(asset.uri);
                  setImageAsset(asset);
                }
              }}
              style={({ pressed }) => ({ width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: pressed ? '#222222' : '#1E1E1E', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: pressed ? '#9A723B' : '#2A2A2A' })}
            >
              <Ionicons name="camera-outline" size={22} color="#9A723B" style={{ marginRight: 16 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Open Camera</Text>
            </Pressable>

            {/* Gallery */}
            <Pressable
              onPress={async () => {
                setPickerVisible(false);
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) {
                  Alert.alert('Permission Denied', 'Gallery permission is required.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 });
                if (!result.canceled && result.assets?.length > 0) {
                  const asset = result.assets[0];
                  setImageUri(asset.uri);
                  setImageAsset(asset);
                }
              }}
              style={({ pressed }) => ({ width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: pressed ? '#222222' : '#1E1E1E', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20, borderWidth: 1, borderColor: pressed ? '#9A723B' : '#2A2A2A' })}
            >
              <Ionicons name="images-outline" size={22} color="#9A723B" style={{ marginRight: 16 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Choose from Gallery</Text>
            </Pressable>

            <Pressable onPress={() => setPickerVisible(false)} style={({ pressed }) => ({ width: '100%', alignItems: 'center', paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: '#888888', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => resetForm()}>
        <Pressable
          onPress={() => resetForm()}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <View
            style={{ width: '100%', maxWidth: 400, backgroundColor: '#161616', borderRadius: 28, borderWidth: 1, borderColor: '#2A2A2A', padding: 32, alignItems: 'center' }}
            onStartShouldSetResponder={() => true}
            onTouchEnd={e => e.stopPropagation()}
          >
            <View style={{ backgroundColor: '#14251C', borderRadius: 50, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1F3D2C' }}>
              <Ionicons name="checkmark-circle" size={52} color="#4CAF50" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
              Scan Complete!
            </Text>
            <Text style={{ color: '#888888', fontSize: 14, marginBottom: 28, textAlign: 'center', lineHeight: 22 }}>
              Your eye image has been analyzed by the AI model.{'\n'}
              Open the AI Chat to see your personalized Ayurvedic health consultation.
            </Text>

            {/* Go to Chat */}
            <Pressable
              onPress={() => {
                resetForm();
                router.replace('/(tabs)/chat');
              }}
              style={({ pressed }) => ({
                width: '100%',
                backgroundColor: pressed ? '#7D5C2F' : '#9A723B',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#000" />
              <Text style={{ color: '#000000', fontSize: 16, fontWeight: 'bold' }}>View AI Consultation →</Text>
            </Pressable>

            <Pressable
              onPress={() => resetForm()}
              style={({ pressed }) => ({ width: '100%', backgroundColor: '#1E1E1E', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A', opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Scan Another Eye</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
