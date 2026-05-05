import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { XPContext } from "../../context/XPContext";
import lessonsData from "../../data/lessons.json";
import { useRouter } from "expo-router";
import XPBar from "../../Components/common/XPBar";
import LessonDeck from "../../Components/common/LessonDeck";
import ProfileButton from "../../Components/common/ProfileButton";

type Lesson = {
  id: string;
  title: string;
  content: string;
  exercises: any[];
  module?: string;
};

type ModuleCard = {
  moduleName: string;
  lessons: Lesson[];
  unlocked: boolean;
};

//The main app screen when opened after login, showing the users progress, pending reviews and
// allowing then access to the different unlocked units
export default function LearnScreen() {
  const router = useRouter();

  const {
    level,
    pendingReviewCount,
    getLessonXPModifier,
    completedLessons,
    streakCount,
    hearts,
    secondsUntilNextHeart,
    canClaimDailyReward,
    claimDailyReward,
  } = useContext(XPContext);

  const [dailyModalVisible, setDailyModalVisible] = useState(false);
  const [dailyRewardEarned, setDailyRewardEarned] = useState(0);

  const lessons = lessonsData as Lesson[];
  const xpModifier = getLessonXPModifier();

  //Groups lessons by their unit and determines if unit is unlocked based on the users progression
  const modules = useMemo<ModuleCard[]>(() => {
    const map: Record<string, Lesson[]> = {};

    lessons.forEach((lesson) => {
      const moduleName = lesson.module || "General";
      if (!map[moduleName]) map[moduleName] = [];
      map[moduleName].push(lesson);
    });

    return Object.entries(map).map(([moduleName, moduleLessons], index) => ({
      moduleName,
      lessons: moduleLessons,
      unlocked: level >= index + 1,
    }));
  }, [lessons, level]);

  //Determines severity of review backlog to encourage user to complete pending reviews
  const getPressureLabel = () => {
    if (pendingReviewCount >= 10) {
      return { text: "Heavy review backlog", color: "#b42318" };
    }
    if (pendingReviewCount >= 6) {
      return { text: "Review pressure rising", color: "#d97706" };
    }
    if (pendingReviewCount >= 3) {
      return { text: "A few reviews waiting", color: "#b7791f" };
    }
    return { text: "You’re in a good rhythm", color: "#15803d" };
  };

  const pressure = getPressureLabel();

  const handleClaimDailyReward = async () => {
    const reward = await claimDailyReward();

    if (reward <= 0) {
      Alert.alert(
        "Already claimed",
        "You already claimed today’s daily reward.",
      );
      return;
    }

    setDailyRewardEarned(reward);
    setDailyModalVisible(true);
  };

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <FlatList
            data={modules}
            keyExtractor={(item) => item.moduleName}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <>
                <View style={styles.infoRow}>
                  <View style={styles.xpWrap}>
                    <XPBar />
                  </View>

                  <View style={styles.profileWrap}>
                    <ProfileButton />
                  </View>
                </View>

                <View style={styles.heroCard}>
                  <Text style={styles.heroEyebrow}>Learning Dashboard</Text>
                  <Text style={styles.heroTitle}>
                    Keep moving, but review smart.
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Your lesson deck helps stop rushed progress and keeps old
                    topics alive while you learn new ones.
                  </Text>

                  <View style={styles.heroStatsRow}>
                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>
                        {pendingReviewCount}
                      </Text>
                      <Text style={styles.heroStatLabel}>Reviews</Text>
                    </View>

                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>
                        {Math.round(xpModifier * 100)}%
                      </Text>
                      <Text style={styles.heroStatLabel}>Lesson XP</Text>
                    </View>

                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>{level}</Text>
                      <Text style={styles.heroStatLabel}>Level</Text>
                    </View>
                  </View>

                  <View style={styles.secondaryStatsRow}>
                    <View style={styles.secondaryCard}>
                      <Text style={styles.secondaryLabel}>🔥 Streak</Text>
                      <Text style={styles.secondaryValue}>
                        {streakCount} days
                      </Text>
                    </View>

                    <View style={styles.secondaryCard}>
                      <Text style={styles.secondaryLabel}>❤️ Hearts</Text>
                      <Text style={styles.secondaryValue}>{hearts}/5</Text>
                      {secondsUntilNextHeart !== null ? (
                        <Text style={styles.secondaryHint}>
                          +1 in {secondsUntilNextHeart}s
                        </Text>
                      ) : (
                        <Text style={styles.secondaryHint}>Full</Text>
                      )}
                    </View>

                    <Pressable
                      style={[
                        styles.secondaryCard,
                        canClaimDailyReward()
                          ? styles.dailyReadyCard
                          : styles.dailyClaimedCard,
                      ]}
                      onPress={handleClaimDailyReward}
                    >
                      <Text style={styles.secondaryLabel}>🎁 Daily</Text>
                      <Text style={styles.secondaryValue}>
                        {canClaimDailyReward() ? "Claim" : "Claimed"}
                      </Text>
                      <Text style={styles.secondaryHint}>
                        {canClaimDailyReward()
                          ? "Tap to collect"
                          : "Come back tomorrow"}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.progressShortcut,
                      pressed && styles.progressShortcutPressed,
                    ]}
                    onPress={() => router.push("/progress")}
                  >
                    <Text style={styles.progressShortcutTitle}>
                      📈 Daily Goals & Progress
                    </Text>
                    <Text style={styles.progressShortcutText}>
                      View your goal rewards, claim completed dailies, and check
                      your overall stats.
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.deckBanner}>
                  <View style={styles.deckBannerTopRow}>
                    <Text style={styles.deckBannerTitle}>
                      📚 {pendingReviewCount} review
                      {pendingReviewCount === 1 ? "" : "s"} waiting
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${pressure.color}18` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: pressure.color },
                        ]}
                      >
                        {pressure.text}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.deckBannerSubtitle}>
                    Clear lesson deck reviews to protect your new lesson rewards
                    and review previous basics.
                  </Text>

                  {xpModifier < 1 ? (
                    <Text style={styles.deckBannerPenalty}>
                      ⚠️ New lesson XP currently reduced to{" "}
                      {Math.round(xpModifier * 100)}%
                    </Text>
                  ) : (
                    <Text style={styles.deckBannerBonus}>
                      ✅ Full lesson XP active
                    </Text>
                  )}
                </View>

                <LessonDeck />

                <View style={styles.sectionHeader}>
                  <Text style={styles.title}>Learn Units</Text>
                  <Text style={styles.sectionSubtitle}>
                    Progress through units one by one.
                  </Text>
                </View>
              </>
            }
            renderItem={({ item }) => {
              const completedCount = item.lessons.filter((lesson) =>
                completedLessons.includes(lesson.id),
              ).length;
              const totalCount = item.lessons.length;
              const progress =
                totalCount > 0
                  ? Math.round((completedCount / totalCount) * 100)
                  : 0;

              return (
                <TouchableOpacity
                  style={[
                    styles.moduleCard,
                    !item.unlocked && styles.lockedModule,
                  ]}
                  disabled={!item.unlocked}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/learn/module",
                      params: { module: item.moduleName },
                    })
                  }
                >
                  <View style={styles.moduleTopRow}>
                    <Text style={styles.moduleTitle}>{item.moduleName}</Text>

                    <View
                      style={[
                        styles.moduleStatusPill,
                        item.unlocked
                          ? styles.moduleUnlockedPill
                          : styles.moduleLockedPill,
                      ]}
                    >
                      <Text
                        style={[
                          styles.moduleStatusText,
                          item.unlocked
                            ? styles.moduleUnlockedText
                            : styles.moduleLockedText,
                        ]}
                      >
                        {item.unlocked ? "Unlocked" : "Locked"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.lessonCount}>
                    {item.lessons.length} lessons
                  </Text>

                  <View style={styles.progressMetaRow}>
                    <Text style={styles.progressMetaText}>
                      {completedCount}/{totalCount} completed
                    </Text>
                    <Text style={styles.progressMetaText}>{progress}%</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${progress}%` }]}
                    />
                  </View>

                  {!item.unlocked && (
                    <Text style={styles.lockText}>
                      🔒 Reach higher level to unlock
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <Modal visible={dailyModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Daily Reward Claimed</Text>
              <Text style={styles.modalText}>
                You earned {dailyRewardEarned} XP.
              </Text>
              <Text style={styles.modalSubText}>
                Your streak helps boost your daily reward.
              </Text>

              <Pressable
                style={styles.modalButton}
                onPress={() => setDailyModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Nice</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  listContent: {
    paddingBottom: 36,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },

  xpWrap: {
    flex: 1,
  },

  profileWrap: {
    width: 48,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 12,
  },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
  },

  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#4b5563",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  heroStatPill: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },

  heroStatNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  heroStatLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
  },

  secondaryStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  secondaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
  },

  dailyReadyCard: {
    borderWidth: 1.5,
    borderColor: "#6C63FF",
  },

  dailyClaimedCard: {
    opacity: 0.8,
  },

  secondaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  secondaryValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  secondaryHint: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },

  progressShortcut: {
    marginTop: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },

  progressShortcutPressed: {
    opacity: 0.92,
  },

  progressShortcutTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#312E81",
  },

  progressShortcutText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#4338CA",
    fontWeight: "700",
  },

  deckBanner: {
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },

  deckBannerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  deckBannerTitle: {
    fontWeight: "900",
    fontSize: 15,
    color: "#222",
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  deckBannerSubtitle: {
    marginTop: 6,
    color: "#555",
    fontSize: 12,
    lineHeight: 18,
  },

  deckBannerPenalty: {
    marginTop: 8,
    color: "#c43a3a",
    fontWeight: "900",
    fontSize: 12,
  },

  deckBannerBonus: {
    marginTop: 8,
    color: "#198754",
    fontWeight: "900",
    fontSize: 12,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 13,
  },

  moduleCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  lockedModule: {
    opacity: 0.65,
    backgroundColor: "#e5e7eb",
  },

  moduleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  moduleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 10,
  },

  moduleStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  moduleUnlockedPill: {
    backgroundColor: "#DCFCE7",
  },

  moduleLockedPill: {
    backgroundColor: "#F3F4F6",
  },

  moduleStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  moduleUnlockedText: {
    color: "#166534",
  },

  moduleLockedText: {
    color: "#6B7280",
  },

  lessonCount: {
    marginTop: 6,
    color: "#666",
    fontSize: 13,
  },

  progressMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },

  progressTrack: {
    marginTop: 8,
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

  lockText: {
    marginTop: 10,
    color: "#c43a3a",
    fontWeight: "800",
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  modalText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
  },

  modalSubText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  modalButton: {
    marginTop: 18,
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
