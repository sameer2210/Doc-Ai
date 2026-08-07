import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { usePredictionStore, type PredictionResult } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { useChatStore } from '@/features/chat/store/chat-store';
import { useTheme } from '@/theme';

export function ResultActions({ prediction }: { prediction: PredictionResult }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  const clearPending = usePredictionStore(state => state.clearPending);
  const clearWorkflow = useUploadWorkflowStore(state => state.clearWorkflow);

  const handleConsultAI = () => {
    if (!prediction) return;

    if (!prediction.chatId) {
      // Show error if chatId is missing
      alert('Chat session not found. Please try scanning again.');
      return;
    }

    // Explicitly set the active chat session in the store
    useChatStore.getState().setActiveChatId(prediction.chatId);

    // Explicitly allow consultation to start
    usePredictionStore.setState({ shouldAutoConsult: true });

    // Push to Chat Screen. The ChatScreen will automatically detect the pending prediction and trigger the consultation.
    router.push('/(tabs)/chat' as never);
  };

  const handleStartNewScan = () => {
    clearPending();
    clearWorkflow();
    router.push('/scan-upload' as never);
  };

  const handleReturnHome = () => {
    clearPending();
    clearWorkflow();
    router.push('/(tabs)' as never);
  };

  return (
    <View className="gap-4 mt-6">
      <Button
        label="Discuss With SpandaVidya AI"
        variant="primary"
        icon={<Ionicons name="chatbubbles-outline" size={18} color={colors.background.base} style={styles.icon} />}
        onPress={handleConsultAI}
        disabled={!prediction}
      />

      <Button
        label="Start New Scan"
        variant="outline"
        icon={<Ionicons name="scan-outline" size={18} color={colors.text.secondary} style={styles.icon} />}
        onPress={handleStartNewScan}
      />

      <Button
        label="Return to Dashboard"
        variant="secondary"
        icon={<Ionicons name="home-outline" size={18} color={colors.text.primary} style={styles.icon} />}
        onPress={handleReturnHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    marginRight: 8,
  },
});

