import React from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { ThemeDivider } from '@/components/ui/theme/ThemeDivider';
import { ChatMenuItem } from './chat-menu-item';

export interface MenuAction {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  isDestructive?: boolean;
}

interface ChatOverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: MenuAction[];
  style?: StyleProp<ViewStyle>;
}

export function ChatOverflowMenu({ visible, onClose, actions, style }: ChatOverflowMenuProps) {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <View style={styles.overlay} />
      </Pressable>

      <View
        style={[
          styles.menuContainer,
          {
            backgroundColor: theme.colors.background.elevated,
            borderColor: theme.colors.border.soft,
            shadowColor: theme.colors.shadowColor,
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
          },
          style,
        ]}
      >
        {actions.map((action, index) => {
          return (
            <React.Fragment key={action.label}>
              {index > 0 && (
                <ThemeDivider style={{ marginVertical: 0, opacity: isDark ? 0.1 : 0.2 }} />
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
      </View>
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
    top: 60,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 4,
    width: 220,
    maxWidth: 220,
    overflow: 'hidden',
  } as ViewStyle,
});
