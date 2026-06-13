import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useSessionStore } from '@/features/auth/store/session-store';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { ThemeBadge } from '@/components/ui/theme/ThemeBadge';

export function ProfileHeader() {
  const { theme } = useTheme();
  const user = useSessionStore((state) => state.user);
  
  const fullName = user?.name?.trim() || [user?.givenName, user?.familyName].filter(Boolean).join(' ') || 'Guest User';
  const avatarLetter = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase();
  const isVerified = user?.emailVerified === true;

  return (
    <View style={styles.container}>
      {user?.avatarUrl ? (
        <Image
          source={{ uri: user.avatarUrl }}
          resizeMode="cover"
          style={[styles.avatar, { borderColor: theme.colors.border.soft }]}
        />
      ) : (
        <ThemeSurface
          style={[styles.avatarFallback, { backgroundColor: theme.colors.border.subtle }]}
        >
          <ThemeText style={styles.avatarLetter}>{avatarLetter}</ThemeText>
        </ThemeSurface>
      )}

      <ThemeText style={styles.name}>{fullName}</ThemeText>
      
      <View style={styles.row}>
        <ThemeText style={styles.email}>
          {user?.email || 'No email linked'}
        </ThemeText>
        {user?.email && (
          <ThemeBadge
            label={isVerified ? 'Verified' : 'Unverified'}
            variant={isVerified ? 'success' : 'warning'}
            style={styles.badge}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: 16,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
