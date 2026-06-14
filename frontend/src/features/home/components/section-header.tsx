import React from 'react';
import { ThemeSectionHeader, type ThemeSectionHeaderProps } from '@/components/ui/theme/ThemeSectionHeader';

export const SectionHeader = React.memo((props: ThemeSectionHeaderProps) => {
  return <ThemeSectionHeader {...props} />;
});

SectionHeader.displayName = 'SectionHeader';
