import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, View, TextInput } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { useSessionStore } from '@/features/auth/store/session-store';
import { predictCataractFromImage, type EyeImageInput } from '@/services/ai';
import { usePredictionStore } from '@/store/prediction-store';
import { parseUploadError } from '@/utils';

type QuickTool = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const quickTools: QuickTool[] = [
  {
    title: 'AI Health Chat',
    subtitle: 'Live assistant',
    icon: 'sparkles-outline',
    route: '/(tabs)/chat',
  },
  {
    title: 'Scan Reports',
    subtitle: 'Open in profile',
    icon: 'document-text-outline',
    route: '/profile',
  },
  {
    title: 'AI Diagnosis Insights',
    subtitle: 'Open in profile',
    icon: 'analytics-outline',
    route: '/profile',
  },
  {
    title: 'Medical History',
    subtitle: 'Timeline view',
    icon: 'time-outline',
    route: '/profile',
  },
  {
    title: 'Body Insight Form',
    subtitle: 'Digestive wellness',
    icon: 'leaf-outline',
    route: '/body-insight',
  },
];

const recentActivity = [
  { title: 'Left eye cataract scan', time: 'Today • 10:42 AM', status: 'Assessment ready' },
  { title: 'AI chat follow-up', time: 'Today • 9:16 AM', status: 'Ayurvedic guidance generated' },
  { title: 'Report summary exported', time: 'Yesterday • 6:28 PM', status: 'PDF synced' },
];

const smartSuggestions = [
  'Compare current scan with prior baseline',
  'Ask AI for post-op recovery checklist',
  'Generate a concise physician handoff note',
];

export function HomeDashboardScreen() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const setPendingPrediction = usePredictionStore(state => state.setPending);
  const setPendingMessage = usePredictionStore(state => state.setPendingMessage);
  const scrollY = useSharedValue(0);
  const [selectedImage, setSelectedImage] = useState<EyeImageInput | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const firstName = useMemo(() => {
    const base = user?.name?.trim() || user?.email || 'Clinician';
    return base.split(' ')[0];
  }, [user?.email, user?.name]);

  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const parallaxOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 500], [0, -80]) }],
    opacity: interpolate(scrollY.value, [0, 350], [0.3, 0.12]),
  }));

  const HeaderSkeleton = () => (
    <View className="gap-3">
      <SkeletonBlock style={{ height: 18, width: 140 }} />
      <SkeletonBlock style={{ height: 34, width: 230 }} />
      <SkeletonBlock style={{ height: 82, borderRadius: 22 }} />
    </View>
  );

  function toEyeImageInput(asset: ImagePicker.ImagePickerAsset): EyeImageInput {
    return {
      uri: asset.uri,
      name: asset.fileName ?? `eye-scan-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    };
  }

  async function handleOpenCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera permission is needed to capture eye images.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setSelectedImage(toEyeImageInput(result.assets[0]));
    setUploadFeedback({
      type: 'success',
      message: 'Image selected successfully. Tap "Submit Eye Image" to continue.',
    });
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Photo library permission is needed to choose eye images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    setSelectedImage(toEyeImageInput(result.assets[0]));
    setUploadFeedback({
      type: 'success',
      message: 'Image selected successfully. Tap "Submit Eye Image" to continue.',
    });
  }

  async function handleSubmitCataractDetection() {
    if (!user) {
      Alert.alert('Login required', 'Please login to run cataract detection.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!selectedImage) {
      setUploadFeedback({
        type: 'error',
        message: 'Please capture or upload an eye image first.',
      });
      Alert.alert('Image required', 'Please capture or upload an eye image first.');
      return;
    }

    // ── Prevent stale state: clear previous values first ─────────────────────
    setUploadFeedback(null);
    usePredictionStore.getState().clearPending();
    setIsPredicting(true);

    try {
      const result = await predictCataractFromImage(selectedImage);
      if (!result.chatId) {
        throw new Error('Prediction response missing chatId');
      }
      
      setPendingPrediction({
        prediction: result.prediction,
        confidence: result.confidence,
        uploadedImageUrl: result.uploadedImageUrl,
        chatId: result.chatId,
      });

      setUploadFeedback({
        type: 'success',
        message: 'Image uploaded and analyzed successfully. Opening AI Chat...',
      });
      
      // Clear image and preview state upon successful analysis
      setSelectedImage(null);
      router.push('/(tabs)/chat');
    } catch (error: any) {
      // ── Centralized, professional, healthcare-friendly error handling ──────
      const parsedError = parseUploadError(error);
      
      setUploadFeedback({
        type: 'error',
        message: parsedError.message,
      });

      // Crucial recovery UX: clear all temporary states to allow immediate retry
      setSelectedImage(null);
      usePredictionStore.getState().clearPending();

      Alert.alert('Analysis Failed', parsedError.message);
    } finally {
      // Always guarantee isPredicting is reset in the finally block
      setIsPredicting(false);
    }
  }

  async function handleSendQueryToAI() {
    if (!chatQuery.trim()) {
      Alert.alert('Empty query', 'Please type a question to ask our AI.');
      return;
    }

    if (!user) {
      Alert.alert('Login required', 'Please login to chat with Spanda AI.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }

    const message = chatQuery.trim();
    setChatQuery(''); // Instantly clear input
    setPendingMessage(message); // Save message to be auto-sent on mount/focus
    router.push('/(tabs)/chat');
  }

  function openChatPage() {
    router.push('/(tabs)/chat');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#06080D]" edges={['top']}>
      <View className="flex-1">
        <ScreenBackground />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 70,
              right: -80,
              width: 240,
              height: 240,
              borderRadius: 999,
              backgroundColor: 'rgba(108, 159, 255, 0.28)',
            },
            parallaxOrbStyle,
          ]}
        />

        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}
        >
          <Animated.View entering={FadeInDown.duration(550)}>
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold uppercase tracking-[0.15em] text-[#7E91B6]">spandaVidya</Text>
                <Text className="mt-1 text-3xl font-black text-[#F6FAFF]">Hello, {firstName}</Text>
              </View>
              <PressableScale
                onPress={() => router.push('/profile')}
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(189, 210, 248, 0.38)',
                  backgroundColor: 'rgba(15, 24, 38, 0.88)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    resizeMode="cover"
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <Text className="text-base font-bold text-[#E8F1FF]">{firstName.slice(0, 1).toUpperCase()}</Text>
                )}
              </PressableScale>
            </View>
          </Animated.View>

          {!hydrated ? (
            <HeaderSkeleton />
          ) : (
            <Animated.View entering={FadeInDown.duration(600).delay(80)}>
              <LinearGradient
                colors={['rgba(107,154,255,0.24)', 'rgba(120,207,191,0.16)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 1 }}
              >
                <GlassCard style={{ borderWidth: 0, backgroundColor: 'rgba(12, 19, 32, 0.92)' }}>
                  <Text className="text-sm font-semibold uppercase tracking-[0.15em] text-[#94A9CF]">AI Workspace</Text>
                  <Text className="mt-1 text-lg font-bold text-[#F7FBFF]">Cataract Detection</Text>
                  <Text className="mt-2 text-sm leading-6 text-[#8FA2C3]">
                    Upload a clear eye image to run your ML cataract prediction. Result is saved and opened in AI chat.
                  </Text>
                  <View className="mt-4 flex-row gap-2">
                    <PressableScale
                      onPress={() => {
                        void handleOpenCamera();
                      }}
                      disabled={isPredicting}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(188, 210, 250, 0.26)',
                        backgroundColor: 'rgba(17, 27, 42, 0.82)',
                        paddingVertical: 11,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: isPredicting ? 0.65 : 1,
                      }}
                    >
                      <Ionicons name="camera-outline" size={16} color="#D8E7FF" />
                      <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">Open Camera</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={() => {
                        void handlePickImage();
                      }}
                      disabled={isPredicting}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(188, 210, 250, 0.26)',
                        backgroundColor: 'rgba(17, 27, 42, 0.82)',
                        paddingVertical: 11,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: isPredicting ? 0.65 : 1,
                      }}
                    >
                      <Ionicons name="image-outline" size={16} color="#D8E7FF" />
                      <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">Upload Image</Text>
                    </PressableScale>
                  </View>

                  {selectedImage ? (
                    <View className="mt-3 rounded-2xl border border-[#C7D9FF26] bg-[#0A1220D6] p-2">
                      <Image
                        source={{ uri: selectedImage.uri }}
                        resizeMode="cover"
                        style={{ height: 120, width: '100%', borderRadius: 12 }}
                      />
                      <Text numberOfLines={1} className="mt-2 text-xs text-[#9DB1D6]">
                        Selected: {selectedImage.name}
                      </Text>
                    </View>
                  ) : null}

                  {uploadFeedback ? (
                    <View
                      className={`mt-3 rounded-xl border px-3 py-2 ${
                        uploadFeedback.type === 'success'
                          ? 'border-[#3ECF8E66] bg-[#0F2A22]'
                          : 'border-[#FF7B7B66] bg-[#2A1616]'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          uploadFeedback.type === 'success' ? 'text-[#B5F5D6]' : 'text-[#FFC7C7]'
                        }`}
                      >
                        {uploadFeedback.message}
                      </Text>
                    </View>
                  ) : null}

                  <PressableScale
                    onPress={() => {
                      void handleSubmitCataractDetection();
                    }}
                    disabled={isPredicting}
                    style={{
                      marginTop: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(188, 210, 250, 0.30)',
                      backgroundColor: 'rgba(23, 40, 62, 0.95)',
                      paddingVertical: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isPredicting ? 0.75 : 1,
                    }}
                  >
                    {isPredicting ? (
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#D8E7FF" size="small" />
                        <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">
                          Analyzing...
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">
                        Submit Eye Image
                      </Text>
                    )}
                  </PressableScale>
                </GlassCard>
              </LinearGradient>

              {/* ── Chat with Spanda AI input section ── */}
              <View className="mt-4">
                <LinearGradient
                  colors={['rgba(120,207,191,0.20)', 'rgba(107,154,255,0.12)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 24, padding: 1 }}
                >
                  <GlassCard style={{ borderWidth: 0, backgroundColor: 'rgba(11, 18, 30, 0.92)', padding: 16 }}>
                    <PressableScale
                      onPress={openChatPage}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(120,207,191,0.22)',
                        backgroundColor: 'rgba(10, 16, 26, 0.75)',
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        marginBottom: 10,
                      }}
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <View className="h-7 w-7 items-center justify-center rounded-lg bg-[rgba(120,207,191,0.18)]">
                          <Ionicons name="chatbubbles-outline" size={15} color="#78CFBF" />
                        </View>
                        <Text className="text-sm font-bold text-[#F7FBFF]">Chat with Spanda AI</Text>
                        <View className="flex-1" />
                        <Ionicons name="arrow-forward" size={16} color="#8FB1E3" />
                      </View>
                      <Text className="text-xs text-[#8FA2C3] leading-5">
                        Tap here to open full AI Chat page.
                      </Text>
                    </PressableScale>

                    <View className="flex-row items-center gap-2 bg-[#090F18] border border-[#C7D9FF1A] rounded-xl px-3 py-1">
                      <TextInput
                        value={chatQuery}
                        onChangeText={setChatQuery}
                        placeholder="Ask anything or consult about eye symptoms..."
                        placeholderTextColor="#5C6F8E"
                        onSubmitEditing={handleSendQueryToAI}
                        style={{
                          flex: 1,
                          color: '#E8F1FF',
                          fontSize: 13,
                          paddingVertical: 8,
                        }}
                      />
                      <PressableScale
                        onPress={handleSendQueryToAI}
                        style={{
                          height: 32,
                          width: 32,
                          borderRadius: 8,
                          backgroundColor: '#1E2D44',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="send" size={13} color="#78CFBF" />
                      </PressableScale>
                    </View>
                  </GlassCard>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(640).delay(130)} className="mt-8">
            <Text className="mb-3 text-lg font-bold text-[#F2F7FF]">Quick AI Tools</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {quickTools.map(tool => (
                <PressableScale
                  key={tool.title}
                  onPress={() => router.push(tool.route as never)}
                  style={{
                    width: '48.4%',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(177, 199, 236, 0.2)',
                    backgroundColor: 'rgba(11, 17, 28, 0.88)',
                    padding: 14,
                  }}
                >
                  <View className="mb-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#17253A]">
                    <Ionicons name={tool.icon} size={19} color="#AFCBFF" />
                  </View>
                  <Text className="text-sm font-bold leading-5 text-[#F4F8FF]">{tool.title}</Text>
                  <Text className="mt-1 text-xs text-[#8FA2C3]">{tool.subtitle}</Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(670).delay(180)} className="mt-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#F2F7FF]">Recent Activity</Text>
              <Text className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8BA0C5]">Timeline</Text>
            </View>
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              {recentActivity.map((item, index) => (
                <View
                  key={item.title}
                  style={{
                    borderBottomWidth: index === recentActivity.length - 1 ? 0 : 1,
                    borderBottomColor: 'rgba(166, 186, 224, 0.18)',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <Text className="text-sm font-semibold text-[#F3F8FF]">{item.title}</Text>
                  <Text className="mt-1 text-xs text-[#8CA0C0]">{item.time}</Text>
                  <Text className="mt-1 text-xs font-medium text-[#7CD8C0]">{item.status}</Text>
                </View>
              ))}
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(700).delay(220)} className="mt-8">
            <Text className="mb-3 text-lg font-bold text-[#F2F7FF]">Smart Suggestions</Text>
            <View className="gap-3">
              {smartSuggestions.map(suggestion => (
                <PressableScale
                  key={suggestion}
                  onPress={() => router.push('/(tabs)/chat')}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(177, 199, 236, 0.2)',
                    backgroundColor: 'rgba(11, 17, 28, 0.88)',
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#16263C]">
                    <Ionicons name="bulb-outline" size={14} color="#AFCBFF" />
                  </View>
                  <Text className="flex-1 text-sm leading-5 text-[#DCE8FB]">{suggestion}</Text>
                  <Ionicons name="arrow-forward" size={15} color="#7F93B7" />
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}
