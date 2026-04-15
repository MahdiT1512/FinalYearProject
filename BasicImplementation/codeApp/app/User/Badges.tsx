import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../firebase/config";
import { useAuth } from "../context/AuthContext";
import { BADGE_DEFS } from "../../services/badges";

type UserBadge = {
  id: string;
  unlocked: boolean;
  unlockedAt?: number | null;
};

const BADGE_ICONS: Record<string, string> = {
  first_lesson: "🚀",
  xp_100: "⭐",
  xp_1000: "🔥",
  spin_1: "🎰",
  streak_3: "⚡",
  streak_7: "👑",
  review_1: "🛡️",
};

function formatUnlockedDate(timestamp?: number | null) {
  if (!timestamp) return null;

  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function Badges() {
  const { user } = useAuth();
  const router = useRouter();

  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setUserBadges(snap.data().badges || []);
      } else {
        setUserBadges([]);
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const mergedBadges = useMemo(() => {
    return BADGE_DEFS.map((badgeDef) => {
      const userBadge = userBadges.find((b) => b.id === badgeDef.id);

      return {
        ...badgeDef,
        unlocked: !!userBadge?.unlocked,
        unlockedAt: userBadge?.unlockedAt ?? null,
        icon: BADGE_ICONS[badgeDef.id] || "🏅",
      };
    });
  }, [userBadges]);

  const unlockedBadges = mergedBadges.filter((badge) => badge.unlocked);
  const lockedBadges = mergedBadges.filter((badge) => !badge.unlocked);

  if (loading) {
    return (
      <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Badges</Text>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </View>

        <LinearGradient
          colors={["rgba(255,255,255,0.96)", "rgba(245,243,255,0.96)"]}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle}>Achievement Board</Text>
          <Text style={styles.heroText}>
            Earn badges by learning consistently, gaining XP, reviewing lessons,
            and pushing your streak higher.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{unlockedBadges.length}</Text>
              <Text style={styles.heroStatLabel}>Unlocked</Text>
            </View>

            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{lockedBadges.length}</Text>
              <Text style={styles.heroStatLabel}>Still to Earn</Text>
            </View>

            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{mergedBadges.length}</Text>
              <Text style={styles.heroStatLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    mergedBadges.length === 0
                      ? 0
                      : (unlockedBadges.length / mergedBadges.length) * 100
                  }%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {unlockedBadges.length} of {mergedBadges.length} badges unlocked
          </Text>
        </LinearGradient>

        <SectionHeader title="Unlocked Badges" count={unlockedBadges.length} />
        {unlockedBadges.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No badges yet</Text>
            <Text style={styles.emptyText}>
              Complete your first lesson, gain XP, spin rewards, and build your
              streak to start unlocking achievements.
            </Text>
          </View>
        ) : (
          unlockedBadges.map((badge) => {
            const unlockedDate = formatUnlockedDate(badge.unlockedAt);

            return (
              <LinearGradient
                key={badge.id}
                colors={["rgba(255,255,255,0.96)", "rgba(255,248,220,0.96)"]}
                style={styles.unlockedCard}
              >
                <View style={styles.badgeTopRow}>
                  <View style={styles.badgeIconWrap}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDesc}>{badge.description}</Text>
                  </View>

                  <View style={styles.statusPillUnlocked}>
                    <Text style={styles.statusPillUnlockedText}>UNLOCKED</Text>
                  </View>
                </View>

                {unlockedDate ? (
                  <Text style={styles.unlockedDate}>
                    Unlocked on {unlockedDate}
                  </Text>
                ) : (
                  <Text style={styles.unlockedDate}>Unlocked</Text>
                )}
              </LinearGradient>
            );
          })
        )}

        <SectionHeader title="Locked Badges" count={lockedBadges.length} />
        {lockedBadges.map((badge) => {
          return (
            <LinearGradient
              key={badge.id}
              colors={["rgba(255,255,255,0.88)", "rgba(243,244,246,0.88)"]}
              style={styles.lockedCard}
            >
              <View style={styles.badgeTopRow}>
                <View
                  style={[styles.badgeIconWrap, styles.badgeIconWrapLocked]}
                >
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeNameLocked}>{badge.name}</Text>
                  <Text style={styles.badgeDescLocked}>
                    {badge.description}
                  </Text>
                </View>

                <View style={styles.statusPillLocked}>
                  <Text style={styles.statusPillLockedText}>LOCKED</Text>
                </View>
              </View>
            </LinearGradient>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingBottom: 34,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  backButton: {
    backgroundColor: "rgba(255,255,255,0.95)",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  backText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  heroCard: {
    borderRadius: 28,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  heroText: {
    marginTop: 6,
    color: "#6B7280",
    fontWeight: "600",
    lineHeight: 21,
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },

  heroStatNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  heroStatLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    textAlign: "center",
  },

  progressTrack: {
    marginTop: 16,
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: 12,
    backgroundColor: "#6C63FF",
    borderRadius: 999,
  },

  progressText: {
    marginTop: 8,
    color: "#4B5563",
    fontWeight: "700",
    textAlign: "center",
  },

  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionCount: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },

  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 18,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  emptyText: {
    marginTop: 6,
    color: "#6B7280",
    lineHeight: 21,
    fontWeight: "600",
  },

  unlockedCard: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  lockedCard: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    opacity: 0.82,
  },

  badgeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  badgeIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeIconWrapLocked: {
    backgroundColor: "#E5E7EB",
  },

  badgeIcon: {
    fontSize: 24,
  },

  badgeName: {
    fontWeight: "900",
    fontSize: 17,
    color: "#111827",
  },

  badgeDesc: {
    marginTop: 4,
    color: "#4B5563",
    lineHeight: 20,
    fontWeight: "600",
  },

  badgeNameLocked: {
    fontWeight: "900",
    fontSize: 17,
    color: "#6B7280",
  },

  badgeDescLocked: {
    marginTop: 4,
    color: "#9CA3AF",
    lineHeight: 20,
    fontWeight: "600",
  },

  unlockedDate: {
    marginTop: 12,
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 12,
  },

  statusPillUnlocked: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusPillUnlockedText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "900",
  },

  statusPillLocked: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusPillLockedText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
