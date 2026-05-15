import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RegistrationForm() {
  const [gender, setGender] = useState<string | null>(null);

  return (
    <View style={{ width: '100%', marginTop: 16 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', marginBottom: 8 }}>
        ML Data Collection
      </Text>
      <Text style={{ color: '#888888', fontSize: 16, marginBottom: 32 }}>
        We need a few details and an eye scan for our Machine Learning model.
      </Text>

      {/* Name */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Name</Text>
        <TextInput 
          style={{ backgroundColor: '#121212', color: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, borderWidth: 1, borderColor: '#222222', fontSize: 16 }}
          placeholder="Enter your full name"
          placeholderTextColor="#555555"
        />
      </View>

      {/* Age */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Age</Text>
        <TextInput 
          style={{ backgroundColor: '#121212', color: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, borderWidth: 1, borderColor: '#222222', fontSize: 16 }}
          placeholder="Enter your age"
          placeholderTextColor="#555555"
          keyboardType="numeric"
        />
      </View>

      {/* Gender */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Gender</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {['Male', 'Female', 'Other'].map((g) => {
            const isSelected = gender === g;
            return (
              <Pressable 
                key={g}
                onPress={() => setGender(g)}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, backgroundColor: isSelected ? '#FFD700' : '#121212', borderColor: isSelected ? '#FFD700' : '#222222' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 16, color: isSelected ? '#000000' : '#FFFFFF' }}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Image of Eye */}
      <View style={{ marginBottom: 40 }}>
        <Text style={{ color: '#888888', fontSize: 14, fontWeight: '500', marginBottom: 12, letterSpacing: 0.5 }}>Image of Eye (ML Input)</Text>
        <Pressable style={{ backgroundColor: '#121212', borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', borderRadius: 24, paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1A1A1A', borderRadius: 50, padding: 20, marginBottom: 16 }}>
            <Ionicons name="camera-outline" size={36} color="#FFD700" />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4, letterSpacing: 0.5 }}>Tap to open camera</Text>
          <Text style={{ color: '#666666', fontSize: 14 }}>Capture a clear photo of your eye</Text>
        </Pressable>
      </View>

      <Pressable 
        onPress={() => {
          router.replace('/(tabs)');
        }}
        style={({ pressed }) => ({
          backgroundColor: '#FFD700',
          borderRadius: 30,
          paddingVertical: 18,
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 40,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        })}
      >
        <Text style={{ color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Submit Survey</Text>
      </Pressable>
    </View>
  );
}
