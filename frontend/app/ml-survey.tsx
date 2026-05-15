import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StatusBar, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import RegistrationForm from '@/components/RegistrationForm';

export default function MLSurveyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => ({
            height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)',
            opacity: pressed ? 0.7 : 1
          })}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <RegistrationForm />
      </ScrollView>
    </SafeAreaView>
  );
}
