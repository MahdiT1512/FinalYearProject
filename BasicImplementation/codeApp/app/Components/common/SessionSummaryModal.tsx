// Components/common/SessionSummaryModal.tsx
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SessionSummaryData } from "../../context/SessionSummaryContext";

export default function SessionSummaryModal({
  visible,
  summary,
  onClose,
}: {
  visible: boolean;
  summary: SessionSummaryData | null;
  onClose: () => void;
}) {
  if (!summary) return null;

  const xpLabel = summary.xpEarned >= 0 ? "XP Earned" : "XP Change";
  const unlockText =
    summary.unlocked?.length && summary.unlocked.length > 0
      ? summary.unlocked.join(", ")
      : "None";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient colors={["#ffffff", "#eff6ff"]} style={styles.card}>
          <Text style={styles.eyebrow}>Session Complete</Text>
          <Text style={styles.title}>{summary.title}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {summary.xpEarned > 0
                  ? `+${summary.xpEarned}`
                  : summary.xpEarned}
              </Text>
              <Text style={styles.statLabel}>{xpLabel}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {typeof summary.accuracy === "number"
                  ? `${summary.accuracy}%`
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailText}>
              Streak peak: {summary.streakPeak ?? 0}
            </Text>
            <Text style={styles.detailText}>
              Weakest area: {summary.weakestArea ?? "—"}
            </Text>
            <Text style={styles.detailText}>
              Improved area: {summary.improvedArea ?? "—"}
            </Text>
            <Text style={styles.detailText}>Unlocks: {unlockText}</Text>
          </View>

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
  },

  detailCard: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 18,
    padding: 16,
  },

  detailText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },

  button: {
    marginTop: 18,
    backgroundColor: "#111827",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
