import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { UploadIllustration } from '@/components/illustrations';
import { useTheme } from '@/theme';
import { useScanUpload } from '../hooks/use-scan-upload';

export function ScanUploadCard() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <GlassCard style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <ThemeText style={[styles.title, { color: colors.text.primary }]} allowFontScaling>
          New Scan
        </ThemeText>
        <ThemeText style={[styles.subtitle, { color: colors.text.secondary }]} allowFontScaling>
          Upload an image of an eye for instant cataract screening.
        </ThemeText>
      </View>

      {/* Decorative Low-Opacity Vector Backdrop */}
      <View style={styles.illustrationWrap}>
        <UploadActionButtons />
        <UploadIllustration height={110} />
      </View>
    </GlassCard>
  );
}

export function UploadActionButtons() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { isPicking, handlePickImage } = useScanUpload();

  return (
    <View style={styles.buttonsRow}>
      <View style={styles.buttonFlex}>
        <Button
          label="Camera"
          variant="primary"
          icon={<Ionicons name="camera" size={22} color={colors.background.base} />}
          onPress={() => handlePickImage(true)}
          disabled={isPicking}
          style={styles.actionButton}
        />
      </View>

      <View style={styles.buttonFlex}>
        <Button
          label="Gallery"
          variant="primary"
          icon={<Ionicons name="images" size={22} color={colors.background.base} />}
          onPress={() => handlePickImage(false)}
          disabled={isPicking}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    minHeight: 215,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeader: {
    zIndex: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    zIndex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  buttonFlex: {
    flex: 1,
  },
  actionButton: {
    minHeight: 62,
    borderRadius: 16,
  },
});
