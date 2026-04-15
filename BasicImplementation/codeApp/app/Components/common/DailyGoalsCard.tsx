import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useDailyGoals } from "../../context/dailyGoalsContext";

export default function DailyGoalsCard() {
  const { goals, completeCount } = useDailyGoals();

  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.96)", "rgba(237,233,254,0.94)"]}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Daily Goals</Text>
          <Text style={styles.title}>Today’s Targets</Text>
        </View>

        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>
            {completeCount}/{goals.length}
          </Text>
        </View>
      </View>

      {goals.map((goal) => {
        const ratio = goal.target === 0 ? 0 : goal.progress / goal.target;

        return (
          <View key={goal.id} style={styles.goalWrap}>
            <View style={styles.goalTopRow}>
              <Text style={styles.goalLabel}>{goal.label}</Text>
              <Text style={styles.goalValue}>
                {goal.progress}/{goal.target}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(ratio * 100, 100)}%` },
                  goal.complete && styles.progressFillComplete,
                ]}
              />
            </View>

            <Text style={styles.goalMeta}>
              {goal.complete
                ? "Completed ✅"
                : `Reward: ${goal.rewardXP} bonus XP`}
            </Text>
          </View>
        );
      })}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6D28D9",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  title: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },

  progressBadge: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  progressBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  goalWrap: {
    marginTop: 12,
  },

  goalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  goalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginRight: 8,
  },

  goalValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4B5563",
  },

  progressTrack: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#8B5CF6",
  },

  progressFillComplete: {
    backgroundColor: "#10B981",
  },

  goalMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
});
