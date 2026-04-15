import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import lessonsData from "../data/lessons.json";

type Lesson = {
  id: string;
  title: string;
  module?: string;
};

export default function LessonComplete() {
  const { id, nextId, earnedXP } = useLocalSearchParams<{
    id: string;
    nextId?: string;
    earnedXP?: string;
  }>();

  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.84)).current;
  const sparkle = useRef(new Animated.Value(0)).current;

  const lessons = lessonsData as Lesson[];
  const completedLesson = lessons.find((l) => l.id === id);
  const nextLesson = lessons.find((l) => l.id === nextId);

  const parsedXP = useMemo(() => Number(earnedXP ?? "0") || 0, [earnedXP]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle, {
            toValue: 1,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle, {
            toValue: 0.55,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [fade, scale, sparkle]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.Text
          style={[
            styles.sparkleTop,
            {
              opacity: sparkle,
              transform: [
                {
                  scale: sparkle.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1.08],
                  }),
                },
              ],
            },
          ]}
        >
          ✨
        </Animated.Text>

        <Animated.View
          style={[styles.card, { opacity: fade, transform: [{ scale }] }]}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Lesson Complete</Text>
          </View>

          <Text style={styles.title}>🎉 You crushed it</Text>

          <Text style={styles.subtitle}>
            {completedLesson?.title ?? id} is now complete.
          </Text>

          {completedLesson?.module ? (
            <Text style={styles.moduleText}>{completedLesson.module}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Earned</Text>
              <Text style={styles.statValue}>+{parsedXP} XP</Text>
            </View>

            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Next Step</Text>
              <Text style={styles.statValue}>
                {nextLesson ? "Continue" : "Review"}
              </Text>
            </View>
          </View>

          <Text style={styles.bodyText}>
            Great work. Keep momentum high while the lesson is still fresh.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/Components/screens")}
          >
            <Text style={styles.primaryButtonText}>Back to Learn</Text>
          </Pressable>

          {nextLesson ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace(`/learn/${nextLesson.id}`)}
            >
              <Text style={styles.secondaryButtonText}>
                Go to Next Lesson ➜
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/Components/screens")}
            >
              <Text style={styles.secondaryButtonText}>All Done ➜</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#EEF2FF",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  sparkleTop: {
    position: "absolute",
    top: 90,
    fontSize: 34,
  },

  card: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 28,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  badge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 12,
  },

  badgeText: {
    color: "#5B21B6",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
    color: "#111827",
  },

  subtitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
    color: "#374151",
    fontWeight: "700",
  },

  moduleText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 16,
  },

  statPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
  },

  statValue: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 22,
  },

  primaryButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },

  secondaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});
