import React from "react";
import {
  View,
  Button,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Markdown from "react-native-markdown-display";
import lessonsData from "../data/lessons.json";

type Exercise = {
  type: "mc" | "code";
  text: string;
  options?: string[];
  correct?: number;
  prompt?: string;
  answer?: string;
  xp: number;
};

type Lesson = {
  id: string;
  title: string;
  content: string;
  exercises: Exercise[];
};

export default function LessonPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const lesson = (lessonsData as Lesson[]).find((l) => l.id === id);

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Markdown style={markdownStyles}>Lesson not found</Markdown>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Back Button */}
      <Pressable
        style={styles.backButton}
        onPress={() => router.push("/Components/screens")}
      >
        <Text style={styles.backText}>✕</Text>
      </Pressable>

      <View style={styles.card}>
        <Markdown style={markdownStyles}>{lesson.content}</Markdown>
        <View style={{ marginTop: 20 }}>
          <Button
            title="Start Exercise"
            color="#FF6B6B"
            onPress={() => router.push(`/exercise/${lesson.id}`)}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const markdownStyles = {
  body: { fontSize: 16, lineHeight: 26, color: "#333" },
  heading1: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 14,
    color: "#FF6B6B",
  },
  heading2: {
    fontSize: 24,
    fontWeight: "700",
    marginVertical: 10,
    color: "#4ECDC4",
  },
  heading3: {
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 6,
    color: "#1A535C",
  },
  code_block: {
    backgroundColor: "#FFE6E6",
    padding: 14,
    borderRadius: 12,
    fontFamily: "monospace",
    marginVertical: 10,
  },
  bullet_list: { marginVertical: 8, marginLeft: 20 },
  list_item: { fontSize: 16, lineHeight: 24, marginVertical: 4, color: "#555" },
  strong: { color: "#FF6B6B", fontWeight: "bold" },
  em: { fontStyle: "italic", color: "#4ECDC4" },
  link: { color: "#1A535C", textDecorationLine: "underline" },
  blockquote: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFA500",
    marginVertical: 10,
    borderRadius: 8,
  },
  inline_code: {
    backgroundColor: "#FFE6E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 15,
    color: "blue",
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F0F8FF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  backButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "#FF6B6B",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
