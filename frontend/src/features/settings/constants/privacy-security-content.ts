export interface PrivacySectionData {
  readonly title: string;
  readonly items: readonly string[];
}

export interface PrivacySecurityContent {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: {
    readonly collection: PrivacySectionData;
    readonly usage: PrivacySectionData;
    readonly storage: PrivacySectionData;
    readonly security: PrivacySectionData;
    readonly disclaimer: PrivacySectionData;
    readonly rights: PrivacySectionData;
    readonly contact: PrivacySectionData;
  };
}

export const PRIVACY_SECURITY_CONTENT: PrivacySecurityContent = {
  title: 'Privacy & Security',
  subtitle: 'How your data is protected and used',
  sections: {
    collection: {
      title: 'Data Collection',
      items: [
        'We collect personal registration details (name, email) and images you upload for eye screening.',
        'Technical logs such as device type and session details are recorded for security monitoring.',
      ],
    },
    usage: {
      title: 'Data Usage',
      items: [
        'Uploaded images are processed solely to run ML cataract prediction models.',
        'Consultation logs feed the Ayurvedic chat assistant to deliver personalized health guidance.',
        'We do not sell or monetize any personal or clinical health data.',
      ],
    },
    storage: {
      title: 'Data Storage',
      items: [
        'All data is securely hosted on postgres databases and AWS S3 cloud storage.',
        'We retain images and chat records only as long as necessary to provide service history.',
      ],
    },
    security: {
      title: 'Security Measures',
      items: [
        'Data is encrypted in transit (TLS 1.3) and at rest (AES-256).',
        'User sessions use secure JWT refresh token rotation with server-side revocation support.',
      ],
    },
    disclaimer: {
      title: 'AI & Medical Disclaimer',
      items: [
        'All predictions and assistant chat responses are for screening support and educational purposes only.',
        'AI results are not diagnostic and must be confirmed by a licensed ophthalmologist.',
      ],
    },
    rights: {
      title: 'User Rights',
      items: [
        'You can request account deletion or data exports directly from Settings.',
        'You can revoke consent to image processing at any time, which will remove your data from S3.',
      ],
    },
    contact: {
      title: 'Contact Information',
      items: [
        'For privacy requests or inquiries, contact our Data Protection Officer at privacy@spandavidyaai.com.',
        'Support requests should be submitted via support@spandavidyaai.com.',
      ],
    },
  },
} as const;
