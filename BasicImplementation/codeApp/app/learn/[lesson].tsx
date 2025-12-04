import { View, Text, Button, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function LessonPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{id}</Text>
      <Text style={styles.content}>
        This is where the explanation, examples, and diagrams go.
      </Text>

      <Button
        title="Start Exercise"
        onPress={() => router.push(`../exercise/${id}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  content: { fontSize: 16, marginBottom: 30 },
});