import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../context/AuthContext";

type StartPath = "lessons" | "syntax" | "profile";

export default function ChoosePathOnboardingScreen() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const finishOnboarding = async (path: StartPath) => {
    if (!user) {
      router.replace("/");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "users", user.uid), {
        hasCompletedOnboarding: true,
        hasSeenWelcomeReward: true,
        preferredStartPath: path,
      });

      if (path === "lessons") {
        router.replace("/Components/screens");
        return;
      }

      if (path === "syntax") {
        router.replace("//Components/screens/syntax");
        return;
      }

      if (path === "profile") {
        router.replace("/User/MyProfile");
        return;
      }

      router.replace("/");
    } catch {
      Alert.alert("Could not finish onboarding", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={["#A0E7E5", "#CDB4FF", "#FFAFCC"]}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Your first move</Text>
          <Text style={styles.title}>Where do you want to begin?</Text>
          <Text style={styles.subtitle}>
            Pick the path that feels best today. This helps CodeSpark feel more
            intentional from the start.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.pathCard,
              pressed && styles.pathPressed,
            ]}
            disabled={saving}
            onPress={() => finishOnboarding("lessons")}
          >
            <Text style={styles.pathEmoji}>📚</Text>
            <View style={styles.pathCopy}>
              <Text style={styles.pathTitle}>Start with Lessons</Text>
              <Text style={styles.pathText}>
                Best if you want the main guided learning path first.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pathCard,
              pressed && styles.pathPressed,
            ]}
            disabled={saving}
            onPress={() => finishOnboarding("syntax")}
          >
            <Text style={styles.pathEmoji}>⚡</Text>
            <View style={styles.pathCopy}>
              <Text style={styles.pathTitle}>Start with Syntax Practice</Text>
              <Text style={styles.pathText}>
                Best if you want a quick warm-up and fast question reps.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pathCard,
              pressed && styles.pathPressed,
            ]}
            disabled={saving}
            onPress={() => finishOnboarding("profile")}
          >
            <Text style={styles.pathEmoji}>👤</Text>
            <View style={styles.pathCopy}>
              <Text style={styles.pathTitle}>Check My Profile First</Text>
              <Text style={styles.pathText}>
                Best if you want to look at your setup, title, and avatar before
                starting.
              </Text>
            </View>
          </Pressable>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>You can switch anytime</Text>
            <Text style={styles.noteText}>
              This only decides your first landing point after onboarding. It
              does not lock you into one route.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pathPressed,
            ]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 36,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 7,
  },

  eyebrow: {
    color: "#6C63FF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 18,
  },

  pathCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  pathPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  pathEmoji: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },

  pathCopy: {
    flex: 1,
  },

  pathTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },

  pathText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
    fontWeight: "600",
  },

  noteCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginTop: 4,
    marginBottom: 18,
  },

  noteTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4338CA",
    marginBottom: 6,
  },

  noteText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4C1D95",
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#EEF2FF",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#4338CA",
    fontSize: 14,
    fontWeight: "900",
  },
});
