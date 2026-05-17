import React from 'react';
import { View, Text, ScrollView, StatusBar, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import ProjectInfo from '@/components/ProjectInfo';
import DataCollectionForm from '@/components/DataCollectionForm';
import { useSessionStore } from '@/features/auth/store/session-store';

export default function HomeScreen() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* Header / Nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
        {/* Logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="medical" size={24} color="#9A723B" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>SpandaVidya</Text>
        </View>

        {/* Right Side — Login or Avatar */}
        {!hydrated ? (
          // Still loading session — show nothing to avoid flicker
          <ActivityIndicator size="small" color="#9A723B" />
        ) : user ? (
          // Logged in — show profile avatar + name
          <Pressable
            onPress={() => router.push('/(tabs)')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 2,
                  borderColor: '#9A723B',
                }}
              />
            ) : (
              // Fallback avatar with initials
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#9A723B',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#C49A50',
              }}>
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>
                  {(user.name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', maxWidth: 120 }} numberOfLines={1}>
                {user.name ?? 'User'}
              </Text>
              <Text style={{ color: '#9A723B', fontSize: 11 }}>Dashboard →</Text>
            </View>
          </Pressable>
        ) : (
          // Not logged in
          <Pressable
            onPress={() => router.push('/login')}
            style={{ backgroundColor: '#9A723B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
          >
            <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>Login</Text>
          </Pressable>
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
