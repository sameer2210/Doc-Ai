import {
  formatConfidenceLabel,
  formatPredictionLabel,
  getClinicalNote,
} from '@/features/chat/utils/scan-result-formatters';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

export type ScanResultCardProps = {
  prediction: string;
  confidence: number;
};

export function ScanResultCard({ prediction, confidence }: ScanResultCardProps) {
  const { theme } = useTheme();
  
  const humanPrediction = formatPredictionLabel(prediction);
  const confidenceLabel = formatConfidenceLabel(confidence);
  const note = getClinicalNote(confidence, prediction);

  const isHigh = confidenceLabel === 'High Confidence';

  return (
    <View style={styles.card} accessibilityLabel="scan result card">
      <View style={styles.headerRow}>
        <Ionicons name="eye-outline" size={20} color={theme.colors.accent.primary} />
        <Text style={[styles.headerText, { color: theme.colors.text.primary }]}>Eye Scan Result</Text>
      </View>
      <View style={styles.bodyRow}>
        <Text style={[styles.prediction, { color: theme.colors.text.primary }]}>{humanPrediction}</Text>
        <Text style={[styles.confidence, { color: theme.colors.text.secondary }]}>{confidenceLabel}</Text>
      </View>

      <View style={styles.noteRow}>
        <Ionicons
          style={{ marginTop: 2 }}
          name={isHigh ? 'checkmark-circle-outline' : 'alert-circle-outline'}
          size={18}
          color={theme.colors.accent.primary}
        />

        <Text style={[styles.noteText, { color: theme.colors.text.secondary }]}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 4,
    marginVertical: 8,
    width: '100%',
    minHeight: 150,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
  },
  bodyRow: {
    marginVertical: 6,
    width: '100%',
  },
  prediction: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    width: '100%',
  },
  noteText: {
    marginLeft: 10,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    flexShrink: 1,
  },
});
