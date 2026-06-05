import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { PressableScale } from '@/components/ui/PressableScale';
import { Ionicons } from '@expo/vector-icons';
import { BAD_IMAGE_INSTRUCTIONS, GOOD_IMAGE_INSTRUCTIONS } from '../constants/instruction-data';
import { ExampleGrid } from '../components/example-grid';
import { InstructionSection } from '../components/instruction-section';

export function ImageInstructionsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenBackground />
      
      <View style={styles.header}>
        <PressableScale
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#F7FAFF" />
        </PressableScale>
        <Text style={styles.headerTitle}>Guidelines</Text>
        <View style={{ width: 40 }} /> {/* Spacer to center title */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.heroSection}>
            <Text style={styles.title}>Good Eye Image Requirements</Text>
            <Text style={styles.subtitle}>
              Follow these guidelines for more accurate AI cataract screening.
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <InstructionSection
            category={{
              title: 'Good Images',
              items: GOOD_IMAGE_INSTRUCTIONS,
            }}
          />
          <ExampleGrid type="good" />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={styles.divider} />
          
          <InstructionSection
            category={{
              title: 'Avoid These Images',
              items: BAD_IMAGE_INSTRUCTIONS,
            }}
          />
          <ExampleGrid type="bad" />
        </Animated.View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06080D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 24, 38, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(189, 210, 248, 0.15)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F7FAFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F6FAFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8FA2C3',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(163, 180, 214, 0.15)',
    marginVertical: 32,
  },
});
