import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../firebase/config";
import { useAuth } from "../context/AuthContext";
import {
  buildAvatarUrl,
  RARITY_META,
  UserAvatarSkin,
} from "../../services/avatar";
import { equipAvatar } from "../../services/firestore";

type UserDoc = {
  avatars?: UserAvatarSkin[];
  equippedAvatarId?: string;
};

type AvatarRarity = "common" | "rare" | "epic" | "legendary";

const RARITY_ORDER: AvatarRarity[] = ["legendary", "epic", "rare", "common"];

//Avatar collection screen where users are shown their avatars/skins
//The user can group by rarity or see all of them at once
//The user can click on an avatar to equip
export default function AvatarCollection() {
  const { user } = useAuth();
  const router = useRouter();

  const [avatars, setAvatars] = useState<UserAvatarSkin[]>([]);
  const [equippedId, setEquippedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserDoc;
        setAvatars(data.avatars || []);
        setEquippedId(data.equippedAvatarId || "");
      } else {
        setAvatars([]);
        setEquippedId("");
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const groupedAvatars = useMemo(() => {
    const groups: Record<AvatarRarity, UserAvatarSkin[]> = {
      legendary: [],
      epic: [],
      rare: [],
      common: [],
    };

    avatars.forEach((avatar) => {
      groups[avatar.rarity].push(avatar);
    });

    RARITY_ORDER.forEach((rarity) => {
      groups[rarity].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [avatars]);

  const stats = useMemo(() => {
    const countByRarity: Record<AvatarRarity, number> = {
      legendary: 0,
      epic: 0,
      rare: 0,
      common: 0,
    };

    avatars.forEach((avatar) => {
      countByRarity[avatar.rarity] += 1;
    });

    return countByRarity;
  }, [avatars]);

  const equippedAvatar = useMemo(() => {
    return avatars.find((avatar) => avatar.id === equippedId) || null;
  }, [avatars, equippedId]);

  //Equips the selected or pressed avatar unless already active
  const handleEquip = async (id: string) => {
    if (!user) return;
    if (id === equippedId) return;
    if (equippingId) return;

    try {
      setEquippingId(id);
      await equipAvatar(user.uid, id);
    } catch {
      Alert.alert("Equip failed", "Could not equip this avatar.");
    } finally {
      setEquippingId(null);
    }
  };

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
          <Text style={styles.title}>Avatar Collection</Text>

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
          <Text style={styles.heroTitle}>Your Locker</Text>
          <Text style={styles.heroText}>
            Tap any avatar card to equip it instantly.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{avatars.length}</Text>
              <Text style={styles.heroStatLabel}>Collected</Text>
            </View>

            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>
                {equippedAvatar
                  ? RARITY_META[equippedAvatar.rarity].label
                  : "—"}
              </Text>
              <Text style={styles.heroStatLabel}>Equipped Rarity</Text>
            </View>
          </View>

          {equippedAvatar ? (
            <View style={styles.equippedPreviewRow}>
              <Image
                source={{
                  uri: buildAvatarUrl(
                    equippedAvatar.avatarStyle,
                    equippedAvatar.avatarSeed,
                    84,
                  ),
                }}
                style={[
                  styles.equippedPreviewImage,
                  {
                    borderColor: RARITY_META[equippedAvatar.rarity].frameColor,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.equippedPreviewLabel}>
                  Currently Equipped
                </Text>
                <Text style={styles.equippedPreviewName}>
                  {equippedAvatar.name}
                </Text>
                <Text style={styles.equippedPreviewMeta}>
                  {RARITY_META[equippedAvatar.rarity].label}
                  {equippedAvatar.rewardTitle
                    ? ` • ${equippedAvatar.rewardTitle}`
                    : ""}
                </Text>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        {avatars.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No avatars yet</Text>
            <Text style={styles.emptyText}>
              Use the spin station on your profile to unlock a new skin.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              {RARITY_ORDER.map((rarity) => {
                const meta = RARITY_META[rarity];
                return (
                  <View
                    key={rarity}
                    style={[
                      styles.summaryPill,
                      { backgroundColor: `${meta.accentColor}22` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryPillCount,
                        { color: meta.accentColor },
                      ]}
                    >
                      {stats[rarity]}
                    </Text>
                    <Text
                      style={[
                        styles.summaryPillText,
                        { color: meta.accentColor },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {RaritySections({
              groupedAvatars,
              equippedId,
              equippingId,
              onEquip: handleEquip,
            })}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function RaritySections({
  groupedAvatars,
  equippedId,
  equippingId,
  onEquip,
}: {
  groupedAvatars: Record<AvatarRarity, UserAvatarSkin[]>;
  equippedId: string;
  equippingId: string | null;
  onEquip: (id: string) => Promise<void> | void;
}) {
  return (
    <>
      {RARITY_ORDER.map((rarity) => {
        const avatars = groupedAvatars[rarity];
        if (!avatars.length) return null;

        const meta = RARITY_META[rarity];

        return (
          <View key={rarity} style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionDot,
                  { backgroundColor: meta.accentColor },
                ]}
              />
              <Text style={styles.sectionTitle}>{meta.label}</Text>
              <Text style={styles.sectionCount}>{avatars.length}</Text>
            </View>

            <View style={styles.grid}>
              {avatars.map((avatar) => {
                const isActive = avatar.id === equippedId;
                const isEquipping = avatar.id === equippingId;

                return (
                  <Pressable
                    key={avatar.id}
                    style={({ pressed }) => [
                      styles.cardPressable,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => onEquip(avatar.id)}
                    disabled={isEquipping || !!equippingId}
                  >
                    <LinearGradient
                      colors={
                        isActive
                          ? ["rgba(255,255,255,0.98)", `${meta.accentColor}20`]
                          : ["rgba(255,255,255,0.94)", "rgba(255,255,255,0.88)"]
                      }
                      style={[
                        styles.card,
                        { borderColor: meta.frameColor },
                        isActive && styles.activeCard,
                      ]}
                    >
                      {isActive && (
                        <View style={styles.equippedBadge}>
                          <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
                        </View>
                      )}

                      <View
                        style={[
                          styles.imageFrame,
                          { borderColor: meta.frameColor },
                          isActive && styles.imageFrameActive,
                        ]}
                      >
                        <Image
                          source={{
                            uri: buildAvatarUrl(
                              avatar.avatarStyle,
                              avatar.avatarSeed,
                              112,
                            ),
                          }}
                          style={styles.img}
                        />
                      </View>

                      <Text style={styles.name} numberOfLines={2}>
                        {avatar.name}
                      </Text>

                      <View
                        style={[
                          styles.rarityPill,
                          { backgroundColor: meta.accentColor },
                        ]}
                      >
                        <Text style={styles.rarityText}>{meta.label}</Text>
                      </View>

                      {avatar.rewardTitle ? (
                        <Text style={styles.rewardTitle} numberOfLines={1}>
                          {avatar.rewardTitle}
                        </Text>
                      ) : (
                        <Text style={styles.rewardTitleMuted}>
                          No title reward
                        </Text>
                      )}

                      <View
                        style={[
                          styles.tapHintBox,
                          isActive && styles.tapHintBoxActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tapHintText,
                            isActive && styles.tapHintTextActive,
                          ]}
                        >
                          {isEquipping
                            ? "Equipping..."
                            : isActive
                              ? "Currently active"
                              : "Tap to equip"}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </>
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
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    padding: 16,
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

  equippedPreviewRow: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  equippedPreviewImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    backgroundColor: "#fff",
  },

  equippedPreviewLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
  },

  equippedPreviewName: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  equippedPreviewMeta: {
    marginTop: 2,
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyCard: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 22,
    padding: 18,
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

  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },

  summaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  summaryPillCount: {
    fontWeight: "900",
    fontSize: 14,
  },

  summaryPillText: {
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
  },

  sectionWrap: {
    marginTop: 22,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  cardPressable: {
    width: "48%",
    marginBottom: 14,
  },

  card: {
    minHeight: 255,
    padding: 14,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },

  activeCard: {
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },

  equippedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 3,
  },

  equippedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },

  imageFrame: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginTop: 8,
  },

  imageFrameActive: {
    transform: [{ scale: 1.03 }],
  },

  img: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },

  name: {
    marginTop: 12,
    fontWeight: "900",
    textAlign: "center",
    color: "#111827",
    fontSize: 15,
    minHeight: 38,
  },

  rarityPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  rarityText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  rewardTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    textAlign: "center",
  },

  rewardTitleMuted: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textAlign: "center",
  },

  tapHintBox: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  tapHintBoxActive: {
    backgroundColor: "#16A34A",
  },

  tapHintText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12,
  },

  tapHintTextActive: {
    color: "#fff",
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
