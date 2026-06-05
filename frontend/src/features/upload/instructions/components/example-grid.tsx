import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ExampleGridProps {
  type: 'good' | 'bad' | 'crop';
}

export function ExampleGrid({ type }: ExampleGridProps) {
  // TODO: Add real assets later. Currently using local asset placeholders.
  // The containers are properly sized and styled to fit into the app.

  const isGood = type === 'good';
  const isCrop = type === 'crop';

  const borderColor = isCrop ? 'rgba(124, 216, 192, 0.3)' : isGood ? 'rgba(124, 216, 192, 0.3)' : 'rgba(241, 148, 148, 0.3)';
  const bgColor = isCrop ? 'rgba(124, 216, 192, 0.05)' : isGood ? 'rgba(124, 216, 192, 0.05)' : 'rgba(241, 148, 148, 0.05)';
  const labelColor = isCrop ? '#7CD8C0' : isGood ? '#7CD8C0' : '#F19494';
  const labelText = isCrop ? 'CROP EXAMPLE' : isGood ? 'GOOD EXAMPLES' : 'BAD EXAMPLES';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: labelColor }]}>{labelText}</Text>
      <View style={styles.grid}>
        <View style={[styles.placeholder, { borderColor, backgroundColor: bgColor }]}>
          <Text style={[styles.placeholderText, { color: labelColor }]}>Image 1</Text>
        </View>
        {!isCrop && (
          <View style={[styles.placeholder, { borderColor, backgroundColor: bgColor }]}>
            <Text style={[styles.placeholderText, { color: labelColor }]}>Image 2</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  placeholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
});
