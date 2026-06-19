export interface TermsSectionData {
  readonly title: string;
  readonly items: readonly string[];
}

export interface TermsContent {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: {
    readonly usage: TermsSectionData;
    readonly health: TermsSectionData;
    readonly account: TermsSectionData;
    readonly limits: TermsSectionData;
    readonly contact: TermsSectionData;
  };
}

export const TERMS_CONTENT: TermsContent = {
  title: 'Terms & Conditions',
  subtitle: 'Please review our service terms and usage agreement',
  sections: {
    usage: {
      title: '1. Acceptable Use',
      items: [
        'Spanda AI provides Ayurvedic consultations and AI-powered cataract screening assistance.',
        'You agree to use the service only for personal, lawful, and non-commercial purposes.',
        'You must not upload malicious files, spam the assistant, or reverse engineer the ML models.',
      ],
    },
    health: {
      title: '2. Medical Disclaimer',
      items: [
        'The services and content provided by Spanda AI are for informational and educational screening assistance only.',
        'Our AI results are not diagnostic assessments and do not constitute professional medical advice.',
        'Always consult a qualified ophthalmologist or doctor for professional eye care and diagnosis.',
      ],
    },
    account: {
      title: '3. Accounts and Security',
      items: [
        'You are responsible for keeping your login credentials and session keys secure.',
        'You agree to notify us immediately of any unauthorized access to your account.',
      ],
    },
    limits: {
      title: '4. Limitation of Liability',
      items: [
        'We do not guarantee that the AI models are 100% accurate, error-free, or continuously available.',
        'Spanda AI is not liable for any personal injury or health choices made based on AI model outputs.',
      ],
    },
    contact: {
      title: '5. Contact and Queries',
      items: [
        'If you have any questions or feedback regarding these terms, please contact legal@spandavidyaai.com.',
      ],
    },
  },
} as const;
