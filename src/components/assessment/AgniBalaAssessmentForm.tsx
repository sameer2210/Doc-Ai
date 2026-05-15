import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type AgniType = 'mandagni' | 'vishamagni' | 'samagni' | 'tikshagni';

type AssessmentQuestion = {
  id: number;
  prompt: string;
  options: Record<AgniType, string>;
};

const AGNI_LABELS: Record<AgniType, string> = {
  mandagni: 'I (Mandagni)',
  vishamagni: 'II (Vishamagni)',
  samagni: 'III (Samagni)',
  tikshagni: 'IV (Tikshagni)',
};

const QUESTIONS: AssessmentQuestion[] = [
  {
    id: 1,
    prompt: 'What option describes best your ability to digest food?',
    options: {
      mandagni:
        'I am not able to digest food which is light in nature (e.g. mung dal, khichadi) even when it is taken in less quantity.',
      vishamagni:
        'My ability to digest food keeps varying. I am able to digest food sometimes and sometimes I am unable to digest food.',
      samagni:
        'I am able to digest all sorts of food substances which I usually have in my diet in appropriate quantity.',
      tikshagni:
        'I am able to digest food that may be either light (e.g. khichadi) or heavy (e.g. chana dal, mutton) in nature even in large quantities easily.',
    },
  },
  {
    id: 2,
    prompt: 'Once you have had your meals, after how many hours do you again feel like eating?',
    options: {
      mandagni: 'I would like to eat after more than 6 to 8 hours of having food (delayed digestion).',
      vishamagni:
        'My time of eating food is not fixed; I can take food at any time after having meals (improper digestion).',
      samagni: 'I would like to have food after 6 to 8 hours of having food (proper digestion).',
      tikshagni: 'I would like to have food in less than 6 hours of having food (fast digestion).',
    },
  },
  {
    id: 3,
    prompt:
      'What effect occurs on digestion due to disturbance in lifestyle (e.g. irregular diet, disturbed sleep, emotional disturbances)?',
    options: {
      mandagni: 'Digestion gets disturbed due to slight variation in lifestyle.',
      vishamagni: 'Digestion gets disturbed due to disturbed lifestyle.',
      samagni: 'Digestion is not affected much.',
      tikshagni: 'Digestion develops tolerance against variation in lifestyle.',
    },
  },
  {
    id: 4,
    prompt:
      'How frequently do you have your meals (equivalent to 2 to 3 chapati, 1 cup dal, 1 small bowl of rice, 1 small bowl sabji) in a day?',
    options: {
      mandagni: 'I have less than 2 meals per day.',
      vishamagni: 'I have meals frequency sometimes more than 2 and sometimes less than 2 per day.',
      samagni: 'I usually have 2 to 3 meals per day.',
      tikshagni: 'I have more than 3 meals per day.',
    },
  },
];

export default function AgniBalaAssessmentForm() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState('');
  const [answers, setAnswers] = useState<Record<number, AgniType | undefined>>({});

  const totalAnswered = useMemo(
    () => QUESTIONS.filter((question) => answers[question.id] !== undefined).length,
    [answers]
  );

  const onSelectAnswer = (questionId: number, choice: AgniType) => {
    setAnswers((previous) => ({ ...previous, [questionId]: choice }));
  };

  return (
    <View className="w-full">
      <View className="rounded-3xl border border-[#E2E8F0] bg-white p-5">
        <Text className="text-xs font-bold uppercase tracking-[0.2em] text-[#475569]">IMS BHU</Text>
        <Text className="mt-2 text-2xl font-bold text-[#0F172A]">Agni-Bala Assessment</Text>
        <Text className="mt-2 text-sm leading-6 text-[#475569]">
          Fill basic details and select one option for each question.
        </Text>

        <View className="mt-6 gap-3">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-[#CBD5E1] px-4 py-3 text-[#0F172A]"
          />
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            className="rounded-xl border border-[#CBD5E1] px-4 py-3 text-[#0F172A]"
          />
          <TextInput
            value={sex}
            onChangeText={setSex}
            placeholder="Sex"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-[#CBD5E1] px-4 py-3 text-[#0F172A]"
          />
          <TextInput
            value={height}
            onChangeText={setHeight}
            placeholder="Height"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-[#CBD5E1] px-4 py-3 text-[#0F172A]"
          />
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="Weight"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            className="rounded-xl border border-[#CBD5E1] px-4 py-3 text-[#0F172A]"
          />
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-[#0F172A] px-4 py-3">
        <Text className="text-sm font-semibold text-white">
          Answered: {totalAnswered}/{QUESTIONS.length}
        </Text>
      </View>

      <View className="mt-4 gap-4">
        {QUESTIONS.map((question) => (
          <View key={question.id} className="rounded-3xl border border-[#E2E8F0] bg-white p-5">
            <Text className="text-lg font-bold leading-7 text-[#0F172A]">
              Q{question.id}. {question.prompt}
            </Text>

            <View className="mt-4 gap-3">
              {(Object.keys(AGNI_LABELS) as AgniType[]).map((optionKey) => {
                const isSelected = answers[question.id] === optionKey;

                return (
                  <Pressable
                    key={optionKey}
                    onPress={() => onSelectAnswer(question.id, optionKey)}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected ? 'border-[#1D4ED8] bg-[#DBEAFE]' : 'border-[#CBD5E1] bg-[#F8FAFC]'
                    }`}>
                    <Text className="text-sm font-bold text-[#1E293B]">{AGNI_LABELS[optionKey]}</Text>
                    <Text className="mt-1 text-sm leading-6 text-[#334155]">
                      {question.options[optionKey]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
