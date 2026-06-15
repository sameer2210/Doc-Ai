import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';
import { useScanUpload } from '../hooks/use-scan-upload';

export function ScanUploadCard() {
  const { theme, isDark } = useTheme();
  const { isPicking, handlePickImage } = useScanUpload();

  return (
    <GlassCard className="p-6 mb-6">
      <View className="mb-6">
        <Text style={{ color: isDark ? '#E8F1FF' : '#111827' }} className="text-xl font-bold mb-2">
          New Scan
        </Text>
        <Text
          style={{ color: isDark ? '#8FA2C3' : '#6B7280' }}
          className="text-base leading-relaxed"
        >
          Upload an image of an eye for instant cataract screening.
        </Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label="Camera"
            variant="primary"
            icon={<Ionicons name="camera-outline" size={20} color="#03112D" />}
            onPress={() => handlePickImage(true)}
            disabled={isPicking}
            style={{ minHeight: 52 }}
          />
        </View>

        <View className="flex-1">
          <Button
            label="Gallery"
            variant="primary"
            icon={<Ionicons name="image-outline" size={20} color="#03112D" />}
            onPress={() => handlePickImage(false)}
            disabled={isPicking}
            style={{ minHeight: 52 }}
          />
        </View>
      </View>
    </GlassCard>
  );
}
