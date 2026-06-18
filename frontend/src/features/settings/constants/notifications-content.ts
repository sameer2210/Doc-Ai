export interface NotificationSectionData {
  readonly title: string;
  readonly items: readonly string[];
}

export interface NotificationsContent {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: {
    readonly overview: NotificationSectionData;
    readonly aiUpdates: NotificationSectionData;
    readonly securityAlerts: NotificationSectionData;
    readonly productUpdates: NotificationSectionData;
    readonly futureFeatures: NotificationSectionData;
    readonly currentStatus: NotificationSectionData;
  };
}

export const NOTIFICATIONS_CONTENT: NotificationsContent = {
  title: 'Notifications',
  subtitle: 'Updates, alerts and future notification settings',
  sections: {
    overview: {
      title: 'Notifications Overview',
      items: [
        'Spanda AI uses notifications to keep you informed about your eye health status, secure access updates, and feature additions.',
        'You can control all alerts directly from your device settings once notifications are enabled.',
      ],
    },
    aiUpdates: {
      title: 'AI Analysis Updates',
      items: [
        'Receive alerts as soon as your eye scan analysis is complete and your report is ready.',
        'Get notified when the Ayurvedic consulting assistant has new information or insights for you.',
      ],
    },
    securityAlerts: {
      title: 'Security Alerts',
      items: [
        'Stay secure with instant notifications for new sign-ins from unrecognized devices.',
        'Receive alerts on critical changes to your password, biometric lock settings, or account credentials.',
      ],
    },
    productUpdates: {
      title: 'Product Updates',
      items: [
        'Get notified about new AI models, platform improvements, and seasonal eye care tips.',
        'Learn about new Ayurvedic insights and clinical screening additions.',
      ],
    },
    futureFeatures: {
      title: 'Future Notification Features',
      items: [
        'Custom frequency: Select how often you want to receive routine analysis updates.',
        'Quiet hours: Silence non-essential health alerts during designated hours.',
        'Direct doctor connection: Get alert reminders if an ophthalmologist provides feedback on your scans.',
      ],
    },
    currentStatus: {
      title: 'Current Status',
      items: [
        'Notifications are planned for a future release.',
        'Currently, all updates are visible directly in the app dashboard, chat console, and analysis history.',
      ],
    },
  },
} as const;
