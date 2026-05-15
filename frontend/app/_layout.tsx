import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Text, TextInput } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProviders } from '@/providers/app-providers';

export const unstable_settings = {
  anchor: 'index',
};

declare global {
  var __SPANDAVIDYA_GLOBAL_FONT_SET__: boolean | undefined;
}

const GLOBAL_FONT_FAMILY = 'serif';

if (!globalThis.__SPANDAVIDYA_GLOBAL_FONT_SET__) {
  Text.defaultProps = Text.defaultProps ?? {};
  TextInput.defaultProps = TextInput.defaultProps ?? {};

  const existingTextStyle = Text.defaultProps.style;
  const existingInputStyle = TextInput.defaultProps.style;

  Text.defaultProps.style = Array.isArray(existingTextStyle)
    ? [{ fontFamily: GLOBAL_FONT_FAMILY }, ...existingTextStyle]
    : [{ fontFamily: GLOBAL_FONT_FAMILY }, existingTextStyle].filter(Boolean);

  TextInput.defaultProps.style = Array.isArray(existingInputStyle)
    ? [{ fontFamily: GLOBAL_FONT_FAMILY }, ...existingInputStyle]
    : [{ fontFamily: GLOBAL_FONT_FAMILY }, existingInputStyle].filter(Boolean);

  globalThis.__SPANDAVIDYA_GLOBAL_FONT_SET__ = true;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="agni-bala-assessment" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                title: 'Modal',
              }}
            />
          </Stack>

          <StatusBar style="auto" />
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
