import { Ionicons } from '@expo/vector-icons';

export interface InstructionItem {
  id: string;
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isNegative?: boolean;
}

export interface InstructionCategory {
  title: string;
  subtitle?: string;
  items: InstructionItem[];
}
