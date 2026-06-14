import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SectionHeader } from './section-header';
import { SmartSuggestionChip } from './smart-suggestion-chip';
import { SMART_SUGGESTIONS } from '../constants/smart-suggestions';
import type { SmartSuggestion } from '../types/home.types';

export const SmartSuggestionsSection = React.memo(() => {
  const handlePressSuggestion = useCallback(() => {
    router.push('/(tabs)/chat');
  }, []);

  const renderItem = useCallback(({ item }: { readonly item: SmartSuggestion }) => (
    <SmartSuggestionChip
      suggestion={item}
      onPress={handlePressSuggestion}
    />
  ), [handlePressSuggestion]);

  return (
    <View style={styles.container}>
      <SectionHeader title="Smart Suggestions" style={styles.sectionHeader} />
      <FlatList
        data={SMART_SUGGESTIONS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
});

SmartSuggestionsSection.displayName = 'SmartSuggestionsSection';

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  listContent: {
    paddingRight: 20,
  },
});
