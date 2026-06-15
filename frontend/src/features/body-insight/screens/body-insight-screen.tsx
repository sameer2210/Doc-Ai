import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useTheme } from '@/theme';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { useBodyInsight, useSaveBodyInsight } from '../hooks/use-body-insight';
import { QuestionCard } from '../components/question-card';
import { BODY_INSIGHT_QUESTIONS } from '../constants/body-insight-questions';
import type { Gender } from '../types';

const bodyInsightFormSchema = z.object({
  dateOfBirth: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true; // optional
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(val)) return false;
        const date = new Date(val);
        return !isNaN(date.getTime()) && date <= new Date();
      },
      { message: 'Use YYYY-MM-DD format and select a past date' }
    )
    .nullable()
    .or(z.literal(''))
    .optional(),
  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const)
    .nullable()
    .optional(),
  diabetes: z.boolean(),
  hypertension: z.boolean(),
  blurredVision: z.boolean(),
  nightVisionDifficulty: z.boolean(),
  halosAroundLights: z.boolean(),
  familyHistoryOfCataract: z.boolean(),
});

type FormValues = z.infer<typeof bodyInsightFormSchema>;

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer Not to Say', value: 'PREFER_NOT_TO_SAY' },
];

export function BodyInsightScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const { data: profile, isLoading } = useBodyInsight();
  const saveProfileMutation = useSaveBodyInsight();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(bodyInsightFormSchema),
    defaultValues: {
      dateOfBirth: '',
      gender: undefined,
      diabetes: false,
      hypertension: false,
      blurredVision: false,
      nightVisionDifficulty: false,
      halosAroundLights: false,
      familyHistoryOfCataract: false,
    },
  });

  // Populate form with existing profile if loaded
  useEffect(() => {
    if (profile) {
      let formattedDob = '';
      if (profile.dateOfBirth) {
        try {
          formattedDob = new Date(profile.dateOfBirth).toISOString().split('T')[0];
        } catch {
          // fallback
        }
      }
      reset({
        dateOfBirth: formattedDob,
        gender: profile.gender ?? undefined,
        diabetes: profile.diabetes,
        hypertension: profile.hypertension,
        blurredVision: profile.blurredVision,
        nightVisionDifficulty: profile.nightVisionDifficulty,
        halosAroundLights: profile.halosAroundLights,
        familyHistoryOfCataract: profile.familyHistoryOfCataract,
      });
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit((values) => {
    saveProfileMutation.mutate(
      {
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || null,
        diabetes: values.diabetes,
        hypertension: values.hypertension,
        blurredVision: values.blurredVision,
        nightVisionDifficulty: values.nightVisionDifficulty,
        halosAroundLights: values.halosAroundLights,
        familyHistoryOfCataract: values.familyHistoryOfCataract,
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.base }]}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={theme.colors.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]} edges={['top']}>
      <ScreenBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <ThemeText style={styles.label}>Questionnaire</ThemeText>
            <ThemeText style={styles.title}>Body Insight Check</ThemeText>
            <ThemeText
              variant="body"
              style={[styles.subtitle, { color: theme.colors.text.secondary }]}
            >
              Providing details about your daily symptoms helps Spanda AI tailor recommendations during consultation.
            </ThemeText>
          </View>

          {/* Demographic Section */}
          <ThemeSurface variant="surface" style={styles.sectionCard}>
            <ThemeText variant="heading" style={styles.sectionTitle}>
              Demographics
            </ThemeText>

            {/* DOB */}
            <View style={styles.inputGroup}>
              <ThemeText variant="caption" style={styles.inputLabel}>
                Date of Birth (YYYY-MM-DD)
              </ThemeText>
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field }) => (
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    placeholder="e.g. 1980-04-12"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    style={[
                      styles.textInput,
                      {
                        color: theme.colors.text.primary,
                        borderColor: errors.dateOfBirth
                          ? theme.colors.text.danger
                          : theme.colors.border.soft,
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'rgba(0, 0, 0, 0.02)',
                      },
                    ]}
                  />
                )}
              />
              {errors.dateOfBirth && (
                <ThemeText variant="caption" style={styles.errorText}>
                  {errors.dateOfBirth.message}
                </ThemeText>
              )}
            </View>

            {/* Gender Selection */}
            <View style={styles.inputGroup}>
              <ThemeText variant="caption" style={styles.inputLabel}>
                Gender
              </ThemeText>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <View style={styles.genderContainer}>
                    {GENDER_OPTIONS.map((opt) => {
                      const isSelected = field.value === opt.value;
                      return (
                        <PressableScale
                          key={opt.value}
                          onPress={() => setValue('gender', opt.value)}
                          style={[
                            styles.genderOption,
                            {
                              borderColor: isSelected
                                ? theme.colors.accent.primary
                                : theme.colors.border.soft,
                              backgroundColor: isSelected
                                ? theme.colors.accentSurface
                                : (isDark
                                    ? 'rgba(255, 255, 255, 0.04)'
                                    : 'rgba(0, 0, 0, 0.02)'),
                            },
                          ]}
                        >
                          <ThemeText
                            style={[
                              styles.genderText,
                              {
                                color: isSelected
                                  ? theme.colors.accent.primary
                                  : theme.colors.text.primary,
                                fontWeight: isSelected ? '700' : '400',
                              },
                            ]}
                          >
                            {opt.label}
                          </ThemeText>
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              />
            </View>
          </ThemeSurface>

          {/* Symptom Questions */}
          <View style={styles.symptomsHeader}>
            <ThemeText variant="heading" style={styles.sectionTitle}>
              Health Context Indicators
            </ThemeText>
          </View>

          {BODY_INSIGHT_QUESTIONS.map((q) => (
            <Controller
              key={q.id}
              control={control}
              name={q.id}
              render={({ field }) => (
                <QuestionCard
                  title={q.title}
                  description={q.description}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          ))}

          {/* Submit Actions */}
          <View style={styles.buttonContainer}>
            <Button
              label="Save Health Profile"
              isLoading={saveProfileMutation.isPending}
              onPress={onSubmit}
              variant="primary"
            />
          </View>
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    opacity: 0.7,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '47%',
    alignItems: 'center',
  },
  genderText: {
    fontSize: 13,
  },
  symptomsHeader: {
    marginBottom: 12,
  },
  buttonContainer: {
    marginTop: 12,
  },
});
