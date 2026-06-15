import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeBadge } from '@/components/ui/theme/ThemeBadge';
import { PressableScale } from '@/components/ui/PressableScale';
import { differenceInDays } from 'date-fns';

type BodyInsightCardProps = {
  readonly variant: 'home' | 'profile';
  readonly completed: boolean;
  readonly updatedAt?: string;
  readonly onPress: () => void;
};

export const BodyInsightCard = React.memo(({
  variant,
  completed,
  updatedAt,
  onPress,
}: BodyInsightCardProps) => {
  const { theme } = useTheme();

  const getDaysAgoText = () => {
    if (!updatedAt) return '';
    try {
      const diff = differenceInDays(new Date(), new Date(updatedAt));
      if (diff <= 0) return 'today';
      return diff === 1 ? '1 day ago' : `${diff} days ago`;
    } catch {
      return '';
    }
  };

  const daysAgoText = getDaysAgoText();

  if (variant === 'profile') {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Body Insight Profile context settings"
        style={styles.pressable}
      >
        <GlassCard style={styles.cardProfile}>
          <View style={styles.headerRow}>
            <ThemeText variant="heading" style={styles.titleProfile}>
              Body Insight Profile
            </ThemeText>
            <ThemeBadge
              label={completed ? 'Completed' : 'Not Completed'}
              variant={completed ? 'success' : 'warning'}
              size="sm"
            />
          </View>

          <View style={styles.bodyRow}>
            <ThemeText
              variant="body"
              style={[
                styles.descriptionProfile,
                { color: theme.colors.text.secondary }
              ]}
            >
              {completed
                ? `Last updated: ${daysAgoText || 'recently'}`
                : 'Add health context for better consultations'}
            </ThemeText>
          </View>

          <View style={styles.ctaRow}>
            <ThemeText
              style={[
                styles.ctaText,
                { color: theme.colors.accent.primary }
              ]}
            >
              {completed ? 'Update Health Profile' : 'Complete Questionnaire'}
            </ThemeText>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.accent.primary} />
          </View>
        </GlassCard>
      </PressableScale>
    );
  }

  // Home Screen variant (smaller, secondary CTA weight)
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Body Insight Profile card"
      style={styles.pressable}
    >
      <GlassCard style={styles.cardHome}>
        <View style={styles.contentRowHome}>
          <View style={styles.textContainerHome}>
            <View style={styles.badgeRowHome}>
              <ThemeBadge label="Health Profile" variant="info" size="sm" />
              {completed && (
                <ThemeBadge label="Active" variant="success" size="sm" style={styles.leftMargin} />
              )}
            </View>
            <ThemeText variant="heading" style={styles.titleHome}>
              Body Insight Profile
            </ThemeText>
            <ThemeText
              variant="body"
              style={[
                styles.descriptionHome,
                { color: theme.colors.text.secondary }
              ]}
            >
              Improve AI consultation accuracy. Help Spanda AI understand your health context for more personalized consultations.
            </ThemeText>
          </View>

          <View
            style={[
              styles.iconWrapperHome,
              {
                backgroundColor: theme.colors.accentSurface,
              }
            ]}
          >
            <Ionicons
              name={completed ? 'heart' : 'heart-outline'}
              size={24}
              color={completed ? theme.colors.text.success : theme.colors.accent.primary}
            />
          </View>
        </View>
      </GlassCard>
    </PressableScale>
  );
});

BodyInsightCard.displayName = 'BodyInsightCard';

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginBottom: 16,
  },
  cardProfile: {
    padding: 16,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleProfile: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  bodyRow: {
    marginVertical: 10,
  },
  descriptionProfile: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardHome: {
    padding: 14,
    minHeight: 110,
    justifyContent: 'center',
  },
  contentRowHome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainerHome: {
    flex: 1,
  },
  badgeRowHome: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  leftMargin: {
    marginLeft: 6,
  },
  titleHome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  descriptionHome: {
    fontSize: 12,
    lineHeight: 16,
  },
  iconWrapperHome: {
    height: 44,
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
