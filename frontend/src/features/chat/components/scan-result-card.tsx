import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, AlertTriangle, Eye } from 'react-native-feather'; // using feather icons, ensure package installed
import { formatPredictionLabel, formatConfidenceLabel, getClinicalNote } from '@/features/chat/utils/scan-result-formatters';

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
        <Eye width={20} height={20} color={isHigh ? '#4CAF50' : '#FFB300'} />
        <Text style={styles.headerText}>Eye Scan Result</Text>
      </View>
      <View style={styles.bodyRow}>
        <Text style={styles.prediction}>{humanPrediction}</Text>
        <Text style={styles.confidence}>{confidenceLabel}</Text>
      </View>
      <View style={styles.noteRow}>
        {isHigh ? (
          <CheckCircle width={18} height={18} color="#4CAF50" />
        ) : (
          <AlertTriangle width={18} height={18} color="#FFB300" />
        )}
        <Text style={styles.noteText}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2A3B',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2A3D5C',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerText: {
    marginLeft: 6,
    color: '#E1E8F5',
    fontSize: 14,
    fontWeight: '600',
  },
  bodyRow: {
    marginVertical: 6,
  },
  prediction: {
    color: '#F0F4FF',
    fontSize: 16,
    fontWeight: '500',
  },
  confidence: {
    color: '#AFC7E0',
    fontSize: 13,
    marginTop: 2,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  noteText: {
    marginLeft: 6,
    color: '#C5D2E6',
    fontSize: 13,
    flex: 1,
    flexWrap: 'wrap',
  },
});
