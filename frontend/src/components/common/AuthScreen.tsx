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
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { Button } from '@/components/ui/Button';
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
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { GoogleAuthButton } from '../auth/google-auth-button';
import { ErrorNotice } from '../ui/ErrorNotice';

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
    bodyInsightCompleted: backendUser?.bodyInsightCompleted ?? false,
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

  return null;
}

export default function AuthScreen({
  mode = 'login',
  onContinueToChat,
  onSwitchMode,
}: AuthScreenProps) {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  const glowOpacity = useSharedValue(0.4);
  const glowScale = useSharedValue(1);

  // Capture scale factors from theme so they are accessible inside worklets.
  // Reanimated worklets cannot close over non-primitive JS objects at runtime,
  // so we extract the numeric values before the animated style callbacks.
  const orbScalePrimary = colors.floatingOrbOpacityScale.primary;
  const orbScaleSecondary = colors.floatingOrbOpacityScale.secondary;

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

  // Top orb animation — opacity driven by theme-encoded scale factor.
  const animatedGlowStyle1 = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * orbScalePrimary,
    transform: [{ scale: glowScale.value }],
  }));

  // Bottom orb animation — opacity driven by theme-encoded scale factor.
  const animatedGlowStyle2 = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * orbScaleSecondary,
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


  const handleEmailPress = () => {
    router.push('/email-auth');
  };

  const googleConfigMissing =
    !googleWebClientId || (Platform.OS === 'web' && (!webPromptAsync || !webRequestReady));

  const handleGooglePress = async () => {
    if (isGoogleSignInPending) {
      return;
    }



    if (googleConfigMissing) {

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

      const data = await loginWithGoogle(
        googleAuthResult.idToken,
        googleAuthResult.providerAccessToken ?? undefined
      );

      if (!data?.accessToken || !data?.refreshToken) {

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

        {/* Top orb — uses floatingOrbPrimary color + per-mode opacity scale */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -height * 0.1,
              right: -width * 0.2,
              width: width * 0.8,
              height: width * 0.8,
              borderRadius: width * 0.4,
              backgroundColor: colors.floatingOrbPrimary,
            },
            animatedGlowStyle1,
          ]}
        />

        {/* Bottom orb — uses floatingOrbSecondary color + per-mode opacity scale */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: height * 0.1,
              left: -width * 0.3,
              width: width * 0.9,
              height: width * 0.9,
              borderRadius: width * 0.45,
              backgroundColor: colors.floatingOrbSecondary,
            },
            animatedGlowStyle2,
          ]}
        />

        {/* BlurView tint driven by semantic token — no isDark branch */}
        <BlurView intensity={80} tint={colors.blurOverlay} style={StyleSheet.absoluteFillObject} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.contentWrapper, { paddingHorizontal: spacing.xl }]}>
          {/* Hero Section */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(200).springify()}
            style={{ marginBottom: spacing.xxl }}
          >
            <ThemeText
              variant="title"
              style={{
                fontSize: 42,
                fontFamily: 'SpaceGrotesk_700Bold',
                letterSpacing: -1.5,
                color: colors.text.primary,
                marginBottom: spacing.xs,
              }}
            >
              SpandaVidya AI
            </ThemeText>

            <ThemeText
              variant="heading"
              style={{
                fontSize: 18,
                lineHeight: 24,
                color: colors.accent.primary,
                marginBottom: spacing.sm,
              }}
            >
              AI-powered cataract screening and eye wellness guidance.
            </ThemeText>

            <ThemeText
              variant="body"
              style={{
                color: colors.text.secondary,
              }}
            >
              Secure access to your scans, reports and AI consultations.
            </ThemeText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(800).delay(400).springify()}
            style={[styles.buttonGroup, { gap: spacing.md }]}
          >
            <GoogleAuthButton
              onPress={() => {
                void handleGooglePress();
              }}
              disabled={googleConfigMissing}
              isLoading={isGoogleSignInPending}
            />

            <Button
              label="Continue with Email"
              onPress={handleEmailPress}
              style={{
                backgroundColor: colors.text.primary,
                borderColor: colors.text.primary,
              }}
              textStyle={{
                color: colors.background.base,
              }}
              icon={
                <View style={{ marginRight: spacing.sm }}>
                  <Ionicons name="mail-outline" size={20} color={colors.background.base} />
                </View>
              }
            />

            {authError ? (
              <ErrorNotice
                error={authError}
                title="Sign-in failed"
                onDismiss={() => setAuthError(null)}
                style={{ marginTop: spacing.xs }}
              />
            ) : null}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(800).delay(600).springify()}
            style={[styles.footerWrapper, { marginTop: spacing.xxl }]}
          >
            <View style={styles.footerRow}>
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

            <ThemeText
              style={[
                styles.legalText,
                { color: colors.text.secondary, marginTop: spacing.md, textAlign: 'center' },
              ]}
              variant="caption"
            >
              By continuing, you agree to our{' '}
              <ThemeText
                onPress={() => router.push('/terms-conditions')}
                accessibilityRole="link"
                accessibilityLabel="Terms and Conditions"
                style={{
                  color: colors.accent.primary,
                  textDecorationLine: 'underline',
                  fontWeight: '600',
                }}
                variant="caption"
              >
                Terms & Conditions
              </ThemeText>{' '}
              and acknowledge our{' '}
              <ThemeText
                onPress={() => router.push('/privacy-security')}
                accessibilityRole="link"
                accessibilityLabel="Privacy & Security Policy"
                style={{
                  color: colors.accent.primary,
                  textDecorationLine: 'underline',
                  fontWeight: '600',
                }}
                variant="caption"
              >
                Privacy & Security Policy
              </ThemeText>
              .
            </ThemeText>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'center',
    // paddingHorizontal is applied inline via spacing.xl (28) — close to original 32.
    // A dedicated spacing.section token could be added if this divergence matters.
  },
  buttonGroup: {
    // gap applied inline via spacing.md
  },
  footerWrapper: {
    alignItems: 'center',
    // marginTop applied inline via spacing.xxl
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalText: {
    textAlign: 'center',
  },
});
