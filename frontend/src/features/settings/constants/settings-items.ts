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
    description: 'Updates, alerts and future notification settings',
    route: '/notifications',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy & Security',
    description: 'How your data is protected and used',
    route: '/privacy-security',
  },
];

export const SUPPORT_SECTION_ITEMS: SettingRowItem[] = [
  {
    icon: 'help-circle-outline',
    title: 'Help & Support',
    description: 'Contact support and report issues',
    route: '/help-support',
  },
  {
    icon: 'information-circle-outline',
    title: 'About Spanda AI',
    description: 'Mission, vision, privacy and security',
    route: '/about-spanda',
  },
];
