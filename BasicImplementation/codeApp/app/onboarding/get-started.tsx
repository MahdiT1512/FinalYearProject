import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

export default function GetStartedOnboardingScreen() {
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
          <Text style={styles.eyebrow}>CodeSpark tour</Text>
          <Text style={styles.title}>Here’s how progress works</Text>
          <Text style={styles.subtitle}>
            You do not need to learn every system immediately. These are the
            parts of CodeSpark you will use most often.
          </Text>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEmoji}>📚</Text>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Lessons build your base</Text>
              <Text style={styles.sectionText}>
                Work through guided Python units step by step. This is the main
                route for structured learning.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEmoji}>🧠</Text>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>
                Lesson deck protects memory
              </Text>
              <Text style={styles.sectionText}>
                Review older material so progress does not become shallow. The
                deck is there to keep knowledge alive.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEmoji}>⚡</Text>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Syntax sharpens recall</Text>
              <Text style={styles.sectionText}>
                Short randomized sessions help you lock in keywords, operators,
                and patterns faster.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEmoji}>🎁</Text>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>
                Daily reward ≠ daily goals
              </Text>
              <Text style={styles.sectionText}>
                Logging in gives you a daily login reward. Daily goals are a
                separate system with their own progress and payouts.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionEmoji}>🏆</Text>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>
                XP and streaks show momentum
              </Text>
              <Text style={styles.sectionText}>
                Keep showing up, answer well, and clear reviews to keep your
                pace strong.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Best first-day loop</Text>
            <Text style={styles.tipText}>
              Do one lesson → clear any review cards → try one short syntax
              session.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/onboarding/choose-path")}
          >
            <Text style={styles.primaryButtonText}>
              Choose My Starting Path
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
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

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  sectionEmoji: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },

  sectionCopy: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },

  sectionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
    fontWeight: "600",
  },

  tipCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginTop: 4,
    marginBottom: 18,
  },

  tipTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4338CA",
    marginBottom: 6,
  },

  tipText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4C1D95",
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryButton: {
    marginTop: 12,
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

  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
