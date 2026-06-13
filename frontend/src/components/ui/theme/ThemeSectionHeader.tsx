import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemeText } from './ThemeText';

export interface ThemeSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ThemeSectionHeader({
  title,
  subtitle,
  action,
  style,
  className,
}: ThemeSectionHeaderProps) {
  return (
    <View
      className={className}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          width: '100%',
        },
        style,
      ]}
    >
      <View style={{ flex: 1, marginRight: 8 }}>
        {subtitle && (
          <ThemeText variant="label" style={{ marginBottom: 4 }}>
            {subtitle}
          </ThemeText>
        )}
        <ThemeText variant="heading" style={{ fontSize: 24, lineHeight: 30 }}>
          {title}
        </ThemeText>
      </View>
      {action && <View>{action}</View>}
    </View>
  );
}
