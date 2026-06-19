import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';
import { useScanUpload } from '../hooks/use-scan-upload';

export function ScanUploadCard() {
  const { theme } = useTheme();
  const { colors, spacing } = theme;
  const { isPicking, handlePickImage } = useScanUpload();

  return (
    <GlassCard style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
      <View style={{ marginBottom: spacing.lg }}>
        <ThemeText style={{ color: colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: spacing.xs }} allowFontScaling>
          New Scan
        </ThemeText>
        <ThemeText
          style={{ color: colors.text.secondary, fontSize: 16, lineHeight: 24 }}
          allowFontScaling
        >
          Upload an image of an eye for instant cataract screening.
        </ThemeText>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
            <Button
              label="Camera"
              variant="primary"
              icon={<Ionicons name="camera-outline" size={20} color={colors.background.base} />}
              onPress={() => handlePickImage(true)}
              disabled={isPicking}
              style={{ minHeight: 52 }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Button
              label="Gallery"
              variant="primary"
              icon={<Ionicons name="image-outline" size={20} color={colors.background.base} />}
            onPress={() => handlePickImage(false)}
            disabled={isPicking}
            style={{ minHeight: 52 }}
          />
        </View>
      </View>
    </GlassCard>
  );
}
