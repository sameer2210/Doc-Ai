import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { InstructionItem } from '../types/instruction.types';

interface InstructionCardProps {
  item: InstructionItem;
}

export function InstructionCard({ item }: InstructionCardProps) {
  const isNegative = item.isNegative;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isNegative ? 'rgba(241, 148, 148, 0.15)' : 'rgba(163, 180, 214, 0.15)',
        backgroundColor: 'rgba(11, 17, 28, 0.88)',
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: isNegative ? 'rgba(241, 148, 148, 0.1)' : 'rgba(124, 216, 192, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons
          name={item.icon ?? (isNegative ? 'close-circle-outline' : 'checkmark-circle-outline')}
          size={20}
          color={isNegative ? '#F19494' : '#7CD8C0'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#F7FAFF', marginBottom: 2 }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 13, color: '#9AA8C7', lineHeight: 18 }}>
          {item.description}
        </Text>
      </View>
    </View>
  );
}
