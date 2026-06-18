import React, { useEffect, useRef } from 'react';
import { View, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { useImageAnalysis } from '../hooks/use-image-analysis';
import { AnalysisStatusCard } from '../components/analysis-status-card';

export function AnalysisScreen() {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;
  const router = useRouter();
  
  const workflow = useUploadWorkflowStore(state => state);
  const { analyzeImage, isPredicting } = useImageAnalysis();
  
  const handledWorkflowIdRef = useRef<string | null>(null);

  // If required workflow image or flowId is missing: immediately redirect
  useEffect(() => {
    if (!workflow.optimizedImage || !workflow.flowId) {
      router.replace('/scan-upload' as never);
    }
  }, [workflow.optimizedImage, workflow.flowId, router]);

  useEffect(() => {
    if (
      !workflow.optimizedImage ||
      !workflow.flowId ||
      handledWorkflowIdRef.current === workflow.flowId ||
      isPredicting
    ) {
      return;
    }

    handledWorkflowIdRef.current = workflow.flowId;
    
    // Fire off the analysis
    void analyzeImage({
      uri: workflow.optimizedImage.uri,
      name: workflow.optimizedImage.name,
      mimeType: workflow.optimizedImage.mimeType,
    });
  }, [
    workflow.flowId,
    workflow.optimizedImage,
    isPredicting,
    analyzeImage
  ]);

  if (!workflow.optimizedImage || !workflow.flowId) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <ScreenBackground />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Analysis in Progress',
          headerStyle: {
            backgroundColor: colors.background.base,
          },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          headerLeft: () => null, // Prevent going back during analysis
          gestureEnabled: false,
        }}
      />
      
      <SafeAreaView style={{ flex: 1, padding: spacing.xl, justifyContent: 'center' }} edges={['bottom', 'left', 'right']}>
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          {workflow.optimizedImage && (
            <View style={{ marginBottom: spacing.xxl, width: 192, height: 192, borderRadius: radii.full, overflow: 'hidden', borderWidth: 4, borderColor: colors.accentSurface }}>
              <Image
                source={{ uri: workflow.optimizedImage.uri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          )}
          
          <View style={{ width: '100%' }}>
            <AnalysisStatusCard />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
