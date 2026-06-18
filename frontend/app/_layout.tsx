import 'react-native-reanimated';
import '../global.css';

import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/providers/app-providers';
import { useTheme } from '@/theme';

export const unstable_settings = {
  anchor: 'index',
};

// Global font settings have been removed as React 19 has deprecated defaultProps on components.

function RootLayoutContent() {
  const { navigationTheme, isDark } = useTheme();

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="body-insight" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="email-auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="eye-crop"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat-history" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="appearance" options={{ headerShown: false }} />
        <Stack.Screen name="about-spanda" options={{ headerShown: false }} />
        <Stack.Screen name="help-support" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-security" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="scan-upload" options={{ headerShown: false }} />
        <Stack.Screen name="scan-analysis" options={{ headerShown: false }} />
        <Stack.Screen name="scan-result" options={{ headerShown: false }} />
        <Stack.Screen name="tools" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
          }}
        />
      </Stack>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootLayoutContent />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
