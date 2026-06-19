import React from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ThemeDivider } from '@/components/ui/theme/ThemeDivider';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChatMenuItem } from './chat-menu-item';

export interface MenuAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  isDestructive?: boolean;
}

interface ChatOverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
  style?: StyleProp<ViewStyle>;
  anchorRect?: { x: number; y: number; width: number; height: number } | null;
}

export function ChatOverflowMenu({ visible, onClose, actions, style, anchorRect }: ChatOverflowMenuProps) {
  const { theme, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Spacing below the trigger button
  const spacing = 40;

  // Default fallbacks (in case measurement is pending or fails)
  let topPosition = 60 + insets.top;
  let rightPosition = 16;

  if (anchorRect) {
    // 1. Position top below the trigger
    topPosition = anchorRect.y + anchorRect.height + spacing;

    // 2. Align right edge of menu with right edge of trigger, but keep at least 16px from screen edge
    const triggerRightEdge = anchorRect.x + anchorRect.width;
    rightPosition = Math.max(16, windowWidth - triggerRightEdge);

    // 3. Overflow protection: check if it overflows the screen height
    // Estimate menu height: (number of items * item height (52)) + dividers
    const estimatedMenuHeight = (actions.length * 52) + ((actions.length - 1) * 1);
    if (topPosition + estimatedMenuHeight > windowHeight - insets.bottom - 16) {
      // Flip up: open above the trigger button
      topPosition = Math.max(insets.top + 16, anchorRect.y - estimatedMenuHeight - spacing);
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <View style={styles.overlay} />
      </Pressable>

      <GlassCard
        style={[
          styles.menuContainer,
          {
            borderColor: theme.colors.border.soft,
            top: topPosition,
            right: rightPosition,
          },
          style,
        ]}
      >
        {actions.map((action, index) => {
          return (
            <React.Fragment key={action.label}>
              {index > 0 && (
                <ThemeDivider spacing={8} style={{ opacity: isDark ? 0.12 : 0.08 }} />
              )}
              <ChatMenuItem
                label={action.label}
                icon={action.icon}
                disabled={action.disabled}
                isDestructive={action.isDestructive}
                onPress={() => {
                  onClose();
                  if (!action.disabled) {
                    action.onPress();
                  }
                }}
              />
            </React.Fragment>
          );
        })}
      </GlassCard>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    padding: 14,
    width: 240,
    maxWidth: 260,
    overflow: 'hidden',
  } as ViewStyle,
});
