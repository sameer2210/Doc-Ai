import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, clamp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { AnalysisProgress } from '@/features/upload/components/analysis-progress';
import { CropOverlay } from '@/features/upload/components/crop-overlay';
import { EyeGuideIcon } from '@/features/upload/components/eye-guide-icon';
import { UPLOAD_IMAGE_FLOW_COPY } from '@/features/upload/constants/image.constants';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import {
  cropWorkingImageToSquare,
  optimizeCroppedImage,
  shouldCreateWorkingImage,
} from '@/features/upload/utils/image-cropper';
import type { WorkflowImage } from '@/features/upload/types/image.types';
import { CropGuideCard } from '../instructions';
import { appTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

const IMAGE_CROP_FLOW_LOG_PREFIX = '[EyeCropFlow]';

function getBaseScale(frameSize: number, image: WorkflowImage): number {
  return Math.max(frameSize / image.width, frameSize / image.height);
}

export function EyeCropScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const workflow = useUploadWorkflowStore(state => state);
  const [frameLayout, setFrameLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);

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

  // Lifecycle logs (no UI impact)
  useEffect(() => {
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-screen-mounted');
  }, []);

  // Reset state when image changes
  useEffect(() => {
    if (!activeImage) return;
    setCropError(null);
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    panStartX.value = 0;
    panStartY.value = 0;
    pinchStartScale.value = 1;
  }, [activeImage, panStartX, panStartY, pinchStartScale, scale, translateX, translateY]);

  // Guard against missing image
  useEffect(() => {
    if (workflow.flowId && !activeImage) {
      setCropError('No image selected.');
    }
  }, [activeImage, workflow.flowId]);

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
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-frame-layout-measured', { x, y, width, height });
  }

  async function handleCancel() {
    if (isProcessing) return;
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop:cancel');
    workflow.clearWorkflow();
    router.dismissAll();
  }

  async function handleContinue() {
    if (!activeImage || !frameLayout || isProcessing) {
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-confirm-clicked', {
        hasActiveImage: Boolean(activeImage),
        hasFrameLayout: Boolean(frameLayout),
        isCropping: isProcessing,
      });
      return;
    }
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-confirm-clicked', {
      hasActiveImage: Boolean(activeImage),
      hasFrameLayout: Boolean(frameLayout),
      isCropping: isProcessing,
    });
    setIsProcessing(true);
    setCropError(null);
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
      router.back();
    } catch (error) {
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop:handleContinue:error', error);
      workflow.setLastErrorCode('CROP_FAILED');
      setCropError(error instanceof Error ? error.message : 'Unable to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  if (!activeImage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.colors.background.base }}>
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

  const showWorkingImageWarning = shouldCreateWorkingImage(workflow.originalImage ?? activeImage);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0F1A' }}>
      <ScreenBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 px-6 pt-2">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity onPress={handleCancel} className="p-2 -ml-2">
              <Ionicons name="arrow-back" size={24} color="#E2E8F0" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white tracking-tight">Crop Image</Text>
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
                borderColor: '#1E293B',
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
            <Text className="mt-6 text-sm text-[#94A3B8] text-center px-4">Pinch to scale and drag to position your eye within the guide.</Text>
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
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 15, 26, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-white font-medium">Analyzing image...</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
