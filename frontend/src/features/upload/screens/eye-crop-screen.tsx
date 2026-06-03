import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
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
import { appTheme } from '@/theme';

const IMAGE_CROP_FLOW_LOG_PREFIX = '[EyeCropFlow]';

// function clamp(value: number, min: number, max: number): number {
//   return Math.min(max, Math.max(min, value));
// }

function getBaseScale(frameSize: number, image: WorkflowImage): number {
  return Math.max(frameSize / image.width, frameSize / image.height);
}

export function EyeCropScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const workflow = useUploadWorkflowStore(state => state);
  const [frameLayout, setFrameLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);

  const activeImage = workflow.workingImage ?? workflow.originalImage;
  const frameSize = useMemo(() => {
    const usableWidth = Math.max(240, screenWidth - 40);
    return Math.min(320, usableWidth);
  }, [screenWidth]);

  const baseScale = useMemo(() => {
    if (!activeImage) {
      return 1;
    }
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

  useEffect(() => {
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-screen-mounted');
  }, []);

  useEffect(() => {
    if (!activeImage) {
      return;
    }

    setCropError(null);
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    panStartX.value = 0;
    panStartY.value = 0;
    pinchStartScale.value = 1;
  }, [
    activeImage,
    panStartX,
    panStartY,
    pinchStartScale,
    scale,
    translateX,
    translateY,
  ]);

  useEffect(() => {
    if (workflow.flowId && !activeImage) {
      setCropError('No image selected.');
    }
  }, [activeImage, workflow.flowId]);

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(Boolean(activeImage) && !isProcessing)
      .onBegin(() => {
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
      })
      .onUpdate(event => {
        if (!activeImage) {
          return;
        }

        const nextScale = scale.value;
        const maxTranslateX = Math.max(0, (imageWidth * nextScale - frameSize) / 2);
        const maxTranslateY = Math.max(0, (imageHeight * nextScale - frameSize) / 2);
        translateX.value = clamp(panStartX.value + event.translationX, -maxTranslateX, maxTranslateX);
        translateY.value = clamp(panStartY.value + event.translationY, -maxTranslateY, maxTranslateY);
      });
  }, [activeImage, frameSize, imageHeight, imageWidth, isProcessing, panStartX, panStartY, scale, translateX, translateY]);

  const pinchGesture = useMemo(() => {
    return Gesture.Pinch()
      .enabled(Boolean(activeImage) && !isProcessing)
      .onBegin(() => {
        pinchStartScale.value = scale.value;
      })
      .onUpdate(event => {
        if (!activeImage) {
          return;
        }

        const nextScale = clamp(pinchStartScale.value * event.scale, 1, 4.5);
        scale.value = nextScale;

        const maxTranslateX = Math.max(0, (imageWidth * nextScale - frameSize) / 2);
        const maxTranslateY = Math.max(0, (imageHeight * nextScale - frameSize) / 2);
        translateX.value = clamp(translateX.value, -maxTranslateX, maxTranslateX);
        translateY.value = clamp(translateY.value, -maxTranslateY, maxTranslateY);
      });
  }, [activeImage, frameSize, imageHeight, imageWidth, isProcessing, pinchStartScale, scale, translateX, translateY]);

  const combinedGesture = useMemo(() => Gesture.Simultaneous(panGesture, pinchGesture), [panGesture, pinchGesture]);

  function onFrameLayout(event: LayoutChangeEvent) {
    const { x, y, width, height } = event.nativeEvent.layout;
    setFrameLayout({ x, y, width, height });
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-frame-layout-measured', { x, y, width, height });
  }

  async function handleCancel() {
    if (isProcessing) {
      return;
    }
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
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-start', {
        activeUri: activeImage.uri,
        frameSize,
        imageWidth: activeImage.width,
        imageHeight: activeImage.height,
      });
      const currentScale = scale.value;
      const croppedImage = await cropWorkingImageToSquare(activeImage, {
        frameSize,
        imageWidth: activeImage.width,
        imageHeight: activeImage.height,
        scale: currentScale,
        translateX: translateX.value,
        translateY: translateY.value,
      });
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-complete', {
        uri: croppedImage.uri,
        width: croppedImage.width,
        height: croppedImage.height,
        fileSize: croppedImage.fileSize,
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
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'optimize-complete', {
        uri: optimizedImage.uri,
        width: optimizedImage.width,
        height: optimizedImage.height,
        fileSize: optimizedImage.fileSize,
      });

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
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop:handleContinue:finally');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.colors.background.base }}>
      <ScreenBackground />

      <View className="flex-1 px-5 pt-4">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8FA2C7]">
                SpandaVidya AI
              </Text>
              <Text className="mt-1 text-2xl font-bold text-[#F6FAFF]">
                {UPLOAD_IMAGE_FLOW_COPY.cropTitle}
              </Text>
            </View>
            <Button label="Cancel" variant="outline" onPress={handleCancel} style={{ minHeight: 42 }} />
          </View>

          <View className="mb-4 gap-2">
            <Text className="text-base font-semibold text-[#F3F8FF]">
              {UPLOAD_IMAGE_FLOW_COPY.cropInstruction}
            </Text>
            <Text className="text-sm leading-5 text-[#8FA2C3]">
              {UPLOAD_IMAGE_FLOW_COPY.cropSecondaryInstruction}
            </Text>
          </View>

          <View className="items-center">
            <View
              onLayout={onFrameLayout}
              style={{
                width: frameSize,
                height: frameSize,
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: 'rgba(8, 14, 24, 0.94)',
                borderWidth: 1,
                borderColor: appTheme.colors.border.soft,
              }}
            >
              <GestureDetector gesture={combinedGesture}>
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      left: frameSize / 2 - imageWidth / 2,
                      top: frameSize / 2 - imageHeight / 2,
                      width: imageWidth,
                      height: imageHeight,
                    },
                    animatedImageStyle,
                  ]}
                >
                  <Image
                    source={{ uri: activeImage.uri }}
                    resizeMode="cover"
                    style={{ width: '100%', height: '100%' }}
                  />
                </Animated.View>
              </GestureDetector>

              <View
                style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}
              >
                <EyeGuideIcon size={Math.min(96, Math.round(frameSize * 0.3))} />
              </View>

              <CropOverlay
                frameLayout={frameLayout}
                screenWidth={screenWidth}
                screenHeight={screenHeight}
              />
            </View>
          </View>

          {showWorkingImageWarning ? (
            <View className="mt-3 rounded-2xl border border-[#2A3A59] bg-[#10192AF0] px-3 py-2">
              <Text className="text-xs text-[#CFE0FF]">{UPLOAD_IMAGE_FLOW_COPY.workingImageWarning}</Text>
            </View>
          ) : null}

          <View className="mt-4">
            <AnalysisProgress activeStage={workflow.currentProgressState} compact />
          </View>

          {cropError ? (
            <View className="mt-4">
              <ErrorNotice
                title="Crop failed"
                message={cropError}
                onDismiss={() => setCropError(null)}
                compact
              />
            </View>
          ) : null}
        </ScrollView>

        <View className="border-t border-[#223047] bg-[#06080DFC] pt-3">
          <View className="flex-row gap-3 pb-4">
            <View className="flex-1">
              <Button label="Retake" variant="secondary" onPress={handleCancel} disabled={isProcessing} />
            </View>
            <View className="flex-1">
              <Button
                label={isProcessing ? 'Processing...' : 'Continue'}
                onPress={() => {
                  void handleContinue();
                }}
                isLoading={isProcessing}
                disabled={isProcessing}
              />
            </View>
          </View>
        </View>

        {isProcessing ? (
          <View
            pointerEvents="auto"
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(2, 6, 12, 0.72)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 340,
                borderRadius: 24,
                backgroundColor: 'rgba(10, 16, 26, 0.94)',
                borderWidth: 1,
                borderColor: appTheme.colors.border.soft,
                padding: 18,
              }}
            >
              <AnalysisProgress activeStage={workflow.currentProgressState} compact />
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
