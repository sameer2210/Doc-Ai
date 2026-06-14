import { Ionicons } from '@expo/vector-icons';

export interface SmartSuggestion {
  readonly id: string;
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
}
