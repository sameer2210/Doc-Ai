import React from 'react';
import { Text, View } from 'react-native';

import { CROP_TIPS } from '../constants/instruction-data';

export function CropGuideCard() {
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(140, 107, 62, 0.25)', // subtle accent
        backgroundColor: 'rgba(12, 19, 32, 0.92)',
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#F7FBFF', marginBottom: 10 }}>
        Crop Tips
      </Text>
      <View style={{ gap: 6 }}>
        {CROP_TIPS.map((tip, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#8FA2C3',
                marginTop: 7,
                marginRight: 8,
              }}
            />
            <Text style={{ fontSize: 13, color: '#D8E7FF', lineHeight: 18, flex: 1 }}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
