import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';

export function ImageGuidelinesCard() {
  return (
    <GlassCard style={{ marginBottom: 16, padding: 16, backgroundColor: 'rgba(12, 19, 32, 0.92)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: 'rgba(140, 107, 62, 0.15)', // #8C6B3E accent sparingly
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="information-circle-outline" size={18} color="#8C6B3E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#F7FBFF' }}>Image Guidelines</Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: '#8FA2C3', lineHeight: 20, marginBottom: 12 }}>
        Learn how to capture eye images for accurate AI cataract screening.
      </Text>
      <PressableScale
        onPress={() => router.push('/instructions')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: 'rgba(17, 27, 42, 0.82)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(188, 210, 250, 0.15)',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#D8E7FF' }}>View Instructions</Text>
        <Ionicons name="arrow-forward" size={16} color="#8C6B3E" />
      </PressableScale>
    </GlassCard>
  );
}
