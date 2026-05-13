import { StyleSheet, Text, View } from 'react-native';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Architecture Status</Text>
      <Text style={styles.body}>- Feature-first modules scaffolded</Text>
      <Text style={styles.body}>- Query + session providers wired</Text>
      <Text style={styles.body}>- Streaming chat flow seeded</Text>
      <Text style={styles.body}>- Attachment pickers integrated</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 4,
  },
});
