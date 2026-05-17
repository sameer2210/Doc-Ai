import React from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import ProjectInfo from '@/components/ProjectInfo';
import DataCollectionForm from '@/components/DataCollectionForm';
import { useSessionStore } from '@/features/auth/store/session-store';

export default function HomeScreen() {
  const user = useSessionStore(state => state.user);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* Header / Nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="medical" size={24} color="#9A723B" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>SpandaVidya</Text>
        </View>
        {!user ? (
          <Text onPress={() => router.push('/login')} style={{ color: '#9A723B', fontSize: 16, fontWeight: '600' }}>
            Login
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text onPress={() => router.push('/(tabs)')} style={{ color: '#9A723B', fontSize: 16, fontWeight: '600', marginRight: 16 }}>
              Dashboard
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Background Accents */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            blurRadius: 50,
          }}
        />
        
        {/* Hero Section */}
        <View style={{ marginTop: 40, marginBottom: 40 }}>
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
            Next-generation production-grade AI platform. Explore our capabilities below, and fill out the ML survey to get started.
          </Text>
        </View>

        {/* Project Info Section */}
        <ProjectInfo />

        {/* ML Form Section */}
        <View style={{ marginTop: 20, paddingTop: 40, borderTopWidth: 1, borderTopColor: '#222' }}>
          <DataCollectionForm />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
