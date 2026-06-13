import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeSectionHeader } from '@/components/ui/theme/ThemeSectionHeader';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      <ThemeSectionHeader title={title} style={styles.header} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 10,
  },
  content: {
    gap: 12,
  },
});
