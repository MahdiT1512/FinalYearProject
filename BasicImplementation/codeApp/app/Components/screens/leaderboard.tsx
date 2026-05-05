import React, { useMemo, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  SafeAreaView,
  Image,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  LeaderboardContext,
  LeaderboardUser,
} from "../../context/LeaderboardContext";
import { getCountryName } from "../../data/countries";
import CountryFlag from "../../Components/common/CountryFlag";

type Timeframe = "weekly" | "monthly" | "allTime";

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
      return "#94A3B8";
  }
};

const timeframeLabel = (timeframe: Timeframe) => {
  if (timeframe === "allTime") return "All-time";
  return timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
};

type RankedUser = LeaderboardUser & {
  displayXP: number;
  tier: string;
};

function PodiumCard({
  user,
  place,
  timeframe,
  onPress,
}: {
  user: RankedUser;
  place: 1 | 2 | 3;
  timeframe: Timeframe;
  onPress: () => void;
}) {
  const displayName = user.anonymous ? `Anonymous #${place}` : user.username;
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";

  return (
    <Pressable
      style={[
        styles.podiumCard,
        place === 1 && styles.podiumFirst,
        place === 2 && styles.podiumSecond,
        place === 3 && styles.podiumThird,
      ]}
      onPress={onPress}
    >
      <Text style={styles.podiumMedal}>{medal}</Text>

      <View style={styles.podiumAvatarWrap}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.podiumAvatar} />
        ) : (
          <View style={styles.podiumAvatarFallback}>
            <Text style={styles.podiumAvatarFallbackText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text numberOfLines={1} style={styles.podiumName}>
        {displayName}
      </Text>

      {!!user.equippedTitle && !user.anonymous && (
        <Text numberOfLines={1} style={styles.podiumTitle}>
          {user.equippedTitle}
        </Text>
      )}

      {!user.anonymous && (
        <View style={styles.podiumCountryRow}>
          <CountryFlag countryCode={user.country} size={16} />
          <Text style={styles.podiumCountryText}>
            {getCountryName(user.country)}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.podiumTierPill,
          { backgroundColor: `${tierColor(user.tier)}22` },
        ]}
      >
        <Text style={[styles.podiumTierText, { color: tierColor(user.tier) }]}>
          {user.tier.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.podiumXP}>{user.displayXP} XP</Text>
      <Text style={styles.podiumXPLabel}>{timeframeLabel(timeframe)}</Text>
    </Pressable>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { users, currentUserId, loading } = useContext(LeaderboardContext);

  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
  const [showAnonymous, setShowAnonymous] = useState(true);
  const [countryFilter, setCountryFilter] = useState("");
  const [search, setSearch] = useState("");

  const list = useMemo<RankedUser[]>(() => {
    const mapped = users.map((u) => {
      const xp =
        timeframe === "weekly"
          ? u.weeklyXP
          : timeframe === "monthly"
            ? u.monthlyXP
            : u.allTimeXP;

      return {
        ...u,
        displayXP: xp,
        tier: getTier(u.allTimeXP),
      };
    });

    const filtered = mapped.filter((u) => {
      if (!showAnonymous && u.anonymous) return false;

      if (countryFilter.trim()) {
        const filter = countryFilter.trim().toLowerCase();
        const code = (u.country || "").toLowerCase();
        const name = getCountryName(u.country).toLowerCase();

        if (code !== filter && !name.includes(filter)) return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!u.username.toLowerCase().includes(q)) return false;
      }

      return true;
    });

    filtered.sort((a, b) => b.displayXP - a.displayXP);
    return filtered;
  }, [users, timeframe, showAnonymous, countryFilter, search]);

  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  const currentUserRank = useMemo(() => {
    const idx = list.findIndex((u) => u.id === currentUserId);
    return idx === -1 ? null : idx + 1;
  }, [list, currentUserId]);

  const currentUser = useMemo(
    () => list.find((u) => u.id === currentUserId) ?? null,
    [list, currentUserId],
  );

  const renderItem = ({ item, index }: { item: RankedUser; index: number }) => {
    const absoluteRank = index + 4;
    const isCurrent = item.id === currentUserId;

    const displayName = item.anonymous
      ? `Anonymous #${absoluteRank}`
      : item.username;

    return (
      <TouchableOpacity
        style={[styles.row, isCurrent && styles.currentUserRow]}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/User/UserProfile",
            params: { userId: item.id },
          })
        }
      >
        <View style={styles.rankBox}>
          <Text style={styles.rankText}>#{absoluteRank}</Text>
        </View>

        <View style={styles.avatarWrap}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.username}>{displayName}</Text>

          {!!item.equippedTitle && !item.anonymous && (
            <Text style={styles.userTitle}>{item.equippedTitle}</Text>
          )}

          {!item.anonymous && (
            <View style={styles.countryRow}>
              <CountryFlag countryCode={item.country} size={18} />
              <Text style={styles.countryText}>
                {getCountryName(item.country)}
              </Text>
            </View>
          )}

          <View style={styles.metaLine}>
            <Text style={[styles.tierText, { color: tierColor(item.tier) }]}>
              {item.tier}
            </Text>
            <Text style={styles.smallText}>
              {" • "}Badges: {item.badges?.length ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.xpBox}>
          <Text style={styles.xpText}>{item.displayXP}</Text>
          <Text style={styles.smallText}>XP</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              <View style={styles.container}>
                <View style={styles.heroCard}>
                  <Text style={styles.title}>Leaderboard</Text>
                  <Text style={styles.subtitle}>
                    Climb the ranks and compete against users from around the
                    world.
                  </Text>

                  <View style={styles.heroStatsRow}>
                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>{list.length}</Text>
                      <Text style={styles.heroStatLabel}>Players</Text>
                    </View>

                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>
                        {currentUserRank ? `#${currentUserRank}` : "—"}
                      </Text>
                      <Text style={styles.heroStatLabel}>Your Rank</Text>
                    </View>

                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>
                        {currentUser ? currentUser.displayXP : 0}
                      </Text>
                      <Text style={styles.heroStatLabel}>
                        Your {timeframeLabel(timeframe)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.controlsCard}>
                  <View style={styles.timeframeRow}>
                    {(["weekly", "monthly", "allTime"] as Timeframe[]).map(
                      (tf) => (
                        <TouchableOpacity
                          key={tf}
                          style={[
                            styles.timeBtn,
                            timeframe === tf && styles.timeBtnActive,
                          ]}
                          onPress={() => setTimeframe(tf)}
                        >
                          <Text
                            style={[
                              styles.timeBtnText,
                              timeframe === tf && styles.timeBtnTextActive,
                            ]}
                          >
                            {tf === "allTime"
                              ? "All-time"
                              : tf.charAt(0).toUpperCase() + tf.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>

                  <View style={styles.filterRow}>
                    <TextInput
                      placeholder="Country code or name"
                      value={countryFilter}
                      onChangeText={setCountryFilter}
                      style={[styles.input, { flex: 1 }]}
                      placeholderTextColor="#94A3B8"
                    />

                    <View style={styles.switchRow}>
                      <Text style={styles.switchText}>Show anon</Text>
                      <Switch
                        value={showAnonymous}
                        onValueChange={setShowAnonymous}
                      />
                    </View>
                  </View>

                  <TextInput
                    placeholder="Search username"
                    value={search}
                    onChangeText={setSearch}
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {podium.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Top Players</Text>
                      <Text style={styles.sectionSubtitle}>
                        Best performers in{" "}
                        {timeframeLabel(timeframe).toLowerCase()}
                      </Text>
                    </View>

                    <View style={styles.podiumRow}>
                      {podium[1] ? (
                        <PodiumCard
                          user={podium[1]}
                          place={2}
                          timeframe={timeframe}
                          onPress={() =>
                            router.push({
                              pathname: "/User/UserProfile",
                              params: { userId: podium[1].id },
                            })
                          }
                        />
                      ) : (
                        <View style={styles.podiumSpacer} />
                      )}

                      {podium[0] ? (
                        <PodiumCard
                          user={podium[0]}
                          place={1}
                          timeframe={timeframe}
                          onPress={() =>
                            router.push({
                              pathname: "/User/UserProfile",
                              params: { userId: podium[0].id },
                            })
                          }
                        />
                      ) : null}

                      {podium[2] ? (
                        <PodiumCard
                          user={podium[2]}
                          place={3}
                          timeframe={timeframe}
                          onPress={() =>
                            router.push({
                              pathname: "/User/UserProfile",
                              params: { userId: podium[2].id },
                            })
                          }
                        />
                      ) : (
                        <View style={styles.podiumSpacer} />
                      )}
                    </View>
                  </>
                )}

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Rankings</Text>
                  <Text style={styles.sectionSubtitle}>
                    Everyone else on leaderboard
                  </Text>
                </View>

                {loading ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>Loading leaderboard...</Text>
                  </View>
                ) : list.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      No users match these filters yet.
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  list: {
    flex: 1,
  },

  container: {
    padding: 14,
  },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  heroStatPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
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
    color: "#6B7280",
    fontWeight: "700",
    textAlign: "center",
  },

  controlsCard: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    padding: 14,
  },

  timeframeRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
  },

  timeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },

  timeBtnActive: {
    backgroundColor: "#6C63FF",
  },

  timeBtnText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 13,
  },

  timeBtnTextActive: {
    color: "#fff",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#111827",
  },

  switchRow: {
    alignItems: "center",
    justifyContent: "center",
  },

  switchText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 4,
  },

  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 13,
  },

  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },

  podiumSpacer: {
    flex: 1,
  },

  podiumCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  podiumFirst: {
    minHeight: 250,
  },

  podiumSecond: {
    minHeight: 220,
  },

  podiumThird: {
    minHeight: 210,
  },

  podiumMedal: {
    fontSize: 28,
  },

  podiumAvatarWrap: {
    marginTop: 10,
  },

  podiumAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  podiumAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  podiumAvatarFallbackText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#374151",
  },

  podiumName: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  podiumTitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#6C63FF",
    textAlign: "center",
  },

  podiumCountryRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  podiumCountryText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },

  podiumTierPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  podiumTierText: {
    fontSize: 11,
    fontWeight: "800",
  },

  podiumXP: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  podiumXPLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
  },

  row: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  currentUserRow: {
    backgroundColor: "#FFF7D6",
    borderWidth: 1.5,
    borderColor: "#FACC15",
  },

  rankBox: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  rankText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  avatarWrap: {
    marginRight: 12,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },

  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#374151",
  },

  userInfo: {
    flex: 1,
  },

  username: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  userTitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6C63FF",
    fontWeight: "700",
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 3,
  },

  countryText: {
    fontSize: 12,
    color: "#666",
  },

  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  smallText: {
    fontSize: 12,
    color: "#6B7280",
  },

  tierText: {
    textTransform: "capitalize",
    fontWeight: "800",
    fontSize: 12,
  },

  xpBox: {
    width: 74,
    alignItems: "flex-end",
  },

  xpText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },

  emptyText: {
    color: "#6B7280",
    fontWeight: "700",
  },
});
