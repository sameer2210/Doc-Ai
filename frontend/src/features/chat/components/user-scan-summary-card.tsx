import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

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
  const { theme } = useTheme();
  const confidencePercent = Math.round(confidence * 100);
  const confidenceDecimal = confidence.toFixed(3);

  const cardGradientColors = [
    theme.colors.floatingOrbSecondary,
    theme.colors.floatingOrbPrimary,
  ] as [string, string];

  const textColorStyle = {
    color: theme.colors.chatUserBubbleText,
  };

  return (
    <LinearGradient
      colors={cardGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: theme.colors.border.soft }]}
    >
      <View style={styles.titleRow}>
        <Ionicons name="scan-outline" size={16} color={theme.colors.chatUserBubbleText} style={{ opacity: 0.85 }} />
        <Text style={[styles.title, textColorStyle]}>Scan Submitted</Text>
      </View>

      <Text style={[styles.primary, textColorStyle]}>{formatPredictionLabel(prediction)}</Text>

      <Text style={[styles.confidence, textColorStyle]}>
        AI detected this scan with approximately {confidencePercent}% confidence.
      </Text>

      <View style={[styles.badge, { backgroundColor: theme.colors.border.subtle }]}>
        <Text style={[styles.badgeText, textColorStyle]}>{formatConfidenceLabel(confidence)}</Text>
      </View>

      {/* ML Model Details Section */}
      <View style={[styles.detailsSection, { borderTopColor: theme.colors.border.subtle }]}>
        <Text style={[styles.detailsHeader, textColorStyle]}>Model Output Details</Text>

        <View style={[styles.detailRow, { borderBottomColor: theme.colors.border.subtle }]}>
          <Text style={[styles.detailLabel, textColorStyle]}>Prediction:</Text>
          <Text style={[styles.detailValue, textColorStyle]}>{prediction}</Text>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: theme.colors.border.subtle }]}>
          <Text style={[styles.detailLabel, textColorStyle]}>Confidence Score:</Text>
          <Text style={[styles.detailValue, textColorStyle]}>
            {confidenceDecimal} ({confidencePercent}%)
          </Text>
        </View>

        {aiProvider && (
          <View style={[styles.detailRow, { borderBottomColor: theme.colors.border.subtle }]}>
            <Text style={[styles.detailLabel, textColorStyle]}>AI Provider:</Text>
            <Text style={[styles.detailValue, textColorStyle]}>{aiProvider}</Text>
          </View>
        )}

        {modelVersion && (
          <View style={[styles.detailRow, { borderBottomColor: theme.colors.border.subtle }]}>
            <Text style={[styles.detailLabel, textColorStyle]}>Model Version:</Text>
            <Text style={[styles.detailValue, textColorStyle]}>{modelVersion}</Text>
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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  primary: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 8,
  },
  confidence: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    opacity: 0.8,
  },
  badge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  detailsHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
    opacity: 0.75,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
    opacity: 0.9,
  },
});
