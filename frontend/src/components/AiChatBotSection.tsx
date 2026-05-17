import React from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AiChatBotSection() {
  return (
    <View
      style={{
        marginTop: 40,
        marginBottom: 60,
        backgroundColor: '#0A0A0A',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#1E1E1E',
        padding: 32,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Decorative Gradient Background Blur for Web */}
      {Platform.OS === 'web' && (
        <View
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 250,
            height: 250,
            borderRadius: 125,
            backgroundColor: 'rgba(154, 114, 59, 0.08)',
            // @ts-ignore
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Header with Title and Coming Soon Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              backgroundColor: '#1E1408',
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: '#3D2A12',
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#9A723B" />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', letterSpacing: 0.3 }}>
              SpandaVidya AI Assistant
            </Text>
            <Text style={{ color: '#9A723B', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>
              Conversational Core
            </Text>
          </View>
        </View>

        {/* Glowing Badge */}
        <View
          style={{
            backgroundColor: '#1C150A',
            borderWidth: 1,
            borderColor: '#9A723B',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9A723B' }} />
          <Text style={{ color: '#9A723B', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
            Coming Soon
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={{ color: '#888888', fontSize: 15, lineHeight: 24, marginBottom: 28 }}>
        Our advanced medical-tuned conversational AI model is being integrated. Soon, you will be able to consult the chatbot to instantly analyze diagnostic history, translate machine learning survey inputs, and obtain real-time visual assessment predictions.
      </Text>

      {/* Interactive Mock Chat Bubble */}
      <View
        style={{
          backgroundColor: '#121212',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#1C1C1C',
          padding: 20,
          marginBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#9A723B',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles" size={16} color="#000000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>SpandaVidya Bot</Text>
            <Text style={{ color: '#AAAAAA', fontSize: 14, lineHeight: 20 }}>
              "Hello! I am preparing my clinical dataset modules. I will be ready to analyze your eye scans and survey answers soon. Ask me anything!"
            </Text>
          </View>
        </View>
      </View>

      {/* Mock Locked Chat Input Section */}
      <View style={{ position: 'relative' }}>
        <TextInput
          editable={false}
          style={{
            backgroundColor: '#121212',
            color: '#666666',
            borderRadius: 20,
            paddingLeft: 20,
            paddingRight: 60,
            paddingVertical: 18,
            borderWidth: 1,
            borderColor: '#222222',
            fontSize: 15,
          }}
          placeholder="Ask SpandaVidya AI a question..."
          placeholderTextColor="#444444"
        />
        <View
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            backgroundColor: '#1C1409',
            borderRadius: 14,
            width: 42,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#3D2A12',
          }}
        >
          <Ionicons name="lock-closed" size={16} color="#9A723B" />
        </View>
      </View>
    </View>
  );
}
