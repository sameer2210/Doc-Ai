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
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.base }]}>
        <ScreenBackground />
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background.base }]}
      edges={['top']}
    >
      <ScreenBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: spacing.md,
              paddingTop: spacing.md,
              paddingBottom: spacing.xxl,
            },
          ]}
        >
          {/* ── Page header ──────────────────────────────────────────── */}
          <View style={[styles.header, { marginBottom: spacing.xl }]}>
            <ThemeText
              style={[styles.overline, { color: colors.accent.primary }]}
              allowFontScaling={true}
            >
              Questionnaire
            </ThemeText>
            <ThemeText
              style={[styles.title, { color: colors.text.primary }]}
              allowFontScaling={true}
            >
              Body Insight Check
            </ThemeText>
            <ThemeText
              variant="body"
              style={[styles.subtitle, { color: colors.text.secondary }]}
              allowFontScaling={true}
            >
              Providing details about your daily symptoms helps Spanda AI tailor recommendations
              during consultation.
            </ThemeText>
          </View>

          {/* ── Demographics section ─────────────────────────────────── */}
          <ThemeSurface
            variant="surface"
            style={[
              styles.sectionCard,
              { borderRadius: radii.xl, marginBottom: spacing.xl, padding: spacing.md },
            ]}
          >
            <ThemeText
              variant="heading"
              style={[styles.sectionTitle, { color: colors.text.primary, marginBottom: spacing.md }]}
              allowFontScaling={true}
            >
              Demographics
            </ThemeText>

            {/* Date of Birth */}
            <View style={[styles.inputGroup, { marginBottom: spacing.md }]}>
              <ThemeText
                variant="caption"
                style={[styles.inputLabel, { color: colors.text.secondary, marginBottom: spacing.sm }]}
                allowFontScaling={true}
              >
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
                    placeholderTextColor={colors.inputPlaceholder}
                    accessibilityLabel="Date of birth"
                    accessibilityHint="Enter in YYYY-MM-DD format"
                    style={[
                      styles.textInput,
                      {
                        color: colors.text.primary,
                        borderColor: errors.dateOfBirth
                          ? colors.text.danger
                          : colors.border.soft,
                        backgroundColor: colors.inputBackground,
                        borderRadius: radii.md,
                        paddingHorizontal: spacing.md,
                        fontSize: 14,
                      },
                    ]}
                  />
                )}
              />
              {errors.dateOfBirth ? (
                <ThemeText
                  variant="caption"
                  style={[styles.errorText, { color: colors.text.danger, marginTop: spacing.xs }]}
                  allowFontScaling={true}
                >
                  {errors.dateOfBirth.message}
                </ThemeText>
              ) : null}
            </View>

            {/* Gender */}
            <View>
              <ThemeText
                variant="caption"
                style={[styles.inputLabel, { color: colors.text.secondary, marginBottom: spacing.sm }]}
                allowFontScaling={true}
              >
                Gender
              </ThemeText>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <View style={[styles.genderContainer, { gap: spacing.sm }]}>
                    {GENDER_OPTIONS.map((opt) => {
                      const isSelected = field.value === opt.value;
                      return (
                        <PressableScale
                          key={opt.value}
                          onPress={() => setValue('gender', opt.value)}
                          accessibilityRole="button"
                          accessibilityLabel={opt.label}
                          accessibilityState={{ selected: isSelected }}
                          style={[
                            styles.genderOption,
                            {
                              borderColor: isSelected
                                ? colors.accent.primary
                                : colors.border.soft,
                              backgroundColor: isSelected
                                ? colors.accentSurface
                                : colors.inputBackground,
                              borderRadius: radii.md,
                              paddingVertical: spacing.sm,
                            },
                          ]}
                        >
                          <ThemeText
                            style={[
                              styles.genderText,
                              {
                                color: isSelected
                                  ? colors.accent.primary
                                  : colors.text.primary,
                                fontWeight: isSelected ? '700' : '400',
                              },
                            ]}
                            allowFontScaling={true}
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

          {/* ── Health Context Indicators ────────────────────────────── */}
          <View style={[styles.symptomsHeader, { marginBottom: spacing.sm }]}>
            <ThemeText
              variant="caption"
              style={[styles.overline, { color: colors.accent.primary }]}
              allowFontScaling={true}
            >
              Symptom Review
            </ThemeText>
            <ThemeText
              variant="heading"
              style={[styles.sectionTitle, { color: colors.text.primary }]}
              allowFontScaling={true}
            >
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

          {/* ── Submit ───────────────────────────────────────────────── */}
          <View style={[styles.buttonContainer, { marginTop: spacing.sm }]}>
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
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    // padding applied inline via theme spacing
  },
  header: {
    gap: 4,
    // marginBottom applied inline
  },
  overline: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    // borderRadius, marginBottom, padding applied inline
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    // marginBottom applied inline
  },
  inputGroup: {
    // marginBottom applied inline
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    // marginBottom applied inline
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    // borderRadius, paddingHorizontal, fontSize applied inline
  },
  errorText: {
    fontSize: 11,
    // marginTop applied inline
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genderOption: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44, // a11y minimum touch target
    // borderRadius, paddingVertical, gap applied inline
  },
  genderText: {
    fontSize: 13,
  },
  symptomsHeader: {
    gap: 2,
    // marginBottom applied inline
  },
  buttonContainer: {
    // marginTop applied inline
  },
});
