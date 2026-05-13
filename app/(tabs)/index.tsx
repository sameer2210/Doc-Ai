import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Doc AI Frontend</Text>
      <Text style={styles.body}>Expo app is configured and ready to run.</Text>
      <Link href="/modal" style={styles.link}>
        Open modal screen
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  body: {
    fontSize: 16,
    color: '#334155',
  },
  link: {
    fontSize: 16,
    color: '#2563EB',
    marginTop: 10,
  },
});
