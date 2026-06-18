import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { usePredictionStore, type PredictionResult } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';

export function ResultActions({ prediction }: { prediction: PredictionResult }) {
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
        icon={<Ionicons name="chatbubbles-outline" size={18} color="#03112D" />}
        onPress={handleConsultAI}
        disabled={!prediction}
        style={{ minHeight: 48 }}
      />

      <Button
        label="Start New Scan"
        variant="secondary"
        icon={<Ionicons name="scan-outline" size={18} color="#03112D" />}
        onPress={handleStartNewScan}
        style={{ minHeight: 48, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' }}
      />

      <Button
        label="Return to Dashboard"
        variant="secondary"
        icon={<Ionicons name="home-outline" size={18} color="#EAF2FF" />}
        onPress={handleReturnHome}
        style={{ minHeight: 48 }}
      />
    </View>
  );
}
