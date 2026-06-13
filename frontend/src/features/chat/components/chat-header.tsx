import React, { useRef } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { PressableScale } from '@/components/ui/PressableScale';

interface ChatHeaderProps {
  title: string;
  subtitle: string;
  onMenuPress: (triggerRect: { x: number; y: number; width: number; height: number }) => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export function ChatHeader({
  title,
  subtitle,
  onMenuPress,
  showBackButton = false,
  onBackPress,
}: ChatHeaderProps) {
  const { theme } = useTheme();
  const triggerRef = useRef<View>(null);

  const handleMenuPress = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      onMenuPress({ x, y, width, height });
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border.subtle,
          backgroundColor: theme.colors.background.base,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBackButton && (
          <PressableScale onPress={onBackPress} style={styles.backButton}>
            <Ionicons
              name="arrow-back"
              size={22}
              color={theme.colors.text.primary}
            />
          </PressableScale>
        )}
        <View>
          <ThemeText
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.colors.text.primary,
            }}
          >
            {title}
          </ThemeText>
          <View style={styles.statusRow}>
            {!showBackButton && (
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: theme.colors.text.success,
                  },
                ]}
              />
            )}
            <ThemeText
              style={{
                fontSize: 12,
                color: theme.colors.text.secondary,
              }}
            >
              {subtitle}
            </ThemeText>
          </View>
        </View>
      </View>

      <View style={styles.rightContainer}>
        <View ref={triggerRef} collapsable={false}>
          <PressableScale
            onPress={handleMenuPress}
            style={[
              styles.menuTrigger,
              {
                backgroundColor: theme.colors.border.subtle,
                borderColor: theme.colors.border.soft,
              },
            ]}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={theme.colors.accent.primary}
            />
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 14,
  } as ViewStyle,
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  backButton: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
  } as ViewStyle,
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  } as ViewStyle,
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  } as ViewStyle,
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  menuTrigger: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
});
