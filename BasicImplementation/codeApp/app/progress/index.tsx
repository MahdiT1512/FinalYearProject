import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import XPBar from "../Components/common/XPBar";
import { XPContext } from "../context/XPContext";
import { useDailyGoals } from "../context/dailyGoalsContext";

//A screen that contains users progress related stats all in one
// Also has access to daily goal features
export default function ProgressScreen() {
  const router = useRouter();
  const {
    streakCount,
    hearts,
    maxHearts,
    secondsUntilNextHeart,
    pendingReviewCount,
    getLessonXPModifier,
    canClaimDailyReward,
    claimDailyReward,
    weeklyXP,
    monthlyXP,
  } = useContext(XPContext);

  const {
    goals,
    completeCount,
    allComplete,
    allGoalsRewardXP,
    allGoalsRewardClaimed,
    canClaimAllGoalsReward,
    claimGoalReward,
    claimAllGoalsReward,
    activity,
  } = useDailyGoals();

  const [claimingDailyReward, setClaimingDailyReward] = useState(false);
  const [claimingGoalId, setClaimingGoalId] = useState<string | null>(null);
  const [claimingAllBonus, setClaimingAllBonus] = useState(false);

  const xpModifier = getLessonXPModifier();

  //Claims the daily log in reward, and prevents the user from claiming more than once daily
  const handleClaimDailyReward = async () => {
    try {
      setClaimingDailyReward(true);
      const reward = await claimDailyReward();

      if (reward <= 0) {
        Alert.alert(
          "Already claimed",
          "You already claimed today’s login reward.",
        );
        return;
      }

      Alert.alert("Reward claimed", `You earned ${reward} XP.`);
    } finally {
      setClaimingDailyReward(false);
    }
  };

  //Claims an individual daily goal XP reward
  const handleClaimGoalReward = async (goalId: string) => {
    try {
      setClaimingGoalId(goalId);
      const reward = await claimGoalReward(goalId as any);

      if (reward <= 0) {
        Alert.alert(
          "Reward unavailable",
          "That goal reward has already been claimed or is not ready yet.",
        );
        return;
      }

      Alert.alert("Goal reward claimed", `You earned ${reward} XP.`);
    } finally {
      setClaimingGoalId(null);
    }
  };

  //Claims all extra bonus XP after daily goals completed
  const handleClaimAllGoalsReward = async () => {
    try {
      setClaimingAllBonus(true);
      const reward = await claimAllGoalsReward();

      if (reward <= 0) {
        Alert.alert(
          "Bonus unavailable",
          "The all-goals bonus has already been claimed or all goals have not been met yet.",
        );
        return;
      }

      Alert.alert("Daily bonus claimed", `You earned ${reward} XP.`);
    } finally {
      setClaimingAllBonus(false);
    }
  };

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <View style={styles.topXpWrap}>
              <XPBar disableNavigation />
            </View>

            <Pressable style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Progress Hub</Text>
            <Text style={styles.heroTitle}>
              Daily goals, rewards, and run health
            </Text>
            <Text style={styles.heroSubtitle}>
              This is your hub for your daily progress and streaks. Additional
              info such as hearts and XP is also available here too.
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{completeCount}/3</Text>
                <Text style={styles.heroStatLabel}>Goals Complete</Text>
              </View>

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{streakCount}</Text>
                <Text style={styles.heroStatLabel}>Day Streak</Text>
              </View>

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {Math.round(xpModifier * 100)}%
                </Text>
                <Text style={styles.heroStatLabel}>Lesson XP</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Login Reward</Text>
            <Text style={styles.cardText}>
              Keep your daily login streak alive! Earn an XP reward for showing
              up.
            </Text>

            <View style={styles.infoPillRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Status</Text>
                <Text style={styles.infoPillValue}>
                  {canClaimDailyReward() ? "Ready" : "Claimed"}
                </Text>
              </View>

              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Streak Boost</Text>
                <Text style={styles.infoPillValue}>{streakCount} days</Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                !canClaimDailyReward() && styles.buttonDisabled,
              ]}
              disabled={!canClaimDailyReward() || claimingDailyReward}
              onPress={handleClaimDailyReward}
            >
              <Text style={styles.primaryButtonText}>
                {claimingDailyReward
                  ? "Claiming..."
                  : canClaimDailyReward()
                    ? "Claim Daily Login Reward"
                    : "Already Claimed Today"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Goals</Text>
            <Text style={styles.cardText}>
              Goal rewards must be claimed individually once completed.
            </Text>

            {goals.map((goal) => {
              const percent =
                goal.target > 0
                  ? Math.min((goal.progress / goal.target) * 100, 100)
                  : 0;

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalTopRow}>
                    <View style={styles.goalTitleWrap}>
                      <Text style={styles.goalTitle}>{goal.label}</Text>
                      <Text style={styles.goalMeta}>
                        {goal.progress}/{goal.target}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.goalStatusPill,
                        goal.claimed
                          ? styles.goalStatusClaimed
                          : goal.claimable
                            ? styles.goalStatusReady
                            : goal.complete
                              ? styles.goalStatusComplete
                              : styles.goalStatusLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.goalStatusText,
                          goal.claimed
                            ? styles.goalStatusClaimedText
                            : goal.claimable
                              ? styles.goalStatusReadyText
                              : goal.complete
                                ? styles.goalStatusCompleteText
                                : styles.goalStatusLockedText,
                        ]}
                      >
                        {goal.claimed
                          ? "Claimed"
                          : goal.claimable
                            ? "Ready"
                            : goal.complete
                              ? "Complete"
                              : "In Progress"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${percent}%` }]}
                    />
                  </View>

                  <View style={styles.goalBottomRow}>
                    <Text style={styles.goalReward}>
                      Reward: {goal.rewardXP} XP
                    </Text>

                    <Pressable
                      style={[
                        styles.goalClaimButton,
                        !goal.claimable && styles.goalClaimButtonDisabled,
                      ]}
                      disabled={!goal.claimable || claimingGoalId === goal.id}
                      onPress={() => handleClaimGoalReward(goal.id)}
                    >
                      <Text style={styles.goalClaimButtonText}>
                        {claimingGoalId === goal.id
                          ? "Claiming..."
                          : goal.claimed
                            ? "Claimed"
                            : goal.claimable
                              ? "Claim"
                              : "Locked"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>All Goals Bonus</Text>
            <Text style={styles.cardText}>
              Complete your goals for the day, then claim a special bonus!
            </Text>

            <View style={styles.infoPillRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Completion</Text>
                <Text style={styles.infoPillValue}>
                  {allComplete ? "All Done" : `${completeCount}/3`}
                </Text>
              </View>

              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Bonus</Text>
                <Text style={styles.infoPillValue}>{allGoalsRewardXP} XP</Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                !canClaimAllGoalsReward && styles.buttonDisabled,
              ]}
              disabled={!canClaimAllGoalsReward || claimingAllBonus}
              onPress={handleClaimAllGoalsReward}
            >
              <Text style={styles.primaryButtonText}>
                {claimingAllBonus
                  ? "Claiming..."
                  : allGoalsRewardClaimed
                    ? "Bonus Claimed"
                    : canClaimAllGoalsReward
                      ? `Claim ${allGoalsRewardXP} XP Bonus`
                      : "Complete All Goals First"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Run Health</Text>

            <View style={styles.infoPillRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Hearts</Text>
                <Text style={styles.infoPillValue}>
                  {hearts}/{maxHearts}
                </Text>
              </View>

              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Reviews Waiting</Text>
                <Text style={styles.infoPillValue}>{pendingReviewCount}</Text>
              </View>
            </View>

            <View style={styles.infoPillRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Weekly XP</Text>
                <Text style={styles.infoPillValue}>{weeklyXP}</Text>
              </View>

              <View style={styles.infoPill}>
                <Text style={styles.infoPillLabel}>Monthly XP</Text>
                <Text style={styles.infoPillValue}>{monthlyXP}</Text>
              </View>
            </View>

            <Text style={styles.cardFootnote}>
              {secondsUntilNextHeart !== null
                ? `Next heart in about ${secondsUntilNextHeart} seconds.`
                : "Your hearts are full right now."}
            </Text>

            <Text style={styles.cardFootnote}>
              Today: {activity.lessonsCompleted} lesson,{" "}
              {activity.syntaxAnswered} syntax answers,{" "}
              {activity.projectsCompleted} project completions,{" "}
              {activity.xpEarned} XP earned.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    padding: 16,
    paddingBottom: 36,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  topXpWrap: {
    flex: 1,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  heroTitle: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#4B5563",
    fontWeight: "600",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  heroStat: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },

  heroStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  heroStatLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  cardText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
    fontWeight: "600",
  },

  infoPillRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  infoPill: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
  },

  infoPillLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },

  infoPillValue: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  primaryButton: {
    marginTop: 16,
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  buttonDisabled: {
    backgroundColor: "#C7C6FF",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  goalCard: {
    marginTop: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
  },

  goalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  goalTitleWrap: {
    flex: 1,
  },

  goalTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  goalMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  goalStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  goalStatusReady: {
    backgroundColor: "#FEF3C7",
  },

  goalStatusComplete: {
    backgroundColor: "#E0F2FE",
  },

  goalStatusClaimed: {
    backgroundColor: "#DCFCE7",
  },

  goalStatusLocked: {
    backgroundColor: "#F3F4F6",
  },

  goalStatusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  goalStatusReadyText: {
    color: "#92400E",
  },

  goalStatusCompleteText: {
    color: "#075985",
  },

  goalStatusClaimedText: {
    color: "#166534",
  },

  goalStatusLockedText: {
    color: "#6B7280",
  },

  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 999,
  },

  goalBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  goalReward: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#4B5563",
  },

  goalClaimButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  goalClaimButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },

  goalClaimButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },

  cardFootnote: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    fontWeight: "700",
  },
});
