import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatConfidenceLabel,
  formatPredictionLabel,
} from '@/features/chat/utils/scan-result-formatters';

type UserScanSummaryCardProps = {
  prediction: string;
  confidence: number;
  aiProvider?: string;
  modelVersion?: string;
};

export function UserScanSummaryCard({
  prediction,
  confidence,
  aiProvider,
  modelVersion,
}: UserScanSummaryCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceDecimal = confidence.toFixed(3);

  return (
    <LinearGradient
      colors={['rgba(122, 216, 192, 0.12)', 'rgba(110, 168, 255, 0.08)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
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

      {/* ML Model Details Section */}
      <View style={styles.detailsSection}>
        <Text style={styles.detailsHeader}>Model Output Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Prediction:</Text>
          <Text style={styles.detailValue}>{prediction}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Confidence Score:</Text>
          <Text style={styles.detailValue}>
            {confidenceDecimal} ({confidencePercent}%)
          </Text>
        </View>

        {aiProvider && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>AI Provider:</Text>
            <Text style={styles.detailValue}>{aiProvider}</Text>
          </View>
        )}

        {modelVersion && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model Version:</Text>
            <Text style={styles.detailValue}>{modelVersion}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 14,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: 'rgba(122, 216, 192, 0.25)',

    marginTop: 4,
    overflow: 'hidden',
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

  // ML Model Details Styles
  detailsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },

  detailsHeader: {
    color: '#B8D0F0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  detailLabel: {
    color: '#A8C5E8',
    fontSize: 12,
    fontWeight: '600',
  },

  detailValue: {
    color: '#E8F1FF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
});
