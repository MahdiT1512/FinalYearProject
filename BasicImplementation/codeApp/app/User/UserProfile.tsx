import React, { useContext, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LeaderboardContext } from "../context/LeaderboardContext";

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

export default function UserProfile() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { users } = useContext(LeaderboardContext);

  const user = users.find((u) => u.id === userId);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>User not found</Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const tier = getTier(user.allTimeXP);

  const nextTierXP = useMemo(() => {
    if (user.allTimeXP < 500) return 500;
    if (user.allTimeXP < 1000) return 1000;
    if (user.allTimeXP < 2000) return 2000;
    if (user.allTimeXP < 5000) return 5000;
    if (user.allTimeXP < 10000) return 10000;
    return user.allTimeXP;
  }, [user.allTimeXP]);

  const progress = tier === "diamond" ? 1 : user.allTimeXP / nextTierXP;

  return (
    <View style={styles.container}>
      {/* Close */}
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.username}>
          {user.anonymous ? "Anonymous" : user.username}
        </Text>

        <View style={[styles.tierBadge, { backgroundColor: tierColor(tier) }]}>
          <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
        </View>

        <Text style={styles.country}>{user.country ?? "—"}</Text>

        {/* Progress Bar */}
        {tier !== "diamond" && (
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        )}
      </View>

      {/* XP Stats */}
      <View style={styles.statRow}>
        <Stat label="Weekly" value={user.weeklyXP} />
        <Stat label="Monthly" value={user.monthlyXP} />
        <Stat label="All-time" value={user.allTimeXP} />
      </View>

      {/* Badges */}
      <Text style={styles.sectionTitle}>Badges</Text>

      {user.badges && user.badges.length > 0 ? (
        <FlatList
          data={user.badges}
          keyExtractor={(b, idx) => `${user.id}-badge-${idx}`}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeText}>🏅 {item}</Text>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noBadges}>No badges yet</Text>
      )}
    </View>
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
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 18,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 8,
    backgroundColor: "#FF6B6B",
    borderRadius: 8,
    zIndex: 10,
  },
  closeText: {
    color: "#fff",
    fontWeight: "700",
  },

  headerCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
    elevation: 4,
  },

  username: {
    fontSize: 24,
    fontWeight: "800",
  },

  country: {
    marginTop: 6,
    color: "#666",
  },

  tierBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  tierText: {
    color: "#fff",
    fontWeight: "700",
  },

  progressContainer: {
    marginTop: 14,
    width: "100%",
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 6,
    overflow: "hidden",
  },

  progressFill: {
    height: 8,
    backgroundColor: "#FFB703",
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  stat: {
    backgroundColor: "#fff",
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    elevation: 3,
  },

  statNum: {
    fontSize: 20,
    fontWeight: "800",
  },

  statLabel: {
    marginTop: 4,
    color: "#666",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  badgeCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    margin: 6,
    alignItems: "center",
    elevation: 2,
  },

  badgeText: {
    fontSize: 16,
  },

  noBadges: {
    color: "#777",
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
