import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginWithGoogle } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/store/session-store';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function HomeEntryScreen() {
  const setSession = useSessionStore(state => state.setSession);
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
  });

  console.log('REDIRECT URI => ', redirectUri);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'dummy',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'dummy',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'dummy',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'dummy',
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  useEffect(() => {
    async function handleGoogleLogin() {
      if (response?.type === 'success') {
        setIsLoggingIn(true);
        const { id_token, access_token } = response.params;
        const providerAccessToken = access_token || response.authentication?.accessToken;

        if (id_token) {
          try {
            const data = await loginWithGoogle(id_token, providerAccessToken);
            setSession({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: data.user,
            });
            // Route to the ML Survey instead of standard chat
            router.replace('/ml-survey');
          } catch (error) {
            console.error('Google login failed:', error);
            setIsLoggingIn(false);
          }
        }
      } else if (response?.type === 'error') {
        setIsLoggingIn(false);
      }
    }
    handleGoogleLogin();
  }, [response]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505', overflow: 'hidden' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* Background Accents */}
      <View
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          blurRadius: 50,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(154, 114, 59, 0.14)',
          blurRadius: 50,
        }}
      />

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <View style={{ marginBottom: 60 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="medical" size={24} color="#9A723B" />
          </View>

          <Text
            style={{
              color: '#9A723B',
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            SpandaVidya Platform
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 48,
              fontWeight: '800',
              letterSpacing: -1,
              lineHeight: 54,
              marginBottom: 16,
            }}
          >
            Intelligence{'\n'}and vision.
          </Text>
          <Text style={{ color: '#888888', fontSize: 18, lineHeight: 28, paddingRight: 20 }}>
            Next-generation production-grade AI platform. Securely login to access your personalized
            health AI.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Pressable
            disabled={!request || isLoggingIn}
            onPress={() => {
              setIsLoggingIn(true);
              promptAsync();
            }}
            style={({ pressed }) => ({
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 18,
              borderRadius: 30,
              opacity: pressed || !request ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#000" style={{ marginRight: 12 }} />
                <Text style={{ color: '#000000', fontSize: 17, fontWeight: '700' }}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push('/signup')}
            style={({ pressed }) => ({
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 18,
              borderRadius: 30,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons name="mail" size={20} color="#FFF" style={{ marginRight: 12 }} />
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
              Continue with Email
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text style={{ color: '#666666', fontSize: 13, textAlign: 'center' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
