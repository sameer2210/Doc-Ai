import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatConfidenceLabel,
  formatPredictionLabel,
} from '@/features/chat/utils/scan-result-formatters';

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

      <Text style={styles.confidence}>
        AI detected this scan with approximately {confidencePercent}% confidence.
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{formatConfidenceLabel(confidence)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 14,

    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',

    marginTop: 4,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },

  title: {
    color: '#E8F1FF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  primary: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 8,
  },

  confidence: {
    color: '#D3E2FB',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },

  badge: {
    marginTop: 12,
    alignSelf: 'flex-start',

    backgroundColor: 'rgba(255,255,255,0.10)',

    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  badgeText: {
    color: '#F3F8FF',
    fontSize: 12,
    fontWeight: '700',
  },
});
