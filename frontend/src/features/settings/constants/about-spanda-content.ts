export interface AboutSectionData {
  readonly title: string;
  readonly items: readonly string[];
}

export interface AboutContent {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: {
    readonly mission: AboutSectionData;
    readonly vision: AboutSectionData;
    readonly privacy: AboutSectionData;
    readonly disclaimer: AboutSectionData;
    readonly consent: AboutSectionData;
    readonly technology: AboutSectionData;
  };
  readonly website: {
    readonly title: string;
    readonly description: string;
    readonly buttonLabel: string;
    readonly url: string;
  };
}

export const ABOUT_SPANDA_CONTENT: AboutContent = {
  title: 'Spanda AI',
  subtitle: 'AI-Powered Eye Health Assistant',
  sections: {
    mission: {
      title: 'Mission',
      items: [
        'Spanda AI aims to make preliminary eye-health guidance more accessible through AI-assisted screening and educational support.',
      ],
    },
    vision: {
      title: 'Vision',
      items: [
        'To build a trusted digital health companion that helps users better understand their eye health while encouraging professional medical consultation when needed.',
      ],
    },
    privacy: {
      title: 'Privacy & Security',
      items: [
        'User data is encrypted in transit.',
        'Authentication is protected through secure token-based access.',
        'Personal information is not sold.',
        'Access is restricted to authorized services only.',
        'Security practices are continuously improved.',
      ],
    },
    disclaimer: {
      title: 'AI Disclaimer',
      items: [
        'AI results are informational only.',
        'AI predictions are not medical diagnoses.',
        'Users should consult qualified healthcare professionals.',
        'Clinical confirmation is always recommended.',
      ],
    },
    consent: {
      title: 'User Consent',
      items: [
        'Uploaded images may be processed for analysis.',
        'Users retain ownership of their data.',
        'Users choose what information they provide.',
        'Use of the platform implies agreement with platform policies.',
      ],
    },
    technology: {
      title: 'Technology',
      items: [
        'Frontend: React Native + Expo',
        'Backend: NestJS',
        'Database: PostgreSQL + Prisma',
        'AI: Gemini + Cataract Prediction Models',
        'Storage: AWS S3',
      ],
    },
  },
  website: {
    title: 'Visit Our Website',
    description: 'Learn more about Spanda AI, our mission, platform updates, and future roadmap.',
    buttonLabel: 'Open Website',
    url: 'https://spandavidyaai.com',
  },
} as const;
