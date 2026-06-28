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
  variant?: 'standalone' | 'embedded';
};

export function UserScanSummaryCard({
  prediction,
  confidence,
  aiProvider,
  modelVersion,
  variant = 'standalone',
}: UserScanSummaryCardProps) {
  const { theme, isDark } = useTheme();
  const confidencePercent = Math.round(confidence * 100);
  const confidenceDecimal = confidence.toFixed(3);

  const isEmbedded = variant === 'embedded';
  // If embedded, the card is drawn inside the user's chat bubble, which has a dark background in both light and dark themes.
  // Therefore, we force dark-like text and border/divider styles for proper contrast.
  const useDarkStyles = isDark || isEmbedded;

  // Theme-derived variables for readability and contrast
  const primaryTextColor = useDarkStyles ? theme.colors.chatUserBubbleText : theme.colors.text.primary;
  const secondaryTextColor = useDarkStyles ? theme.colors.chatUserBubbleText : theme.colors.text.secondary;
  const cardBorderColor = useDarkStyles ? theme.colors.border.soft : theme.colors.border.subtle;

  const dividerBorderColor = useDarkStyles
    ? (isDark ? theme.colors.border.subtle : 'rgba(255, 255, 255, 0.15)')
    : theme.colors.border.subtle;

  const badgeBgColor = useDarkStyles ? 'rgba(255, 255, 255, 0.12)' : theme.colors.accentSurface;
  const badgeTextColor = useDarkStyles ? theme.colors.chatUserBubbleText : theme.colors.accent.primary;

  const iconColor = useDarkStyles ? theme.colors.chatUserBubbleText : theme.colors.text.secondary;

  const cardGradientColors = useDarkStyles
    ? ([theme.colors.floatingOrbSecondary, theme.colors.floatingOrbPrimary] as [string, string])
    : ([theme.colors.background.elevated, 'rgba(243, 239, 232, 0.85)'] as [string, string]);

  const content = (
    <>
      <View style={styles.titleRow}>
        <Ionicons name="scan-outline" size={16} color={iconColor} style={{ opacity: 0.85 }} />
        <Text style={[styles.title, { color: secondaryTextColor }]}>Scan Submitted</Text>
      </View>

      <Text style={[styles.primary, { color: primaryTextColor }]}>
        {formatPredictionLabel(prediction)}
      </Text>

      <Text style={[styles.confidence, { color: secondaryTextColor }]}>
        AI Analysis this scan with approximately {confidencePercent}% confidence.
      </Text>

      <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
        <Text style={[styles.badgeText, { color: badgeTextColor }]}>
          {formatConfidenceLabel(confidence)}
        </Text>
      </View>

      {/* ML Model Details Section */}
      <View style={[styles.detailsSection, { borderTopColor: dividerBorderColor }]}>
        <Text style={[styles.detailsHeader, { color: secondaryTextColor }]}>
          Model Output Details
        </Text>

        <View style={[styles.detailRow, { borderBottomColor: dividerBorderColor }]}>
          <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Prediction:</Text>
          <Text style={[styles.detailValue, { color: primaryTextColor }]}>{prediction}</Text>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: dividerBorderColor }]}>
          <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Confidence Score:</Text>
          <Text style={[styles.detailValue, { color: primaryTextColor }]}>
            {confidenceDecimal} ({confidencePercent}%)
          </Text>
        </View>

        {aiProvider && (
          <View style={[styles.detailRow, { borderBottomColor: dividerBorderColor }]}>
            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>AI Provider:</Text>
            <Text style={[styles.detailValue, { color: primaryTextColor }]}>{aiProvider}</Text>
          </View>
        )}

        {modelVersion && (
          <View style={[styles.detailRow, { borderBottomColor: dividerBorderColor }]}>
            <Text style={[styles.detailLabel, { color: secondaryTextColor }]}>Model Version:</Text>
            <Text style={[styles.detailValue, { color: primaryTextColor }]}>{modelVersion}</Text>
          </View>
        )}
      </View>
    </>
  );

  if (isEmbedded) {
    return <View style={styles.embeddedContainer}>{content}</View>;
  }

  return (
    <LinearGradient
      colors={cardGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: cardBorderColor }]}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  embeddedContainer: {
    width: '100%',
  },
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
