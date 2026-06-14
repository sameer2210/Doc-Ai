import { Ionicons } from '@expo/vector-icons';

export type ToolRoute =
  | '/scan-upload'
  | '/instructions'
  | '/body-insight'
  | '/chat-history'
  | '/settings'
  | '/appearance'
  | '/(tabs)/chat';

export interface ToolItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly route: ToolRoute;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly badgeLabel: string;
  readonly badgeVariant?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}

export interface ToolSection {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly items: readonly ToolItem[];
}

export const TOOLS_SECTIONS: readonly ToolSection[] = [
  {
    id: 'screening',
    title: 'Screening',
    subtitle: 'Clinical workflows for image capture and review',
    items: [
      {
        id: 'cataract-detection',
        title: 'Cataract Detection',
        description: 'Upload an eye image and start the AI screening flow.',
        route: '/scan-upload',
        icon: 'scan-outline',
        badgeLabel: 'Primary',
        badgeVariant: 'success',
      },
      {
        id: 'image-guidelines',
        title: 'Image Guidelines',
        description: 'Review capture tips before submitting a scan.',
        route: '/instructions',
        icon: 'document-text-outline',
        badgeLabel: 'Guide',
        badgeVariant: 'info',
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    subtitle: 'Patient-facing tools and consultation history',
    items: [
      {
        id: 'body-insight',
        title: 'Body Insight',
        description: 'Open the assessment workflow and collect wellness context.',
        route: '/body-insight',
        icon: 'body-outline',
        badgeLabel: 'Assessment',
        badgeVariant: 'warning',
      },
      {
        id: 'chat-history',
        title: 'Chat History',
        description: 'Review prior consultation threads and messages.',
        route: '/chat-history',
        icon: 'chatbox-ellipses-outline',
        badgeLabel: 'History',
        badgeVariant: 'neutral',
      },
      {
        id: 'consultation-chat',
        title: 'Consultation Chat',
        description: 'Jump into the active Spanda AI conversation screen.',
        route: '/(tabs)/chat',
        icon: 'medical-outline',
        badgeLabel: 'Live',
        badgeVariant: 'success',
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    subtitle: 'App experience and display controls',
    items: [
      {
        id: 'appearance',
        title: 'Appearance',
        description: 'Adjust theme mode and visual preferences.',
        route: '/appearance',
        icon: 'color-palette-outline',
        badgeLabel: 'Theme',
        badgeVariant: 'info',
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'Manage account and application settings.',
        route: '/settings',
        icon: 'settings-outline',
        badgeLabel: 'System',
        badgeVariant: 'neutral',
      },
    ],
  },
];
