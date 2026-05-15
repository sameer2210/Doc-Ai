import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RegistrationForm() {
  const [gender, setGender] = useState<string | null>(null);

  return (
    <View className="w-full mt-8">
      {/* Google Login */}
      <Pressable className="flex-row items-center justify-center bg-[#1A1A1A] rounded-[30px] py-[18px] mb-8 border border-[#333]">
        <Ionicons name="logo-google" size={22} color="white" className="mr-3" />
        <Text className="text-white text-[17px] font-semibold ml-2 tracking-wide">Sign in with Google</Text>
      </Pressable>

      <View className="flex-row items-center mb-8">
        <View className="flex-1 h-[1px] bg-[#333]" />
        <Text className="text-[#888] mx-4 font-medium tracking-widest text-xs uppercase">Or register</Text>
        <View className="flex-1 h-[1px] bg-[#333]" />
      </View>

      {/* Name */}
      <View className="mb-6">
        <Text className="text-[#888] text-sm font-medium mb-3 tracking-wide">Name</Text>
        <TextInput 
          className="bg-[#121212] text-white rounded-2xl px-5 py-[18px] border border-[#222] focus:border-[#FFD700] text-base"
          placeholder="Enter your full name"
          placeholderTextColor="#555"
        />
      </View>

      {/* Age */}
      <View className="mb-6">
        <Text className="text-[#888] text-sm font-medium mb-3 tracking-wide">Age</Text>
        <TextInput 
          className="bg-[#121212] text-white rounded-2xl px-5 py-[18px] border border-[#222] focus:border-[#FFD700] text-base"
          placeholder="Enter your age"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
      </View>

      {/* Gender */}
      <View className="mb-8">
        <Text className="text-[#888] text-sm font-medium mb-3 tracking-wide">Gender</Text>
        <View className="flex-row gap-3">
          {['Male', 'Female', 'Other'].map((g) => (
            <Pressable 
              key={g}
              onPress={() => setGender(g)}
              className={`flex-1 rounded-2xl py-4 items-center border ${
                gender === g ? 'bg-[#FFD700] border-[#FFD700]' : 'bg-[#121212] border-[#222]'
              }`}
            >
              <Text className={`font-semibold text-base ${gender === g ? 'text-black' : 'text-white'}`}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Image of Eye */}
      <View className="mb-10">
        <Text className="text-[#888] text-sm font-medium mb-3 tracking-wide">Image of Eye</Text>
        <Pressable className="bg-[#121212] border border-[#333] border-dashed rounded-[24px] py-12 items-center justify-center">
          <View className="bg-[#1A1A1A] rounded-full p-5 mb-4">
            <Ionicons name="camera-outline" size={36} color="#FFD700" />
          </View>
          <Text className="text-white text-base font-medium mb-1 tracking-wide">Tap to open camera</Text>
          <Text className="text-[#666] text-sm">Capture a clear photo of your eye</Text>
        </Pressable>
      </View>

      <Pressable className="bg-[#FFD700] rounded-[30px] py-[18px] items-center mt-2 mb-10">
        <Text className="text-black text-[17px] font-bold tracking-wide">Complete Profile</Text>
      </Pressable>
    </View>
  );
}
