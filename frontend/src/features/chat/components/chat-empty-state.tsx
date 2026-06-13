import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';

interface ChatEmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    label: "Cataract Screening",
    description: "Upload eye photos for screening and scanning assistance.",
    icon: "eye-outline" as const,
    text: "I want to screen my eyes for cataracts. Can you guide me on uploading an image?"
  },
  {
    label: "Report Clarification",
    description: "Understand your prediction results and medical terms.",
    icon: "document-text-outline" as const,
    text: "Can you help me understand my cataract prediction and clinical findings?"
  },
  {
    label: "Ayurvedic Care Tips",
    description: "Discover holistic remedies for daily vision wellness.",
    icon: "leaf-outline" as const,
    text: "What are some Ayurvedic tips for general vision and eye health preservation?"
  },
];

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const { theme } = useTheme();
  
  const orbOpacity = useSharedValue(0.5);
  const orbScale = useSharedValue(1);

  useEffect(() => {
    orbOpacity.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 1800 }), withTiming(0.45, { duration: 1800 })),
      -1,
      true
    );
    orbScale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 2400 }), withTiming(1, { duration: 2400 })),
      -1,
      true
    );
  }, [orbOpacity, orbScale]);

  const animatedSparkleStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.sparkleWrapper,
          {
            backgroundColor: theme.colors.border.subtle,
          },
          animatedSparkleStyle,
        ]}
      >
        <Ionicons
          name="sparkles"
          size={22}
          color={theme.colors.accent.primary}
        />
      </Animated.View>
      
      <ThemeText
        style={{
          textAlign: 'center',
          fontSize: 26,
          fontWeight: '700',
          fontFamily: 'SpaceGrotesk_700Bold',
          color: theme.colors.text.primary,
        }}
      >
        Spanda AI Assistant
      </ThemeText>
      
      <ThemeText
        style={{
          marginTop: 10,
          textAlign: 'center',
          fontSize: 14,
          color: theme.colors.text.secondary,
          lineHeight: 22,
          paddingHorizontal: 24,
        }}
      >
        Consult with Spanda Gemini for Ayurvedic eye wellness and cataract screening insights.
      </ThemeText>

      {/* Suggested Prompts Section */}
      <View style={styles.suggestionsContainer}>
        <ThemeText
          style={{
            fontFamily: 'SpaceGrotesk_700Bold',
            color: theme.colors.accent.primary,
            fontWeight: '700',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: 16,
            alignSelf: 'center',
          }}
        >
          Suggested Consultations
        </ThemeText>

        {SUGGESTED_PROMPTS.map((prompt) => (
          <PressableScale
            key={prompt.label}
            onPress={() => onSelectPrompt?.(prompt.text)}
            style={{ marginBottom: 12 }}
          >
            <GlassCard
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: theme.colors.border.subtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name={prompt.icon}
                  size={18}
                  color={theme.colors.accent.primary}
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <ThemeText
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.colors.text.primary,
                  }}
                >
                  {prompt.label}
                </ThemeText>
                <ThemeText
                  style={{
                    fontSize: 12,
                    color: theme.colors.text.secondary,
                    marginTop: 2,
                  }}
                >
                  {prompt.description}
                </ThemeText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.accent.primary}
              />
            </GlassCard>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 10,
  },
  sparkleWrapper: {
    marginBottom: 16,
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: 36,
  },
});
