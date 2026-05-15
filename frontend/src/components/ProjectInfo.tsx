import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProjectInfo() {
  return (
    <View className="w-full mt-6 mb-12">
      <View className="h-[1px] bg-[#222] w-full mb-12" />

      <Text className="text-white text-[32px] font-bold tracking-tight mb-8">
        Capabilities.
      </Text>

      <View className="flex-row flex-wrap justify-between">
        <View className="w-[48%] mb-8">
          <Ionicons name="chatbubbles-outline" size={24} color="#9A723B" style={{ marginBottom: 12 }} />
          <Text className="text-white font-semibold text-base mb-2 tracking-wide">Multimodal Chat</Text>
          <Text className="text-[#888] text-sm leading-5">
            Interact seamlessly with text prompts, images, and complex documents all in one place.
          </Text>
        </View>
        
        <View className="w-[48%] mb-8">
          <Ionicons name="flash-outline" size={24} color="#9A723B" style={{ marginBottom: 12 }} />
          <Text className="text-white font-semibold text-base mb-2 tracking-wide">Real-time Streams</Text>
          <Text className="text-[#888] text-sm leading-5">
            Experience zero-latency rendering with live streaming responses from our backend.
          </Text>
        </View>

        <View className="w-[48%] mb-8">
          <Ionicons name="code-slash-outline" size={24} color="#9A723B" style={{ marginBottom: 12 }} />
          <Text className="text-white font-semibold text-base mb-2 tracking-wide">Markdown Support</Text>
          <Text className="text-[#888] text-sm leading-5">
            Full support for complex code blocks, syntax highlighting, and markdown rendering.
          </Text>
        </View>

        <View className="w-[48%] mb-8">
          <Ionicons name="shield-checkmark-outline" size={24} color="#9A723B" style={{ marginBottom: 12 }} />
          <Text className="text-white font-semibold text-base mb-2 tracking-wide">Enterprise Security</Text>
          <Text className="text-[#888] text-sm leading-5">
            Powered by SecureStore token management and robust OAuth architecture.
          </Text>
        </View>
      </View>
      
      <View className="h-[1px] bg-[#222] w-full my-6" />
      
      <Text className="text-white text-[32px] font-bold tracking-tight mb-8 mt-4">
        Architecture.
      </Text>
      
      <View className="bg-[#121212] rounded-3xl p-6 border border-[#222]">
         <View className="flex-row items-center mb-4">
           <Ionicons name="server-outline" size={24} color="white" style={{ marginRight: 12 }} />
           <Text className="text-white font-semibold text-lg tracking-wide">Scalable ML Infrastructure</Text>
         </View>
         <Text className="text-[#888] text-[15px] leading-6">
           Our specialized backend handles all heavy lifting server-side, ensuring your device remains fast and battery-efficient while delivering production-grade AI responses.
         </Text>
      </View>
    </View>
  );
}
