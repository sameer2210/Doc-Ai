import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeDivider } from '@/components/ui/theme/ThemeDivider';
import { loginWithGoogle } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/store/session-store';
import type { SessionUser } from '@/features/auth/types/auth-types';
import {
  getGoogleWebClientId,
  signInWithGoogle,
  type GoogleWebPromptAsync,
} from '@/services/auth/google-auth';
import { clearUserScopedClientState } from '@/shared/auth/client-session-boundary';
import { persistSession } from '@/shared/auth/token-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { GoogleAuthButton } from '../auth/google-auth-button';
import { ErrorNotice } from '../ui/ErrorNotice';
import { SocialButton } from '../ui/SocialButton';

const { width, height } = Dimensions.get('window');

type AuthScreenProps = {
  mode?: 'login' | 'signup';
  onContinueToChat?: () => void;
  onSwitchMode?: () => void;
};

type WebGoogleAuthBridgeProps = {
  webClientId?: string;
  onRequestStateChange: (promptAsync: GoogleWebPromptAsync | null, requestReady: boolean) => void;
};

type BackendAuthUser = Partial<SessionUser> & {
  avatar?: string;
};

function mergeGoogleUser(
  backendUser: BackendAuthUser | null | undefined,
  googleProfile?: {
    id?: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
    locale?: string;
    emailVerified?: boolean;
  }
): SessionUser | null {
  if (!backendUser && !googleProfile) return null;

  const normalizedId = backendUser?.id ?? googleProfile?.id ?? googleProfile?.email ?? 'google-user';

  return {
    ...backendUser,
    id: String(normalizedId),
    email: backendUser?.email ?? googleProfile?.email,
    name: backendUser?.name ?? googleProfile?.name,
    avatarUrl: backendUser?.avatarUrl ?? backendUser?.avatar ?? googleProfile?.picture,
    givenName: backendUser?.givenName ?? googleProfile?.givenName,
    familyName: backendUser?.familyName ?? googleProfile?.familyName,
    locale: backendUser?.locale ?? googleProfile?.locale,
    emailVerified: backendUser?.emailVerified ?? googleProfile?.emailVerified,
    provider: backendUser?.provider ?? 'google',
    providerId: backendUser?.providerId ?? googleProfile?.id,
  };
}

function WebGoogleAuthBridge({ webClientId, onRequestStateChange }: WebGoogleAuthBridgeProps) {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    selectAccount: true,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  useEffect(() => {
    onRequestStateChange(promptAsync ?? null, Boolean(request));
  }, [onRequestStateChange, promptAsync, request]);

  useEffect(() => {
    console.log('[GoogleAuth][Web] AuthSession request ready:', Boolean(request));
  }, [request]);

  return null;
}

export default function AuthScreen({
  mode = 'login',
  onContinueToChat,
  onSwitchMode,
}: AuthScreenProps) {
  const { isDark, theme } = useTheme();
  const { colors } = theme;

  const glowOpacity = useSharedValue(0.4);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [glowOpacity, glowScale]);

  // Recolor top orb (Circle A: Blue) dynamically
  const animatedGlowStyle1 = useAnimatedStyle(() => ({
    opacity: isDark ? glowOpacity.value : glowOpacity.value * 0.16, // fluctuates around 0.08 in Light Mode
    transform: [{ scale: glowScale.value }],
  }));

  // Recolor bottom orb (Circle B: Gold) dynamically
  const animatedGlowStyle2 = useAnimatedStyle(() => ({
    opacity: isDark ? glowOpacity.value : glowOpacity.value * 0.14, // fluctuates around 0.07 in Light Mode
    transform: [{ scale: glowScale.value }],
  }));

  const setSession = useSessionStore(state => state.setSession);
  const currentUserId = useSessionStore(state => state.user?.id);
  const googleWebClientId = getGoogleWebClientId();
  const [webPromptAsync, setWebPromptAsync] = useState<GoogleWebPromptAsync | null>(null);
  const [webRequestReady, setWebRequestReady] = useState(false);
  const [isGoogleSignInPending, setIsGoogleSignInPending] = useState(false);
  const [authError, setAuthError] = useState<unknown>(null);

  const handleWebRequestStateChange = useCallback(
    (promptAsync: GoogleWebPromptAsync | null, requestReady: boolean) => {
      setWebPromptAsync(() => promptAsync);
      setWebRequestReady(requestReady);
    },
    []
  );

  useEffect(() => {
    console.log('[GoogleAuth][Init] current platform:', Platform.OS);
    console.log(
      '[GoogleAuth][Init] auth method:',
      Platform.OS === 'web'
        ? 'expo-auth-session (web)'
        : '@react-native-google-signin/google-signin'
    );
    console.log('[GoogleAuth][Init] has web client id:', Boolean(googleWebClientId));
  }, [googleWebClientId]);

  const handleEmailPress = () => {
    onContinueToChat?.();
  };

  const googleConfigMissing =
    !googleWebClientId || (Platform.OS === 'web' && (!webPromptAsync || !webRequestReady));

  const handleGooglePress = async () => {
    if (isGoogleSignInPending) {
      return;
    }

    console.log('[GoogleAuth][Press] current platform:', Platform.OS);
    console.log(
      '[GoogleAuth][Press] auth method:',
      Platform.OS === 'web'
        ? 'expo-auth-session (web)'
        : '@react-native-google-signin/google-signin'
    );

    if (googleConfigMissing) {
      console.error('[GoogleAuth][Press] Google sign-in configuration is incomplete.', {
        platform: Platform.OS,
        hasWebClientId: Boolean(googleWebClientId),
        webRequestReady,
      });
      setAuthError(new Error('Google sign-in is not configured for this build.'));
      return;
    }

    setAuthError(null);
    setIsGoogleSignInPending(true);

    try {
      const googleAuthResult = await signInWithGoogle({
        promptAsync: Platform.OS === 'web' ? (webPromptAsync ?? undefined) : undefined,
      });

      if (!googleAuthResult?.idToken) {
        setAuthError(new Error('Google did not return an authentication token.'));
        return;
      }

      console.log('[GoogleAuth][Backend] token received:', Boolean(googleAuthResult.idToken));
      console.log('[GoogleAuth][Backend] sending token to POST /auth/google');

      const data = await loginWithGoogle(
        googleAuthResult.idToken,
        googleAuthResult.providerAccessToken ?? undefined
      );

      if (!data?.accessToken || !data?.refreshToken) {
        console.error('[GoogleAuth][Backend] auth failure: token pair missing in response.', {
          hasAccessToken: Boolean(data?.accessToken),
          hasRefreshToken: Boolean(data?.refreshToken),
        });
        setAuthError(new Error('Authentication completed, but the server did not return a valid session.'));
        return;
      }

      const refreshToken = data.refreshToken;
      const mergedUser = mergeGoogleUser(data.user, googleAuthResult.profile);

      if (currentUserId && mergedUser?.id && currentUserId !== mergedUser.id) {
        clearUserScopedClientState();
      }

      setSession({
        accessToken: data.accessToken,
        refreshToken,
        user: mergedUser,
      });

      await persistSession({
        accessToken: data.accessToken,
        refreshToken,
        user: mergedUser,
      });

      console.log('[GoogleAuth][Backend] auth success');
      onContinueToChat?.();
    } catch (error: unknown) {
      const responseData =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response
          ? error.response.data
          : undefined;
      console.error(
        '[GoogleAuth][Backend] auth failure:',
        responseData ?? (error instanceof Error ? error.message : error)
      );
      setAuthError(error);
    } finally {
      setIsGoogleSignInPending(false);
    }
  };

  const titleText = mode === 'signup' ? 'Create your account' : 'Log into your account';
  const footerPrefix = mode === 'signup' ? 'Already have an account? ' : "Don't have an account? ";
  const footerAction = mode === 'signup' ? 'Log in' : 'Sign up';

  return (
    <View style={[styles.container, { backgroundColor: colors.background.base }]}>
      {Platform.OS === 'web' ? (
        <WebGoogleAuthBridge
          webClientId={googleWebClientId}
          onRequestStateChange={handleWebRequestStateChange}
        />
      ) : null}

      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient
          colors={[colors.background.base, colors.background.elevated]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -height * 0.1,
              right: -width * 0.2,
              width: width * 0.8,
              height: width * 0.8,
              borderRadius: width * 0.4,
              backgroundColor: colors.accent.secondary,
              opacity: 0.15,
            },
            animatedGlowStyle1,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: height * 0.1,
              left: -width * 0.3,
              width: width * 0.9,
              height: width * 0.9,
              borderRadius: width * 0.45,
              backgroundColor: colors.accent.mutedGold,
              opacity: 0.08,
            },
            animatedGlowStyle2,
          ]}
        />

        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentWrapper}>
          <Animated.Text
            entering={FadeInDown.duration(800).delay(200).springify()}
            style={[styles.titleText, { color: colors.text.primary }]}
          >
            {titleText}
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.duration(800).delay(400).springify()}
            style={styles.buttonGroup}
          >
            <GoogleAuthButton
              onPress={() => {
                void handleGooglePress();
              }}
              disabled={googleConfigMissing}
              isLoading={isGoogleSignInPending}
            />

            <View style={styles.dividerWrapper}>
              <ThemeDivider style={{ width: 'auto', flex: 1, marginVertical: 0 }} />
              <ThemeText
                style={{ paddingHorizontal: theme.spacing.md, color: colors.text.secondary }}
                variant="body"
              >
                or
              </ThemeText>
              <ThemeDivider style={{ width: 'auto', flex: 1, marginVertical: 0 }} />
            </View>

            <SocialButton provider="email" onPress={handleEmailPress} />

            {authError ? (
              <ErrorNotice
                error={authError}
                title="Sign-in failed"
                onDismiss={() => setAuthError(null)}
                style={{ marginTop: 4 }}
              />
            ) : null}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(800).delay(600).springify()}
            style={styles.footerWrapper}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <ThemeText style={{ color: colors.text.secondary }} variant="body">
                {footerPrefix}
              </ThemeText>
              <Pressable onPress={onSwitchMode} hitSlop={8}>
                <ThemeText
                  style={{ fontWeight: '600', color: colors.accent.primary }}
                  variant="body"
                >
                  {footerAction}
                </ThemeText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  logoWrapper: { paddingHorizontal: 32, paddingTop: 32 },
  logoBox: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  logoText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1.4 },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  titleText: {
    marginBottom: 48,
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  buttonGroup: { gap: 16 },
  dividerWrapper: { marginVertical: 8, flexDirection: 'row', alignItems: 'center' },
  dividerLine: { height: 1, flex: 1 },
  footerWrapper: { marginTop: 48, alignItems: 'center' },
});
