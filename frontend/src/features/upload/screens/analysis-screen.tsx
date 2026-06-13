import React, { useEffect, useRef } from 'react';
import { View, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { useTheme } from '@/theme';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { useImageAnalysis } from '../hooks/use-image-analysis';
import { AnalysisStatusCard } from '../components/analysis-status-card';
import { ThemeText } from '@/components/ui/theme/ThemeText';

export function AnalysisScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  
  const workflow = useUploadWorkflowStore(state => state);
  const { analyzeImage, analysisError, isPredicting } = useImageAnalysis();
  
  const handledWorkflowIdRef = useRef<string | null>(null);

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

  // If there's an error and they hit retry, we clear the handled ref and try again
  const handleRetry = () => {
    handledWorkflowIdRef.current = null;
  };

  const handleCancel = () => {
    workflow.clearWorkflow();
    router.push('/scan-upload' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <ScreenBackground />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Analysis in Progress',
          headerStyle: {
            backgroundColor: isDark ? theme.colors.background.base : '#fff',
          },
          headerTintColor: isDark ? '#E8F1FF' : '#111827',
          headerShadowVisible: false,
          headerLeft: () => null, // Prevent going back during analysis
          gestureEnabled: false,
        }}
      />
      
      <SafeAreaView className="flex-1 p-5 justify-center" edges={['bottom', 'left', 'right']}>
        {analysisError ? (
          <View>
            <ErrorNotice
              title={analysisError.title}
              message={analysisError.message}
              actionLabel={analysisError.actionLabel}
              onAction={analysisError.onAction}
            />
          </View>
        ) : (
          <View className="flex-col items-center">
            {workflow.optimizedImage && (
              <View className="mb-10 w-48 h-48 rounded-full overflow-hidden border-4 border-primary/20">
                <Image
                  source={{ uri: workflow.optimizedImage.uri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            )}
            
            <View className="w-full">
              <AnalysisStatusCard />
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
