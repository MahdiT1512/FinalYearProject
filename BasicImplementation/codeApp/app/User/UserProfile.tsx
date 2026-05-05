import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Image,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LeaderboardContext } from "../context/LeaderboardContext";
import { getCountryName } from "../data/countries";
import CountryFlag from "../Components/common/CountryFlag";
import {
  getUnlockedBadgeDefinitions,
  BadgeDefinition,
} from "../../services/badges";

const getTier = (xp: number) => {
  if (xp >= 10000) return "diamond";
  if (xp >= 5000) return "platinum";
  if (xp >= 2000) return "gold";
  if (xp >= 1000) return "silver";
  if (xp >= 500) return "bronze";
  return "none";
};

const tierColor = (tier: string) => {
  switch (tier) {
    case "diamond":
      return "#00BFFF";
    case "platinum":
      return "#A0A0A0";
    case "gold":
      return "#FFD700";
    case "silver":
      return "#C0C0C0";
    case "bronze":
      return "#CD7F32";
    default:
      return "#999";
  }
};

const getNextTierXP = (xp: number) => {
  if (xp < 500) return 500;
  if (xp < 1000) return 1000;
  if (xp < 2000) return 2000;
  if (xp < 5000) return 5000;
  if (xp < 10000) return 10000;
  return xp;
};

//The user profile that is accessible from the Learderboard, with no relation to my profile.
//It allows other users to view each others tiers(meaning a visual indicator for XP threshold), badges and avatars
export default function UserProfile() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { users, currentUserId } = useContext(LeaderboardContext);

  //This pulls the selected users profile data from the leaderboard context in real time
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundTitle}>User not found</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isCurrent = user.id === currentUserId;
  const tier = getTier(user.allTimeXP);
  const nextTierXP = useMemo(
    () => getNextTierXP(user.allTimeXP),
    [user.allTimeXP],
  );

  const progress =
    tier === "diamond" ? 1 : Math.min(user.allTimeXP / nextTierXP, 1);

  const unlockedBadges = useMemo<BadgeDefinition[]>(() => {
    return getUnlockedBadgeDefinitions(user.badges);
  }, [user.badges]);

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.close} onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.headerCard}>
            <View style={styles.avatarWrap}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {(user.anonymous
                      ? "A"
                      : user.username.charAt(0)
                    ).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.username}>
              {user.anonymous ? "Anonymous" : user.username}
            </Text>

            {isCurrent && <Text style={styles.youTag}>This is you</Text>}

            {!!user.equippedTitle && !user.anonymous && (
              <Text style={styles.equippedTitle}>{user.equippedTitle}</Text>
            )}

            <View
              style={[styles.tierBadge, { backgroundColor: tierColor(tier) }]}
            >
              <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
            </View>

            {!user.anonymous && (
              <View style={styles.countryRow}>
                <CountryFlag countryCode={user.country} size={20} />
                <Text style={styles.country}>
                  {getCountryName(user.country)}
                </Text>
              </View>
            )}

            {tier !== "diamond" && (
              <>
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {nextTierXP - user.allTimeXP} XP to next tier
                </Text>
              </>
            )}
          </View>

          <View style={styles.statRow}>
            <Stat label="Weekly" value={user.weeklyXP} />
            <Stat label="Monthly" value={user.monthlyXP} />
            <Stat label="All-time" value={user.allTimeXP} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile Snapshot</Text>
            <Text style={styles.snapshotText}>
              {user.anonymous
                ? "This user is currently shown anonymously in user rankings."
                : `${user.username} is competing publicly on the leaderboard.`}
            </Text>
            <Text style={styles.snapshotText}>
              Tier:{" "}
              <Text style={[styles.boldText, { color: tierColor(tier) }]}>
                {tier}
              </Text>
            </Text>
            <Text style={styles.snapshotText}>
              Badges earned:{" "}
              <Text style={styles.boldText}>{unlockedBadges.length}</Text>
            </Text>
          </View>

          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>Badges</Text>

            {unlockedBadges.length > 0 ? (
              <View style={styles.badgesGrid}>
                {unlockedBadges.map((badge) => (
                  <View
                    key={`${user.id}-badge-${badge.id}`}
                    style={[
                      styles.badgeCard,
                      { borderColor: badge.accent + "55" },
                    ]}
                  >
                    <View
                      style={[
                        styles.badgeIconWrap,
                        { backgroundColor: badge.accent + "22" },
                      ]}
                    >
                      <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    </View>

                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDescription}>
                      {badge.description}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBadgeCard}>
                <Text style={styles.noBadges}>No badges yet</Text>
                <Text style={styles.noBadgesSub}>
                  Keep trying and get your first lesson and exerices done to
                  unlock your first badge.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  container: {
    flex: 1,
    padding: 18,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },

  notFoundTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  close: {
    alignSelf: "flex-end",
    backgroundColor: "#FF6B6B",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  closeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  headerCard: {
    backgroundColor: "#fff",
    padding: 22,
    borderRadius: 22,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  avatarWrap: {
    marginBottom: 10,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#374151",
  },

  username: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  youTag: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#6C63FF",
  },

  equippedTitle: {
    marginTop: 8,
    color: "#6C63FF",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  country: {
    color: "#666",
    fontWeight: "600",
  },

  tierBadge: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  tierText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  progressContainer: {
    marginTop: 16,
    width: "100%",
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: 10,
    backgroundColor: "#FFB703",
  },

  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 8,
  },

  stat: {
    backgroundColor: "#fff",
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
  },

  statNum: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  statLabel: {
    marginTop: 4,
    color: "#666",
    fontWeight: "700",
    fontSize: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  badgesSection: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  snapshotText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 6,
  },

  boldText: {
    fontWeight: "800",
    color: "#111827",
  },

  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  badgeCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    elevation: 2,
  },

  badgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  badgeIcon: {
    fontSize: 22,
  },

  badgeName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },

  badgeDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#4B5563",
    fontWeight: "600",
  },

  emptyBadgeCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
  },

  noBadges: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },

  noBadgesSub: {
    marginTop: 6,
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 19,
  },

  button: {
    backgroundColor: "#FFB703",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
