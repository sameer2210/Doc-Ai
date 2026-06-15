import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Animated } from 'react-native';

import { USER_FACING_PROGRESS_STAGES } from '@/features/upload/constants/image.constants';
import type { UploadProgressStage } from '@/features/upload/types/image.types';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { Ionicons } from '@expo/vector-icons';

type AnalysisProgressProps = {
  activeStage: UploadProgressStage;
  uploadPercent?: number | null;
  compact?: boolean;
};

export function AnalysisProgress({
  activeStage,
  uploadPercent = null,
  compact = false,
}: AnalysisProgressProps) {
  const { theme } = useTheme();
  
  const mappedStage = USER_FACING_PROGRESS_STAGES.find(s => 
    s.internalStages.includes(activeStage)
  ) || USER_FACING_PROGRESS_STAGES[0];

  const isUploading = mappedStage.id === 'uploading_image';
  const isComplete = mappedStage.id === 'analysis_complete';
  
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let targetValue = 0;
    
    if (isComplete) {
      targetValue = 100;
    } else if (isUploading && uploadPercent !== null) {
      targetValue = uploadPercent;
    }

    Animated.timing(progressAnim, {
      toValue: targetValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isUploading, uploadPercent, isComplete, progressAnim]);

  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isComplete ? theme.colors.successSurface : theme.colors.accentSurface,
          borderWidth: 1,
          borderColor: isComplete ? theme.colors.text.success : theme.colors.accent.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md
        }}>
          {isComplete ? (
            <Ionicons name="checkmark" size={20} color={theme.colors.text.success} />
          ) : (
            <ActivityIndicator size="small" color={theme.colors.accent.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <ThemeText style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 2 }} allowFontScaling>
            {mappedStage.label}
          </ThemeText>
          <ThemeText style={{ fontSize: 13, color: theme.colors.text.secondary }} allowFontScaling>
            {mappedStage.description}
          </ThemeText>
        </View>
        
        {isUploading && uploadPercent !== null && (
          <ThemeText style={{ fontSize: 16, fontWeight: '700', color: theme.colors.accent.primary }} allowFontScaling>
            {uploadPercent}%
          </ThemeText>
        )}
      </View>

      <View style={{ 
        height: 6, 
        backgroundColor: theme.colors.background.surfaceStrong, 
        borderRadius: 3, 
        overflow: 'hidden' 
      }}>
        <Animated.View style={{ 
          height: '100%', 
          backgroundColor: isComplete ? theme.colors.text.success : theme.colors.accent.primary, 
          width: progressAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%']
          }),
          borderRadius: 3
        }} />
      </View>
    </View>
  );
}
