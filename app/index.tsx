import { Text, View, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import RegistrationForm from '../src/components/RegistrationForm';
import ProjectInfo from '../src/components/ProjectInfo';

export default function HomeEntryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <ScrollView contentContainerClassName="px-6 pt-12 pb-20" showsVerticalScrollIndicator={false}>
        <View className="mb-8">
          <Text className="text-[#FFD700] text-sm font-bold tracking-[0.2em] uppercase mb-4">
            Doc AI Platform
          </Text>
          <Text className="text-white text-[48px] font-bold tracking-tight leading-[52px]">
            Intelligence{'\n'}and vision.
          </Text>
          <Text className="text-[#888] text-[18px] mt-6 leading-7 tracking-wide pr-4">
            Next-generation production-grade AI chat platform directly from your device.
          </Text>
        </View>

        <RegistrationForm />

        <View className="rounded-3xl border border-[#2A2A2A] bg-[#101010] p-5 mb-8">
          <Text className="text-[#FFD700] text-xs font-bold tracking-[0.2em] uppercase mb-2">
            Assessment
          </Text>
          <Text className="text-white text-2xl font-bold">Agni-Bala Questionnaire</Text>
          <Text className="text-[#9CA3AF] text-base mt-2 leading-6">
            User se image wale sawaal poochne ke liye dedicated page ready hai.
          </Text>
          <Pressable
            onPress={() => router.push('/agni-bala-assessment')}
            className="mt-4 bg-[#FFD700] rounded-2xl py-4 items-center">
            <Text className="text-black text-base font-bold tracking-wide">Open Questionnaire</Text>
          </Pressable>
        </View>
        
        <ProjectInfo />
        
        <View className="mt-10 items-center justify-center">
          <Text className="text-white text-[90px] font-black tracking-tighter opacity-[0.03]">DocAI</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
