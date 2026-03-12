// app/learn/index.tsx
import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { XPContext } from "../../context/XPContext";
import lessonsData from "../../data/lessons.json";
import { useRouter } from "expo-router";
import XPBar from "../../Components/common/XPBar";
import LessonDeck from "../../Components/common/LessonDeck";

type Lesson = {
  id: string;
  title: string;
  content: string;
  exercises: any[];
  module?: string;
};

export default function LearnScreen() {
  const router = useRouter();
  const { level } = useContext(XPContext);

  const lessons = lessonsData as Lesson[];

  const modules = useMemo(() => {
    const map: Record<string, Lesson[]> = {};

    lessons.forEach((lesson) => {
      const moduleName = lesson.module || "General";
      if (!map[moduleName]) map[moduleName] = [];
      map[moduleName].push(lesson);
    });

    return Object.entries(map).map(([moduleName, lessons], index) => ({
      moduleName,
      lessons,
      unlocked: level >= index + 1,
    }));
  }, [lessons, level]);

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* XP BAR ALWAYS VISIBLE */}
          <XPBar />

          {/* Lesson Deck */}
          <LessonDeck />

          <Text style={styles.title}>Learn Units</Text>

          <FlatList
            data={modules}
            keyExtractor={(m) => m.moduleName}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.moduleCard,
                  !item.unlocked && styles.lockedModule,
                ]}
                disabled={!item.unlocked}
                onPress={() =>
                  router.push({
                    pathname: "/learn/module",
                    params: { module: item.moduleName },
                  })
                }
              >
                <Text style={styles.moduleTitle}>{item.moduleName}</Text>
                <Text style={styles.lessonCount}>
                  {item.lessons.length} lessons
                </Text>

                {!item.unlocked && (
                  <Text style={styles.lockText}>
                    🔒 Reach higher level to unlock
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1, padding: 14 },
  title: { fontSize: 28, fontWeight: "700", marginVertical: 12 },
  moduleCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
  },
  lockedModule: { opacity: 0.6, backgroundColor: "#ddd" },
  moduleTitle: { fontSize: 20, fontWeight: "700" },
  lessonCount: { marginTop: 4, color: "#666" },
  lockText: { marginTop: 8, color: "#c43a3a", fontWeight: "700" },
});
