import {
  formatConfidenceLabel,
  formatPredictionLabel,
  getClinicalNote,
} from '@/features/chat/utils/scan-result-formatters';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ScanResultCardProps = {
  prediction: string;
  confidence: number;
};

export function ScanResultCard({ prediction, confidence }: ScanResultCardProps) {
  const humanPrediction = formatPredictionLabel(prediction);
  const confidenceLabel = formatConfidenceLabel(confidence);
  const note = getClinicalNote(confidence, prediction);

  const isHigh = confidenceLabel === 'High Confidence';

  return (
    <View style={styles.card} accessibilityLabel="scan result card">
      <View style={styles.headerRow}>
        <Ionicons name="eye-outline" size={20} color={isHigh ? '#8C6B3E' : '#8C6B3E'} />
        <Text style={styles.headerText}>Eye Scan Result</Text>
      </View>
      <View style={styles.bodyRow}>
        <Text style={styles.prediction}>{humanPrediction}</Text>
        <Text style={styles.confidence}>{confidenceLabel}</Text>
      </View>

      <View style={styles.noteRow}>
        <Ionicons
          style={{ marginTop: 2 }}
          name={isHigh ? 'checkmark-circle-outline' : 'alert-circle-outline'}
          size={18}
          color={isHigh ? '#8C6B3E' : '#8C6B3E'}
        />

        <Text style={styles.noteText}>{note}</Text>
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
    color: '#E1E8F5',
    fontSize: 15,
    fontWeight: '700',
  },

  bodyRow: {
    marginVertical: 6,
    width: '100%',
  },

  prediction: {
    color: '#F0F4FF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },

  confidence: {
    color: '#AFC7E0',
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
    color: '#C5D2E6',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    flexShrink: 1,
  },
});
