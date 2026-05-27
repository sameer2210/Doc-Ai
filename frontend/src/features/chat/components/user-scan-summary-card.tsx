import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatConfidenceLabel, formatPredictionLabel } from '@/features/chat/utils/scan-result-formatters';

type UserScanSummaryCardProps = {
  prediction: string;
  confidence: number;
};

export function UserScanSummaryCard({ prediction, confidence }: UserScanSummaryCardProps) {
  const confidencePercent = Math.round(confidence * 100);

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="scan-outline" size={16} color="#DBE7FF" />
        <Text style={styles.title}>Scan Submitted</Text>
      </View>
      <Text style={styles.primary}>{formatPredictionLabel(prediction)}</Text>
      <Text style={styles.secondary}>
        {confidencePercent}% confidence ({formatConfidenceLabel(confidence)})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(227, 239, 255, 0.45)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    color: '#E8F1FF',
    fontSize: 12,
    fontWeight: '700',
  },
  primary: {
    color: '#F5FAFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondary: {
    marginTop: 2,
    color: '#D3E2FB',
    fontSize: 12,
    fontWeight: '600',
  },
});
