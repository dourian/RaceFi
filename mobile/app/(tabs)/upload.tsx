import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, Button, Alert } from 'react-native';

export default function UploadScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Upload Run</Text>
      <Text style={styles.body}>Upload a GPX from Strava (placeholder).</Text>
      <Button title="Choose GPX" onPress={() => Alert.alert('Not implemented', 'File picker placeholder')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 14, color: '#555' },
});

