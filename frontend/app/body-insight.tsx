import { ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BodyInsightForm from '@/components/assessment/BodyInsightForm';

export default function BodyInsightScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
      <ScrollView contentContainerClassName="px-5 pt-4 pb-10" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B]">Questionnaire</Text>
          <Text className="mt-2 text-3xl font-black text-[#0F172A]">Body Insight Check</Text>
        </View>
        <BodyInsightForm />
      </ScrollView>
    </SafeAreaView>
  );
}
