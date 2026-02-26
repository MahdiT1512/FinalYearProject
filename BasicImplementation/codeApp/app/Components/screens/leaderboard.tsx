import React, { useMemo, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { LeaderboardContext } from "../../context/LeaderboardContext";

type Timeframe = "weekly" | "monthly" | "allTime";

const getTier = (xp: number) => {
  if (xp >= 10000) return "diamond";
  if (xp >= 5000) return "platinum";
  if (xp >= 2000) return "gold";
  if (xp >= 1000) return "silver";
  if (xp >= 500) return "bronze";
  return "none";
};

const flagEmoji = (country?: string) => {
  if (!country) return "";
  return country
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { users, currentUserId } = useContext(LeaderboardContext);

  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
  const [showAnonymous, setShowAnonymous] = useState(true);
  const [countryFilter, setCountryFilter] = useState("");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
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
        if (!u.country) return false;
        if (u.country.toLowerCase() !== countryFilter.trim().toLowerCase())
          return false;
      }

      if (search.trim()) {
        if (!u.username.toLowerCase().includes(search.trim().toLowerCase()))
          return false;
      }

      return true;
    });

    filtered.sort((a, b) => b.displayXP - a.displayXP);
    return filtered;
  }, [users, timeframe, showAnonymous, countryFilter, search]);

  const renderItem = ({ item, index }: any) => {
    const isCurrent = item.id === currentUserId;

    const displayName = item.anonymous
      ? `Anonymous #${index + 1}`
      : item.username;

    const medal =
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1;

    return (
      <TouchableOpacity
        style={[styles.row, isCurrent && styles.currentUserRow]}
        onPress={() =>
          router.push({
            pathname: "/User/UserProfile",
            params: { userId: item.id },
          })
        }
      >
        <View style={styles.rankBox}>
          <Text style={styles.rankText}>{medal}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {displayName} {!item.anonymous && flagEmoji(item.country)}
          </Text>

          <Text style={styles.smallText}>
            Tier:{" "}
            <Text
              style={[
                styles.tierText,
                item.tier === "diamond" && { color: "#00BFFF" },
                item.tier === "platinum" && { color: "#A0A0A0" },
                item.tier === "gold" && { color: "#FFD700" },
                item.tier === "silver" && { color: "#C0C0C0" },
                item.tier === "bronze" && { color: "#CD7F32" },
              ]}
            >
              {item.tier}
            </Text>
            {"  "}Badges: {item.badges?.slice(0, 3).join(", ") || "—"}
          </Text>
        </View>

        <View style={styles.xpBox}>
          <Text style={styles.xpText}>{item.displayXP}</Text>
          <Text style={styles.smallText}>XP</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.timeframeRow}>
          {(["weekly", "monthly", "allTime"] as Timeframe[]).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.timeBtn, timeframe === tf && styles.timeBtnActive]}
              onPress={() => setTimeframe(tf)}
            >
              <Text
                style={
                  timeframe === tf
                    ? styles.timeBtnTextActive
                    : styles.timeBtnText
                }
              >
                {tf === "allTime"
                  ? "All-time"
                  : tf.charAt(0).toUpperCase() + tf.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          <TextInput
            placeholder="Country code (e.g. US)"
            value={countryFilter}
            onChangeText={setCountryFilter}
            style={[styles.input, { flex: 1 }]}
          />

          <View style={styles.switchRow}>
            <Text style={styles.smallText}>Show anonymous</Text>
            <Switch value={showAnonymous} onValueChange={setShowAnonymous} />
          </View>
        </View>

        <TextInput
          placeholder="Search username"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },
  controls: {
    marginBottom: 12,
  },
  timeframeRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  timeBtn: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#f2f2f2",
  },
  timeBtnActive: {
    backgroundColor: "#FFB703",
  },
  timeBtnText: {
    color: "#333",
  },
  timeBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#fff",
  },
  switchRow: {
    marginLeft: 8,
    alignItems: "center",
  },
  smallText: {
    fontSize: 12,
    color: "#444",
  },
  list: {
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  currentUserRow: {
    backgroundColor: "#FFF3CD",
  },
  rankBox: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
  },
  xpBox: {
    width: 70,
    alignItems: "flex-end",
  },
  xpText: {
    fontSize: 16,
    fontWeight: "700",
  },
  tierText: {
    textTransform: "capitalize",
    fontWeight: "700",
  },
});
