import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TextInput, Platform } from 'react-native';

import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { Button } from '@/components/ui/Button';

interface DeleteAccountDialogProps {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAccountDialog({
  visible,
  loading,
  onClose,
  onConfirm,
}: DeleteAccountDialogProps) {
  const { theme, isDark } = useTheme();
  const { colors, spacing, radii } = theme;

  const [verificationText, setVerificationText] = useState('');

  // Reset local state when modal visibility changes to false
  useEffect(() => {
    if (!visible) {
      setVerificationText('');
    }
  }, [visible]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setVerificationText('');
    };
  }, []);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleConfirm = () => {
    if (verificationText !== 'DELETE' || loading) return;
    onConfirm();
  };

  const isConfirmDisabled = verificationText !== 'DELETE' || loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.soft,
              ...Platform.select({
                web: {
                  boxShadow: isDark
                    ? '0px 16px 24px rgba(0, 0, 0, 0.28)'
                    : '0px 8px 32px rgba(140, 107, 62, 0.16)',
                },
                default: {
                  shadowColor: colors.shadowColor,
                  shadowOpacity: isDark ? 0.28 : 0.12,
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 16,
                  elevation: 8,
                },
              }),
            },
          ]}
        >
          <ThemeText
            variant="heading"
            style={[styles.modalTitle, { color: colors.text.danger }]}
          >
            Delete Account?
          </ThemeText>

          <ThemeText
            variant="body"
            style={[styles.modalWarningText, { color: colors.text.secondary }]}
          >
            This action is permanent and cannot be undone. All chats, eye scans, AI predictions,
            and medical profile records will be immediately and irreversibly deleted.
          </ThemeText>

          <ThemeText
            variant="caption"
            style={[styles.modalInputLabel, { color: colors.text.tertiary }]}
          >
            To confirm, type{' '}
            <ThemeText style={{ fontWeight: 'bold', color: colors.text.primary }}>
              DELETE
            </ThemeText>{' '}
            below:
          </ThemeText>

          <TextInput
            value={verificationText}
            onChangeText={setVerificationText}
            placeholder="DELETE"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            style={[
              styles.textInput,
              {
                color: colors.text.primary,
                borderColor: colors.border.soft,
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.02)',
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
              },
            ]}
            editable={!loading}
          />

          <View style={styles.modalActions}>
            <Button
              label="Cancel"
              variant="secondary"
              disabled={loading}
              onPress={handleClose}
              style={styles.actionButton}
            />
            <Button
              label={loading ? 'Deleting...' : 'Delete'}
              variant="primary"
              disabled={isConfirmDisabled}
              isLoading={loading}
              onPress={handleConfirm}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.text.danger,
                  borderColor: colors.errorBorder || colors.text.danger,
                },
              ]}
              textStyle={{ color: colors.background.base }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 12,
  },
  modalWarningText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 54,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
