import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, clamp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import {
  cropWorkingImageToSquare,
  optimizeCroppedImage,
} from '@/features/upload/utils/image-cropper';
import type { WorkflowImage } from '@/features/upload/types/image.types';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { PressableScale } from '@/components/ui/PressableScale';

function getBaseScale(frameSize: number, image: WorkflowImage): number {
  return Math.max(frameSize / image.width, frameSize / image.height);
}

export function EyeCropScreen() {
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const workflow = useUploadWorkflowStore(state => state);
  const [frameLayout, setFrameLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(
    process.env.NODE_ENV === 'test' ? { x: 0, y: 0, width: 320, height: 320 } : null
  );

  const activeImage = workflow.workingImage ?? workflow.originalImage;
  const frameSize = useMemo(() => {
    const usableWidth = Math.max(240, screenWidth - 40);
    return Math.min(320, usableWidth);
  }, [screenWidth]);

  const baseScale = useMemo(() => {
    if (!activeImage) return 1;
    return getBaseScale(frameSize, activeImage);
  }, [activeImage, frameSize]);

  const imageWidth = activeImage ? activeImage.width * baseScale : 0;
  const imageHeight = activeImage ? activeImage.height * baseScale : 0;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const [isProcessing, setIsProcessing] = useState(false);


  // Reset state when image changes
  useEffect(() => {
    if (!activeImage) return;
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    panStartX.value = 0;
    panStartY.value = 0;
    pinchStartScale.value = 1;
  }, [activeImage, panStartX, panStartY, pinchStartScale, scale, translateX, translateY]);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(Boolean(activeImage) && !isProcessing)
      .onBegin(() => {
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
      })
      .onUpdate(event => {
        if (!activeImage) return;
        const maxX = Math.max(0, (imageWidth * scale.value - frameSize) / 2);
        const maxY = Math.max(0, (imageHeight * scale.value - frameSize) / 2);
        translateX.value = clamp(panStartX.value + event.translationX, -maxX, maxX);
        translateY.value = clamp(panStartY.value + event.translationY, -maxY, maxY);
      });
  }, [activeImage, frameSize, imageHeight, imageWidth, isProcessing, panStartX, panStartY, scale, translateX, translateY]);

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .enabled(Boolean(activeImage) && !isProcessing)
      .onBegin(() => {
        pinchStartScale.value = scale.value;
      })
      .onUpdate(event => {
        if (!activeImage) return;
        const next = clamp(pinchStartScale.value * event.scale, 1, 4.5);
        scale.value = next;
        const maxX = Math.max(0, (imageWidth * next - frameSize) / 2);
        const maxY = Math.max(0, (imageHeight * next - frameSize) / 2);
        translateX.value = clamp(translateX.value, -maxX, maxX);
        translateY.value = clamp(translateY.value, -maxY, maxY);
      });
  }, [activeImage, frameSize, imageHeight, imageWidth, isProcessing, pinchStartScale, scale, translateX, translateY]);

  const combinedGesture = useMemo(() => Gesture.Simultaneous(panGesture, pinchGesture), [panGesture, pinchGesture]);

  function onFrameLayout(event: LayoutChangeEvent) {
    const { x, y, width, height } = event.nativeEvent.layout;
    setFrameLayout({ x, y, width, height });
  }

  async function handleCancel() {
    if (isProcessing) return;
    workflow.clearWorkflow();
    router.back();
  }

  async function handleContinue() {
    if (!activeImage || !frameLayout || isProcessing) {

      return;
    }

    setIsProcessing(true);
    workflow.setCurrentProgressState('cropping_image');
    workflow.setUploadStatus('processing');
    try {
      const currentScale = scale.value;
      const croppedImage = await cropWorkingImageToSquare(activeImage, {
        frameSize,
        imageWidth: activeImage.width,
        imageHeight: activeImage.height,
        scale: currentScale,
        translateX: translateX.value,
        translateY: translateY.value,
      });
      workflow.setCroppedImage({
        uri: croppedImage.uri,
        name: activeImage.name.replace(/\.[^.]+$/, '-cropped.jpg'),
        mimeType: 'image/jpeg',
        fileSizeBytes: croppedImage.fileSize ?? 0,
        width: croppedImage.width,
        height: croppedImage.height,
      });
      workflow.setCurrentProgressState('optimizing_image');
      workflow.setUploadStatus('optimizing');
      const optimizedImage = await optimizeCroppedImage(croppedImage);
      workflow.setOptimizedImage({
        uri: optimizedImage.uri,
        name: activeImage.name.replace(/\.[^.]+$/, '-optimized.jpg'),
        mimeType: 'image/jpeg',
        fileSizeBytes: optimizedImage.fileSize ?? 0,
        width: optimizedImage.width,
        height: optimizedImage.height,
      });
      workflow.setCurrentProgressState('image_ready');
      workflow.setUploadStatus('ready');

      if (workflow.origin === 'home') {
        router.push('/scan-analysis' as never);
      } else {
        router.back();
      }

    } catch {
     
    } finally {
      setIsProcessing(false);
    }
  }

  if (!activeImage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
        <ScreenBackground />
        <View className="flex-1 items-center justify-center px-5">
          <ErrorNotice
            title="Image missing"
            message="Please select an eye image."
            actionLabel="Close"
            onAction={handleCancel}
            compact
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <ScreenBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 px-6 pt-2">
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
            marginBottom: theme.spacing.md,
          }}>
            <PressableScale onPress={handleCancel} style={{ padding: theme.spacing.xs, borderRadius: theme.radii.md }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </PressableScale>
            <ThemeText variant="heading">Crop Image</ThemeText>
            {/* placeholder to center title */}
            <View style={{ width: 40 }} />
          </View>

          {/* Crop area */}
          <View className="flex-1 items-center justify-center">
            <View
              onLayout={onFrameLayout}
              style={{
                width: frameSize,
                height: frameSize,
                borderRadius: 32,
                overflow: 'hidden',
                backgroundColor: '#000',
                borderWidth: 2,
                borderColor: theme.colors.border.subtle,
              }}
            >
              <GestureDetector gesture={combinedGesture}>
                <Animated.View style={[animatedImageStyle, { position: 'absolute', left: frameSize / 2 - imageWidth / 2, top: frameSize / 2 - imageHeight / 2, width: imageWidth, height: imageHeight }]}>
                  <Image source={{ uri: activeImage.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
                </Animated.View>
              </GestureDetector>
              {/* Subtle guide */}
              <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <View style={{ width: frameSize * 0.7, height: frameSize * 0.7, borderRadius: (frameSize * 0.7) / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' }} />
              </View>
            </View>
            <ThemeText variant="caption" style={{ textAlign: 'center', marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>Pinch to scale and drag to position your eye within the guide.</ThemeText>
          </View>

          {/* Action button */}
          <View className="mt-8 mb-6">
            <Button
              label={isProcessing ? 'Processing...' : 'Confirm Crop'}
              onPress={() => void handleContinue()}
              isLoading={isProcessing}
              disabled={isProcessing}
            />
          </View>
        </View>

        {/* Processing overlay */}
        {isProcessing && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? 'rgba(11, 15, 26, 0.85)' : 'rgba(255, 255, 255, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <ActivityIndicator size="large" color={theme.colors.accent.primary} />
            <ThemeText style={{ marginTop: theme.spacing.sm, color: theme.colors.text.primary, fontWeight: '500' }}>Analyzing image...</ThemeText>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
