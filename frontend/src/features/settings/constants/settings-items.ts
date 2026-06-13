import { Ionicons } from '@expo/vector-icons';

export interface SettingRowItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route?: string;
  disabled?: boolean;
  tag?: string;
}

export const APPEARANCE_SECTION_ITEMS: SettingRowItem[] = [
  {
    icon: 'color-palette-outline',
    title: 'Theme Mode',
    description: 'Switch between light, dark, and system themes',
    route: '/appearance',
  },
];

export const GENERAL_SECTION_ITEMS: SettingRowItem[] = [
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    description: 'Manage alerts and update notification thresholds',
    disabled: true,
    tag: 'Coming Soon',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy & Security',
    description: 'Review biometric locking and clinical data sharing policies',
    disabled: true,
    tag: 'Coming Soon',
  },
];

export const SUPPORT_SECTION_ITEMS: SettingRowItem[] = [
  {
    icon: 'help-circle-outline',
    title: 'Help & Support',
    description: 'Get guide instructions or contact clinical assistance',
    disabled: true,
    tag: 'Coming Soon',
  },
  {
    icon: 'information-circle-outline',
    title: 'About Spanda AI',
    description: 'Version 1.0.0 (Production Build)',
    disabled: true,
  },
];
