import React, { useEffect } from 'react';
import { View, Text, Dimensions, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { loginWithGoogle } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/store/session-store';
import { persistSession } from '@/shared/auth/token-storage';

WebBrowser.maybeCompleteAuthSession();

import * as AuthSession from 'expo-auth-session';
import { SocialButton } from '../ui/SocialButton';

const { width, height } = Dimensions.get('window');

type AuthScreenProps = {
  mode?: 'login' | 'signup';
  onContinueToChat?: () => void;
  onSwitchMode?: () => void;
};

export default function AuthScreen({
  mode = 'login',
  onContinueToChat,
  onSwitchMode,
}: AuthScreenProps) {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const setSession = useSessionStore(state => state.setSession);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'dummy-web-client-id.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'dummy-web-client-id.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'dummy-ios-client-id.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'dummy-android-client-id.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri(),
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (request === null) {
      console.log('Google Auth request is null. Waiting for it to load...');
    }
  }, [request]);

  useEffect(() => {
    async function handleGoogleLogin() {
      if (response?.type === 'success') {
        console.log('[Auth] Google OAuth success. Params:', JSON.stringify(response.params));
        console.log('[Auth] Authentication object:', JSON.stringify(response.authentication));

        // On WEB: id_token is in response.authentication.idToken
        // On NATIVE: id_token is in response.params.id_token
        const id_token =
          response.params?.id_token ||
          response.authentication?.idToken ||
          null;

        const providerAccessToken =
          response.params?.access_token ||
          response.authentication?.accessToken ||
          null;

        console.log('[Auth] id_token found:', !!id_token);
        console.log('[Auth] providerAccessToken found:', !!providerAccessToken);

        if (!id_token) {
          console.error('[Auth] No id_token found in Google response. Cannot authenticate.');
          return;
        }

        try {
          console.log('[Auth] Sending token to backend...');
          const data = await loginWithGoogle(id_token, providerAccessToken ?? undefined);
          console.log('[Auth] Backend response data:', JSON.stringify(data));

          if (!data?.accessToken) {
            console.error('[Auth] Backend did not return accessToken. data =', data);
            return;
          }

          // On native: refreshToken is in JSON response body (used for SecureStore)
          // On web: refreshToken is in httpOnly cookie (browser handles it automatically)
          //         but data.refreshToken is also returned so both platforms work
          const refreshToken = data.refreshToken ?? '';

          setSession({
            accessToken: data.accessToken,
            refreshToken,
            user: data.user ?? null,
          });
          console.log('[Auth] Session set. User:', JSON.stringify(data.user));

          await persistSession({
            accessToken: data.accessToken,
            refreshToken,
            user: data.user ?? null,
          });
          console.log('[Auth] Session persisted. Navigating...');

          onContinueToChat?.();
        } catch (error: any) {
          console.error('[Auth] Google login failed on backend:', error?.response?.data ?? error?.message ?? error);
        }
      } else if (response?.type === 'error') {
        console.error('[Auth] Google Auth Error:', response.error);
      } else if (response?.type === 'dismiss') {
        console.log('[Auth] Google Auth dismissed by user.');
      }
    }
    handleGoogleLogin();
  }, [response]);

  const handleEmailPress = () => {
    onContinueToChat?.();
  };

  const handleGooglePress = () => {
    console.log('Google button pressed. Request ready:', !!request);
    if (request) {
      promptAsync();
    } else {
      console.warn('Google Auth is not initialized yet. Check your Client IDs.');
    }
  };

  const titleText = mode === 'signup' ? 'Create your account' : 'Log into your account';
  const footerPrefix = mode === 'signup' ? 'Already have an account? ' : "Don't have an account? ";
  const footerAction = mode === 'signup' ? 'Log in' : 'Sign up';

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient
          colors={['#0B0B0F', '#000000']}
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
              backgroundColor: '#3B82F6',
              opacity: 0.15,
            },
            animatedGlowStyle,
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
              backgroundColor: '#D1D5DB',
              opacity: 0.08,
            },
            animatedGlowStyle,
          ]}
        />

        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn.duration(1000)} style={styles.logoWrapper}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>DA</Text>
          </View>
        </Animated.View>

        <View style={styles.contentWrapper}>
          <Animated.Text
            entering={FadeInDown.duration(800).delay(200).springify()}
            style={styles.titleText}>
            {titleText}
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(800).delay(400).springify()} style={styles.buttonGroup}>
            <SocialButton provider="x" onPress={handleEmailPress} />

            <View style={styles.dividerWrapper}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialButton provider="email" onPress={handleEmailPress} />
            <SocialButton provider="google" onPress={handleGooglePress} />
            <SocialButton provider="apple" onPress={handleEmailPress} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(800).delay(600).springify()} style={styles.footerWrapper}>
            <Text style={styles.footerText}>{footerPrefix}</Text>
            <Pressable onPress={onSwitchMode}>
              <Text style={styles.footerAction}>{footerAction}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  logoWrapper: { paddingHorizontal: 32, paddingTop: 32 },
  logoBox: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' },
  logoText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1.4, color: '#FFFFFF' },
  contentWrapper: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  titleText: { marginBottom: 48, fontSize: 40, fontWeight: 'bold', letterSpacing: -1, color: '#FFFFFF' },
  buttonGroup: { gap: 16 },
  dividerWrapper: { marginVertical: 8, flexDirection: 'row', alignItems: 'center' },
  dividerLine: { height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { paddingHorizontal: 16, fontSize: 14, color: '#9CA3AF' },
  footerWrapper: { marginTop: 48, alignItems: 'center' },
  footerText: { fontSize: 15, color: '#9CA3AF' },
  footerAction: { fontWeight: '600', color: '#FFFFFF' },
});
