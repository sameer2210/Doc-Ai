import { InstructionItem } from '../types/instruction.types';

export const GOOD_IMAGE_INSTRUCTIONS: InstructionItem[] = [
  {
    id: 'good_1',
    title: 'Single Eye Only',
    description: 'Capture one eye only. Avoid full-face photos.',
    icon: 'eye-outline',
  },
  {
    id: 'good_2',
    title: 'Eye Fills Most Of Frame',
    description: 'Eye should occupy approximately 60–80% of image area.',
    icon: 'scan-outline',
  },
  {
    id: 'good_3',
    title: 'Bright Lighting',
    description: 'Use natural light or a well-lit room.',
    icon: 'sunny-outline',
  },
  {
    id: 'good_4',
    title: 'Sharp Focus',
    description: 'Keep the eye clear and in focus.',
    icon: 'camera-outline',
  },
  {
    id: 'good_5',
    title: 'Center The Pupil',
    description: 'Place the pupil near the center before cropping.',
    icon: 'locate-outline',
  },
];

/**
 * Bad image instructions with contextual Ionicons per item.
 * Each icon represents the specific failure mode rather than a generic ✕.
 */
export const BAD_IMAGE_INSTRUCTIONS: InstructionItem[] = [
  {
    id: 'bad_1',
    title: 'Full Face Photos',
    description: 'Do not include the rest of the face.',
    icon: 'person-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_2',
    title: 'Multiple People',
    description: 'Ensure only the patient is in the frame.',
    icon: 'people-outline',
    isNegative: true,
  },
  {
    id: 'bad_3',
    title: 'Dark Images',
    description: 'Avoid shadows or dim lighting.',
    icon: 'moon-outline',
    isNegative: true,
  },
  {
    id: 'bad_4',
    title: 'Blurry Images',
    description: 'Ensure the lens is in sharp focus.',
    icon: 'radio-button-on-outline',
    isNegative: true,
  },
  {
    id: 'bad_5',
    title: 'Screenshots',
    description: 'Upload original photos only.',
    icon: 'phone-portrait-outline',
    isNegative: true,
  },
  {
    id: 'bad_6',
    title: 'Heavy Reflections',
    description: 'Avoid glare on the eye surface.',
    icon: 'sunny-outline',
    isNegative: true,
  },
  {
    id: 'bad_7',
    title: 'Partially Visible Eye',
    description: 'The entire iris should be visible.',
    icon: 'eye-off-outline',
    isNegative: true,
  },
  {
    id: 'bad_8',
    title: 'Extreme Angles',
    description: 'Take the photo straight on.',
    icon: 'refresh-outline',
    isNegative: true,
  },
];

export const CROP_TIPS: string[] = [
  'Center the pupil inside the guide',
  'Keep the full iris visible',
  'Include eyelids around the eye',
  'Avoid excessive zoom',
  'Do not crop only the pupil',
];

export const CAPTURE_STEPS = [
  { step: 1, title: 'Center the eye', detail: 'Position the iris in the middle of the frame.' },
  { step: 2, title: 'Keep iris fully visible', detail: 'The entire iris must be within the frame.' },
  { step: 3, title: 'Avoid eyelid obstruction', detail: 'Partially closed eyelids reduce AI accuracy.' },
  { step: 4, title: 'Ensure proper lighting', detail: 'Use natural or bright indirect light.' },
  { step: 5, title: 'Capture sharp focus', detail: 'Hold steady and tap the eye area to focus.' },
] as const;

export const GOOD_CAPTURE_ITEMS = [
  { id: 'gc_1', icon: 'locate-outline' as const, label: 'Eye centered' },
  { id: 'gc_2', icon: 'eye-outline' as const, label: 'Iris visible' },
  { id: 'gc_3', icon: 'sunny-outline' as const, label: 'Bright lighting' },
  { id: 'gc_4', icon: 'camera-outline' as const, label: 'Sharp focus' },
  { id: 'gc_5', icon: 'flash-off-outline' as const, label: 'No reflections' },
  { id: 'gc_6', icon: 'scan-outline' as const, label: 'Single eye' },
] as const;
