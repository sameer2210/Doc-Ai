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

export const BAD_IMAGE_INSTRUCTIONS: InstructionItem[] = [
  {
    id: 'bad_1',
    title: 'Full Face Photos',
    description: 'Do not include the rest of the face.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_2',
    title: 'Multiple People',
    description: 'Ensure only the patient is in the frame.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_3',
    title: 'Dark Images',
    description: 'Avoid shadows or dim lighting.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_4',
    title: 'Blurry Images',
    description: 'Ensure the lens is in sharp focus.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_5',
    title: 'Screenshots',
    description: 'Upload original photos only.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_6',
    title: 'Heavy Reflections',
    description: 'Avoid glare on the eye surface.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_7',
    title: 'Partially Visible Eye',
    description: 'The entire iris should be visible.',
    icon: 'close-circle-outline',
    isNegative: true,
  },
  {
    id: 'bad_8',
    title: 'Extreme Angles',
    description: 'Take the photo straight on.',
    icon: 'close-circle-outline',
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
