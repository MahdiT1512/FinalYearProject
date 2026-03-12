import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import lessonsData from "../data/lessons.json";
import { XPContext } from "../context/XPContext";
import XPBar from "../Components/common/XPBar";

export default function ModuleScreen() {
  const { module } = useLocalSearchParams<{ module?: string }>();
  const router = useRouter();

  const { completedLessons } = useContext(XPContext);

  const lessons = (lessonsData as any[]).filter(
    (l) => (l.module || "General") === module,
  );

  // safe top padding for Android status bar
  const topPadding =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 16) : 0;

  const handleBack = () => {
    // push to /learn to make navigation deterministic in all cases
    router.push("/Components/screens");
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleBack}
          accessibilityLabel="Back to Learn"
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <Text numberOfLines={1} style={styles.title}>
          {module ?? "Module"}
        </Text>

        {/* placeholder so title stays centered */}
        <View style={styles.backButtonPlaceholder} />
      </View>

      {/* XP bar below header */}
      <View style={styles.xpContainer}>
        <XPBar />
      </View>

      {/* Path */}
      <ScrollView
        contentContainerStyle={styles.path}
        showsVerticalScrollIndicator={false}
      >
        {lessons.map((lesson, index) => {
          const previousLesson = lessons[index - 1];

          const unlocked =
            index === 0 || completedLessons.includes(previousLesson?.id);

          const completed = completedLessons.includes(lesson.id);

          const alignStyle =
            index % 2 === 0 ? styles.leftNode : styles.rightNode;

          return (
            <Pressable
              key={lesson.id}
              style={[
                styles.node,
                alignStyle,
                completed && styles.completedNode,
                !unlocked && styles.lockedNode,
              ]}
              disabled={!unlocked}
              onPress={() => router.push(`/learn/${lesson.id}`)}
            >
              <Text style={styles.nodeText}>
                {completed ? "✓" : !unlocked ? "🔒" : index + 1}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    height: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },

  backText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 8,
  },

  xpContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },

  path: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  node: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: "#A0E7E5",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 18,
    elevation: 2,
  },

  leftNode: {
    alignSelf: "flex-start",
    marginLeft: 0,
  },

  rightNode: {
    alignSelf: "flex-end",
    marginRight: 0,
  },

  completedNode: {
    backgroundColor: "#4CAF50",
  },

  lockedNode: {
    backgroundColor: "#ccc",
    opacity: 0.8,
  },

  nodeText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0c2733",
  },
});
