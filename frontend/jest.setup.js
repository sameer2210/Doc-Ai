import 'react-native-gesture-handler/jestSetup';

process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'mock-google-web-id';
process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = 'mock-google-android-id';
process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'mock-google-ios-id';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence warning from Reanimated
global.__reanimatedWorkletInit = () => {};

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      setParams: jest.fn(),
    }),
    Stack: {
      Screen: (props) => React.createElement('Stack.Screen', props),
    },
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    Link: 'Link',
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ idToken: 'mock-id-token' }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => React.createElement(View, props),
  };
});

// Mock expo-vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(Text, null, props.name),
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'mock-doc-dir/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'mock-manipulated-uri' }),
}));

// Mock gorhom bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => React.createElement(View, props),
    BottomSheetView: (props) => React.createElement(View, props),
  };
});
