export interface SupportSectionData {
  readonly title: string;
  readonly items: readonly string[];
}

export interface HelpSupportContent {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: {
    readonly contact: SupportSectionData;
    readonly technical: SupportSectionData;
    readonly privacy: SupportSectionData;
    readonly bugReport: SupportSectionData;
    readonly feedback: SupportSectionData;
    readonly emergency: SupportSectionData;
  };
  readonly quickActions: {
    readonly title: string;
    readonly description: string;
    readonly emailButtonLabel: string;
    readonly emailAddress: string;
    readonly emailSubject: string;
    readonly websiteButtonLabel: string;
    readonly websiteUrl: string;
  };
}

export const HELP_SUPPORT_CONTENT: HelpSupportContent = {
  title: 'Help & Support',
  subtitle: 'We are here to help you get the most out of Spanda AI',
  sections: {
    contact: {
      title: 'Contact Support',
      items: [
        'Our dedicated support team is here to assist you with any questions or concerns.',
        'Response time is typically within 24 to 48 hours.',
      ],
    },
    technical: {
      title: 'Technical Issues',
      items: [
        'If you experience application crashes, freezing, or loading errors, please ensure you are running the latest app version.',
        'Try clearing your app cache or reinstalling the application if issues persist.',
      ],
    },
    privacy: {
      title: 'Privacy Questions',
      items: [
        'For questions regarding data processing, consent revocation, or account deletion, please check our privacy policy.',
        'You can request data export or account removal by contacting support.',
      ],
    },
    bugReport: {
      title: 'Report a Bug',
      items: [
        'Found a bug? Help us improve by submitting a detailed report.',
        'Include steps to reproduce, device model, and OS version.',
      ],
    },
    feedback: {
      title: 'Feedback',
      items: [
        'Your suggestions and comments help us shape the future of Spanda AI.',
        'Feel free to share feature requests or interface improvements.',
      ],
    },
    emergency: {
      title: 'Emergency Notice',
      items: [
        'Spanda AI is a screening assistance tool and does not provide immediate medical care.',
        'For any medical emergencies or urgent vision problems, please contact your local emergency services or an eye care clinic immediately.',
      ],
    },
  },
  quickActions: {
    title: 'Quick Actions',
    description: 'Get in touch with us directly or read more online.',
    emailButtonLabel: 'Email Support',
    emailAddress: 'support@spandavidyaai.com',
    emailSubject: 'Spanda AI App Support Request',
    websiteButtonLabel: 'Visit Website',
    websiteUrl: 'https://spandavidyaai.com',
  },
} as const;
