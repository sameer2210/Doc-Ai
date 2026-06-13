import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSessionStore } from '@/features/auth/store/session-store';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeDivider } from '@/components/ui/theme/ThemeDivider';

export function ProfileInfoCard() {
  const user = useSessionStore((state) => state.user);

  if (!user) return null;

  const fullName = user.name?.trim() || [user.givenName, user.familyName].filter(Boolean).join(' ') || 'Guest User';
  const isVerified = user.emailVerified === true;

  const infoItems = [
    { label: 'Name', value: fullName },
    { label: 'Email', value: user.email || 'N/A' },
    { label: 'Provider', value: user.provider || 'Google' },
    { label: 'Email Verified', value: isVerified ? 'Yes' : 'No' },
  ];

  return (
    <GlassCard style={styles.card}>
      <ThemeText style={styles.title}>Account Details</ThemeText>
      
      <View style={styles.contentContainer}>
        {infoItems.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <ThemeDivider style={styles.divider} />}
            <View style={styles.infoRow}>
              <ThemeText style={styles.label}>{item.label}</ThemeText>
              <ThemeText numberOfLines={1} style={styles.value}>
                {item.value}
              </ThemeText>
            </View>
          </React.Fragment>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  contentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 0,
    opacity: 0.1,
  },
});
