import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

import { DeleteAccountDialog } from '../components/delete-account-dialog';
import { useDeleteAccount } from '../hooks/use-delete-account';
import { PrivacyPolicyContent } from '../components/privacy-policy-content';

export function PrivacySecurityScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const { deleteAccount, isDeleting, error, clearError } = useDeleteAccount();

  async function handleDeleteAccount() {
    const success = await deleteAccount();
    if (success) {
      setIsModalVisible(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background.base }]}
      edges={['top']}
    >
      <View style={styles.flex1}>
        <ScreenBackground />

        {/* Header with Back Trigger */}
        <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
          <PressableScale onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
          </PressableScale>
          <ThemeText style={styles.headerTitle}>Privacy & Security</ThemeText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            {/* Privacy Policy Content */}
            <PrivacyPolicyContent />

            {/* Delete Account Section */}
            <GlassCard
              style={[
                styles.deleteCard,
                {
                  borderColor: colors.errorBorder || colors.text.danger,
                  backgroundColor: colors.errorSurface || 'rgba(239, 68, 68, 0.05)',
                },
              ]}
            >
              <ThemeText
                variant="heading"
                style={[styles.deleteTitle, { color: colors.text.danger }]}
              >
                Delete Account
              </ThemeText>
              <ThemeText
                style={[styles.deleteDescription, { color: colors.text.secondary }]}
                variant="body"
              >
                Deleting your account permanently removes chats, eye scans, AI predictions, body insight records, sessions, and account information.
              </ThemeText>

              {error && (
                <ThemeText
                  variant="caption"
                  style={[styles.errorText, { color: colors.text.danger, marginBottom: 16 }]}
                >
                  {error}
                </ThemeText>
              )}

              <Button
                label="Delete Account"
                onPress={() => setIsModalVisible(true)}
                variant="outline"
                style={{ borderColor: colors.errorBorder || colors.text.danger }}
                textStyle={{ color: colors.text.danger }}
              />
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </View>

      {/* Confirmation Modal */}
      <DeleteAccountDialog
        visible={isModalVisible}
        loading={isDeleting}
        onClose={() => {
          setIsModalVisible(false);
          clearError();
        }}
        onConfirm={handleDeleteAccount}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headerRightPlaceholder: {
    width: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  deleteCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  deleteDescription: {
    lineHeight: 22,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
  },
});
