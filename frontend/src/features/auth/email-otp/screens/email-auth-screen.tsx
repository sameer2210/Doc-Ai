import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';
import { EmailInputForm } from '../components/email-input-form';
import { OtpInputForm } from '../components/otp-input-form';
import { OtpTimer } from '../components/otp-timer';
import { ResendCodeButton } from '../components/resend-code-button';
import { useRequestOtp } from '../hooks/use-request-otp';
import { useVerifyOtp } from '../hooks/use-verify-otp';

type EmailAuthStep = 'EMAIL' | 'OTP' | 'VERIFYING' | 'SUCCESS';

export function EmailAuthScreen() {
  const { theme, isDark } = useTheme();
  const { colors, spacing, radii } = theme;
  const router = useRouter();

  const [step, setStep] = useState<EmailAuthStep>('EMAIL');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();

  const handleRequestOtp = async (inputEmail: string) => {
    setErrorMsg(null);
    setEmail(inputEmail);
    requestOtpMutation.mutate(
      { email: inputEmail },
      {
        onSuccess: (data) => {
          if (data.success) {
            setStep('OTP');
          } else {
            setErrorMsg('Failed to send verification code. Please try again.');
          }
        },
        onError: (error) => {
          setErrorMsg(error.message || 'Something went wrong. Please try again.');
        },
      }
    );
  };

  const handleVerifyOtp = async (otp: string) => {
    setErrorMsg(null);
    setStep('VERIFYING');
    verifyOtpMutation.mutate(
      { email, otp },
      {
        onSuccess: () => {
          setStep('SUCCESS');
          // Session hooks in VerifyOtp will automatically update session state.
          // Navigate to Home screen.
          setTimeout(() => {
            router.replace('/');
          }, 500);
        },
        onError: (error) => {
          setStep('OTP');
          setErrorMsg(error.message || 'Verification failed. Please check the code and try again.');
        },
      }
    );
  };

  const handleBack = () => {
    if (step === 'OTP' || step === 'VERIFYING') {
      setStep('EMAIL');
      setErrorMsg(null);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background.base }]}>
      <ScreenBackground />

      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          disabled={step === 'VERIFYING' || step === 'SUCCESS'}
          hitSlop={8}
          style={[
            styles.backButton,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.02)',
              borderColor: colors.border.soft,
              borderRadius: radii.full,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <View style={styles.contentWrapper}>
          <ThemeText variant="heading" style={styles.title}>
            Email Authentication
          </ThemeText>

          <GlassCard style={styles.card}>
            {step === 'EMAIL' && (
              <EmailInputForm
                onSubmit={handleRequestOtp}
                isLoading={requestOtpMutation.isPending}
                error={errorMsg}
              />
            )}

            {(step === 'OTP' || step === 'VERIFYING') && (
              <>
                <OtpInputForm
                  email={email}
                  onSubmit={handleVerifyOtp}
                  isLoading={verifyOtpMutation.isPending || step === 'VERIFYING'}
                  error={errorMsg}
                  onBackToEmail={handleBack}
                />

                <OtpTimer
                  isActive={step === 'OTP'}
                  onExpire={() => setErrorMsg('OTP has expired. Please request a new code.')}
                />

                <ResendCodeButton
                  onResend={() => handleRequestOtp(email)}
                  isLoading={requestOtpMutation.isPending}
                />
              </>
            )}

            {step === 'SUCCESS' && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={64} color={colors.text.success} />
                <ThemeText variant="heading" style={[styles.successTitle, { marginTop: spacing.md }]}>
                  Successfully Verified!
                </ThemeText>
                <ThemeText variant="body" style={{ color: colors.text.secondary }}>
                  Logging you in...
                </ThemeText>
              </View>
            )}
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    padding: 24,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
});
