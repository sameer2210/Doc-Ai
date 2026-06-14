import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSessionStore } from '@/features/auth/store/session-store';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeBadge } from '@/components/ui/theme/ThemeBadge';
import { PressableScale } from '@/components/ui/PressableScale';

export const GreetingHeader = React.memo(() => {
  const { theme, isDark } = useTheme();
  const user = useSessionStore(state => state.user);

  const firstName = useMemo(() => {
    const base = user?.name?.trim() || user?.email || 'Clinician';
    return base.split(' ')[0];
  }, [user?.email, user?.name]);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemeText
          variant="label"
          style={{ color: isDark ? theme.colors.text.tertiary : theme.colors.accent.mutedGold }}
        >
          spandaVidya
        </ThemeText>
        <ThemeText
          variant="title"
          style={[
            styles.title,
            { color: theme.colors.text.primary }
          ]}
        >
          Hello, {firstName}
        </ThemeText>
        <ThemeBadge
          label="SpandaVidya AI Ready"
          variant="success"
          style={styles.badge}
        />
      </View>

      <PressableScale
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="Go to Profile"
        style={[
          styles.avatarBtn,
          {
            borderColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.background.surface,
          }
        ]}
      >
        {user?.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            resizeMode="cover"
            style={styles.avatar}
          />
        ) : (
          <ThemeText
            style={[
              styles.avatarFallback,
              { color: theme.colors.accent.primary }
            ]}
          >
            {firstName.slice(0, 1).toUpperCase()}
          </ThemeText>
        )}
      </PressableScale>
    </View>
  );
});

GreetingHeader.displayName = 'GreetingHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  avatarBtn: {
    height: 48,
    width: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
