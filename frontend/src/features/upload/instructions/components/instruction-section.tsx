import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InstructionCategory } from '../types/instruction.types';
import { InstructionCard } from './instruction-card';

interface InstructionSectionProps {
  category: InstructionCategory;
}

export function InstructionSection({ category }: InstructionSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{category.title}</Text>
        {category.subtitle && <Text style={styles.subtitle}>{category.subtitle}</Text>}
      </View>
      <View style={styles.list}>
        {category.items.map(item => (
          <InstructionCard key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F2F7FF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8FA2C3',
    lineHeight: 20,
  },
  list: {
    gap: 0,
  },
});
