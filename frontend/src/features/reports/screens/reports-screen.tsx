import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ThemeBadge, ThemeDivider, ThemeText } from '@/components/ui/theme';
import { useTheme } from '@/theme';

import { ReportListItem, ReportItem } from '../components/report-list-item';
import { AiSummaryCard } from '../components/ai-summary-card';

const REPORTS_DATA: ReportItem[] = [
  {
    id: '1',
    title: 'Cataract Risk Summary',
    description: 'AI-generated cataract screening result',
    time: 'Today • 10:42 AM',
    badge: 'Ready',
    icon: 'eye-outline',
  },
  {
    id: '2',
    title: 'AI Screening Insights',
    description: 'Detailed interpretation of screening findings',
    time: 'Today • 9:55 AM',
    badge: 'Ready',
    icon: 'analytics-outline',
  },
  {
    id: '3',
    title: 'Ayurvedic Recommendation Brief',
    description: 'Lifestyle and wellness guidance',
    time: 'Yesterday • 6:30 PM',
    badge: 'Synced',
    icon: 'medical-outline',
  },
];

export function ReportsScreen() {
  const { theme, isDark } = useTheme();

  // Derived calculations from reports data array
  const totalReports = REPORTS_DATA.length;
  const aiInsightsCount = REPORTS_DATA.filter((r) => r.badge === 'Ready').length;
  const latestReportTime = REPORTS_DATA[0]?.time ?? '';
  const [latestDate, latestTime] = latestReportTime.split(' • ') || ['', ''];

  const handleReportPress = (report: ReportItem) => {
    // Navigate or log action
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]}
      edges={['top']}
    >
      <ScreenBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={styles.header}>
            <ThemeBadge label="Reports" variant="neutral" size="sm" />
            <ThemeText variant="title" style={styles.title} allowFontScaling={true}>
              Health Intelligence
            </ThemeText>
            <ThemeText
              variant="body"
              style={[styles.subtitle, { color: theme.colors.text.secondary }]}
              allowFontScaling={true}
            >
              View cataract assessments, AI interpretations and report history.
            </ThemeText>
          </View>
        </Animated.View>

        <ThemeDivider spacing={16} />

        {/* Reports Overview Card */}
        <Animated.View entering={FadeInDown.duration(520).delay(50)}>
          <GlassCard
            style={[
              styles.overviewCard,
              {
                backgroundColor: isDark ? theme.colors.background.surface : theme.colors.background.elevated,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          >
            <View style={styles.overviewColumn}>
              <ThemeText
                variant="caption"
                style={[styles.overviewLabel, { color: theme.colors.text.tertiary }]}
                allowFontScaling={true}
              >
                Total Reports
              </ThemeText>
              <ThemeText variant="heading" style={styles.overviewValue} allowFontScaling={true}>
                {totalReports}
              </ThemeText>
            </View>

            <View style={[styles.overviewDivider, { backgroundColor: theme.colors.border.subtle }]} />

            <View style={styles.overviewColumn}>
              <ThemeText
                variant="caption"
                style={[styles.overviewLabel, { color: theme.colors.text.tertiary }]}
                allowFontScaling={true}
              >
                AI Insights
              </ThemeText>
              <ThemeText
                variant="heading"
                style={[styles.overviewValue, { color: theme.colors.text.success }]}
                allowFontScaling={true}
              >
                {aiInsightsCount}
              </ThemeText>
            </View>

            <View style={[styles.overviewDivider, { backgroundColor: theme.colors.border.subtle }]} />

            <View style={styles.overviewColumn}>
              <ThemeText
                variant="caption"
                style={[styles.overviewLabel, { color: theme.colors.text.tertiary }]}
                allowFontScaling={true}
              >
                Latest Report
              </ThemeText>
              <ThemeText
                variant="heading"
                style={styles.overviewValue}
                allowFontScaling={true}
                numberOfLines={1}
              >
                {latestDate}
              </ThemeText>
              {latestTime ? (
                <ThemeText
                  variant="caption"
                  style={[styles.overviewTime, { color: theme.colors.text.tertiary }]}
                  allowFontScaling={true}
                >
                  {latestTime}
                </ThemeText>
              ) : null}
            </View>
          </GlassCard>
        </Animated.View>

        <ThemeDivider spacing={16} />

        {/* Report Cards List */}
        <View style={styles.listContainer}>
          {REPORTS_DATA.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.duration(540).delay(100 + index * 50)}
            >
              <ReportListItem item={item} onPress={() => handleReportPress(item)} />
            </Animated.View>
          ))}
        </View>

        {/* AI Report Assistant Card */}
        <Animated.View entering={FadeInDown.duration(560).delay(250)}>
          <AiSummaryCard />
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    height: 100,
    borderWidth: 1,
    borderRadius: 16,
  },
  overviewColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  overviewTime: {
    fontSize: 10,
    textAlign: 'center',
  },
  overviewDivider: {
    width: 1,
    height: '60%',
  },
  listContainer: {
    gap: 4,
  },
  bottomSpacer: {
    height: 24,
  },
});
