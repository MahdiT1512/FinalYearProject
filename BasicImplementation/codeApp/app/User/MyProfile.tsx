import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, onSnapshot } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../../firebase/config";
import { useAuth } from "../context/AuthContext";
import { logout } from "../../services/auth";
import {
  buildAvatarUrl,
  DEFAULT_AVATAR_STYLE,
  getNextRarityTarget,
  RARITY_META,
  UserAvatarSkin,
} from "../../services/avatar";
import {
  DAILY_FREE_SPINS,
  EXTRA_SPIN_COST_XP,
  spinAvatar,
  syncDailySpinReset,
  getTimeUntilNextReset,
} from "../../services/spin";
import { equipAvatar } from "../../services/firestore";
import { getCountryName } from "../data/countries";
import CountryFlag from "../Components/common/CountryFlag";

type UserDoc = {
  username?: string;
  country?: string;
  countryName?: string;
  email?: string;
  photoURL?: string;
  equippedAvatarId?: string;
  equippedRarity?: "common" | "rare" | "epic" | "legendary";
  equippedTitle?: string | null;
  avatars?: UserAvatarSkin[];
  allTimeXP?: number;
  xp?: number;
  freeSpinsRemaining?: number;
  spinResetDateKey?: string;
  anonymous?: boolean;
  userSkillLevel?: "Beginner" | "Intermediate" | "Advanced";
};

type SpinMeta = {
  usedFreeSpin: boolean;
  xpSpent: number;
  freeSpinsRemaining: number;
  titleUnlocked?: string | null;
} | null;

export default function MyProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const { entry } = useLocalSearchParams<{ entry?: string }>();

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [equippingLatest, setEquippingLatest] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });

  const [spinModalVisible, setSpinModalVisible] = useState(false);
  const [latestSkin, setLatestSkin] = useState<UserAvatarSkin | null>(null);
  const [latestSpinMeta, setLatestSpinMeta] = useState<SpinMeta>(null);

  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserDoc);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    syncDailySpinReset(user.uid);
  }, [user]);

  useEffect(() => {
    const updateTimer = () => {
      setTimeLeft(getTimeUntilNextReset());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!spinModalVisible) return;

    modalScale.setValue(0.85);
    modalOpacity.setValue(0);
    sparkle1.setValue(0);
    sparkle2.setValue(0);
    sparkle3.setValue(0);

    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(sparkle1, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(100),
        Animated.timing(sparkle2, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(sparkle3, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    spinModalVisible,
    modalOpacity,
    modalScale,
    sparkle1,
    sparkle2,
    sparkle3,
  ]);

  const avatars = profile?.avatars ?? [];
  const equippedId = profile?.equippedAvatarId ?? "default";
  const allTimeXP = profile?.allTimeXP ?? 0;
  const currentXP = profile?.xp ?? 0;
  const freeSpinsRemaining = profile?.freeSpinsRemaining ?? DAILY_FREE_SPINS;

  const currentAvatarUrl = useMemo(() => {
    if (!user) {
      return buildAvatarUrl(DEFAULT_AVATAR_STYLE, "default", 192);
    }

    if (profile?.photoURL) return profile.photoURL;

    const equipped = avatars.find((a) => a.id === equippedId);
    if (equipped) {
      return buildAvatarUrl(equipped.avatarStyle, equipped.avatarSeed, 192);
    }

    return buildAvatarUrl(DEFAULT_AVATAR_STYLE, user.uid, 192);
  }, [avatars, equippedId, profile?.photoURL, user]);

  const equippedAvatar = avatars.find((a) => a.id === equippedId);
  const currentRarity =
    equippedAvatar?.rarity ?? profile?.equippedRarity ?? "common";
  const rarityMeta = RARITY_META[currentRarity];
  const nextTarget = getNextRarityTarget(allTimeXP);

  const canFreeSpin = freeSpinsRemaining > 0;
  const canExtraSpin = currentXP >= EXTRA_SPIN_COST_XP;
  const canSpin = canFreeSpin || canExtraSpin;
  const xpNeededForExtraSpin = Math.max(0, EXTRA_SPIN_COST_XP - currentXP);

  const spinButtonLabel = canFreeSpin
    ? `Use Free Spin (${freeSpinsRemaining} left)`
    : canExtraSpin
      ? `Spin for ${EXTRA_SPIN_COST_XP} XP`
      : `Need ${xpNeededForExtraSpin} more XP`;

  const spinHelperText = canFreeSpin
    ? "Your next spin is free."
    : canExtraSpin
      ? `Free spins used up. Next spin will cost ${EXTRA_SPIN_COST_XP} XP.`
      : `No free spins left. Earn ${xpNeededForExtraSpin} more XP to spin again.`;

  const handleClose = () => {
    if (entry === "onboarding") {
      router.replace("/Components/screens");
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/Components/screens");
  };

  const handleSpin = async () => {
    if (!user) return;

    if (!canSpin) {
      Alert.alert(
        "Not enough XP",
        `You have no free spins left. Earn ${xpNeededForExtraSpin} more XP to buy an extra spin.`,
      );
      return;
    }

    try {
      setSpinning(true);

      const result = await spinAvatar(user.uid);

      setLatestSkin(result.skin);
      setLatestSpinMeta({
        usedFreeSpin: result.usedFreeSpin,
        xpSpent: result.xpSpent,
        freeSpinsRemaining: result.freeSpinsRemaining,
        titleUnlocked: result.titleUnlocked,
      });

      setSpinModalVisible(true);
    } catch (err: any) {
      Alert.alert("Spin failed", err?.message ?? "Error");
    } finally {
      setSpinning(false);
    }
  };

  const handleEquipLatest = async () => {
    if (!user || !latestSkin) return;

    try {
      setEquippingLatest(true);
      await equipAvatar(user.uid, latestSkin.id);
      setSpinModalVisible(false);
      setLatestSkin(null);
      setLatestSpinMeta(null);
    } catch {
      Alert.alert("Equip failed", "Could not equip this skin.");
    } finally {
      setEquippingLatest(false);
    }
  };

  const handleCloseSpinModal = () => {
    setSpinModalVisible(false);
    setLatestSkin(null);
    setLatestSpinMeta(null);
  };

  if (loading) {
    return (
      <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={styles.center}>
        <Text style={styles.title}>Not signed in</Text>
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>My Profile</Text>

            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleClose}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <LinearGradient
            colors={["rgba(255,255,255,0.96)", "rgba(245,243,255,0.96)"]}
            style={styles.heroCard}
          >
            <View
              style={[
                styles.avatarFrame,
                { borderColor: rarityMeta.frameColor },
              ]}
            >
              <Image source={{ uri: currentAvatarUrl }} style={styles.avatar} />
            </View>

            <Text style={styles.subtitle}>
              {profile?.username || "Unnamed User"}
            </Text>

            <View style={styles.titlePill}>
              <Text style={styles.titlePillText}>
                {profile?.equippedTitle || "Code Rookie"}
              </Text>
            </View>

            <View style={styles.countryPill}>
              <CountryFlag countryCode={profile?.country} size={20} />
              <Text style={styles.countryPillText}>
                {getCountryName(profile?.country)}
              </Text>
            </View>

            <Text style={styles.perkText}>
              {rarityMeta.label} Skin • {profile?.userSkillLevel ?? "Beginner"}
            </Text>
          </LinearGradient>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentXP}</Text>
              <Text style={styles.statLabel}>Current XP</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{allTimeXP}</Text>
              <Text style={styles.statLabel}>All-Time XP</Text>
            </View>
          </View>

          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(239,246,255,0.95)"]}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Spin Station</Text>
            <Text style={styles.cardText}>
              Free spins: {freeSpinsRemaining} / {DAILY_FREE_SPINS}
            </Text>
            <Text style={styles.cardText}>
              Extra spin cost: {EXTRA_SPIN_COST_XP} XP
            </Text>
            <Text style={styles.cardText}>
              Reset in: {timeLeft.hours}h {timeLeft.minutes}m
            </Text>

            <View style={styles.spinStatusBox}>
              <Text style={styles.spinStatusTitle}>
                {canFreeSpin
                  ? "Free spin available"
                  : canExtraSpin
                    ? "XP spin available"
                    : "Spin locked"}
              </Text>
              <Text style={styles.spinStatusText}>{spinHelperText}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                !canSpin && styles.primaryButtonDisabled,
                pressed && canSpin && styles.buttonPressed,
              ]}
              onPress={handleSpin}
              disabled={!canSpin || spinning}
            >
              <Text style={styles.primaryText}>
                {spinning ? "Spinning..." : spinButtonLabel}
              </Text>
            </Pressable>
          </LinearGradient>

          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(255,247,237,0.95)"]}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Rarity Progress</Text>
            {nextTarget ? (
              <Text style={styles.cardText}>
                Reach {nextTarget.xpNeeded} total XP to unlock{" "}
                {RARITY_META[nextTarget.rarity].label}.
              </Text>
            ) : (
              <Text style={styles.cardText}>
                You already unlocked the top rarity.
              </Text>
            )}
          </LinearGradient>

          <View style={styles.navSection}>
            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/User/AvatarCollection")}
            >
              <Text style={styles.navText}>🎨 Avatar Collection</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/User/Badges")}
            >
              <Text style={styles.navText}>🏅 Badges</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/User/EditProfile")}
            >
              <Text style={styles.navText}>✏️ Edit Profile</Text>
            </Pressable>
          </View>

          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(243,244,246,0.95)"]}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Account</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email ?? "—"}</Text>

            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{profile?.username ?? "—"}</Text>

            <Text style={styles.label}>Country</Text>
            <View style={styles.countryRow}>
              <CountryFlag countryCode={profile?.country} size={20} />
              <Text style={styles.value}>
                {getCountryName(profile?.country)}
              </Text>
            </View>

            <Text style={styles.label}>Skill Level</Text>
            <Text style={styles.value}>
              {profile?.userSkillLevel ?? "Beginner"}
            </Text>

            <Text style={styles.label}>Leaderboard Visibility</Text>
            <Text style={styles.value}>
              {profile?.anonymous ? "Anonymous" : "Public"}
            </Text>
          </LinearGradient>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={async () => {
              await logout();
            }}
          >
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>

      <Modal
        visible={spinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSpinModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            {latestSkin && (
              <>
                <Animated.Text
                  style={[
                    styles.sparkle,
                    styles.sparkleLeft,
                    {
                      opacity: sparkle1,
                      transform: [
                        {
                          translateY: sparkle1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, -10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  ✨
                </Animated.Text>

                <Animated.Text
                  style={[
                    styles.sparkle,
                    styles.sparkleRight,
                    {
                      opacity: sparkle2,
                      transform: [
                        {
                          translateY: sparkle2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, -16],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  🎉
                </Animated.Text>

                <Animated.Text
                  style={[
                    styles.sparkle,
                    styles.sparkleTop,
                    {
                      opacity: sparkle3,
                      transform: [
                        {
                          translateY: sparkle3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, -18],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  ✨
                </Animated.Text>

                <Text style={styles.modalTitle}>New Skin Unlocked!</Text>

                <View
                  style={[
                    styles.revealFrame,
                    { borderColor: RARITY_META[latestSkin.rarity].frameColor },
                  ]}
                >
                  <Image
                    source={{
                      uri: buildAvatarUrl(
                        latestSkin.avatarStyle,
                        latestSkin.avatarSeed,
                        180,
                      ),
                    }}
                    style={styles.revealAvatar}
                  />
                </View>

                <Text style={styles.revealName}>{latestSkin.name}</Text>

                <View
                  style={[
                    styles.revealPill,
                    {
                      backgroundColor:
                        RARITY_META[latestSkin.rarity].accentColor,
                    },
                  ]}
                >
                  <Text style={styles.revealPillText}>
                    {RARITY_META[latestSkin.rarity].label}
                  </Text>
                </View>

                {latestSkin.rewardTitle ? (
                  <Text style={styles.revealSubtitle}>
                    Unlocks title: {latestSkin.rewardTitle}
                  </Text>
                ) : null}

                {latestSpinMeta && (
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoText}>
                      {latestSpinMeta.usedFreeSpin
                        ? `Used a free spin • ${latestSpinMeta.freeSpinsRemaining} free spin${
                            latestSpinMeta.freeSpinsRemaining === 1 ? "" : "s"
                          } left today`
                        : `Spent ${latestSpinMeta.xpSpent} XP for this spin`}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleCloseSpinModal}
                    disabled={equippingLatest}
                  >
                    <Text style={styles.modalSecondaryText}>Keep Current</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleEquipLatest}
                    disabled={equippingLatest}
                  >
                    <Text style={styles.modalPrimaryText}>
                      {equippingLatest ? "Equipping..." : "Equip Now"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
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
    flexGrow: 1,
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

  closeButton: {
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

  closeText: {
    fontWeight: "900",
    fontSize: 18,
    color: "#111827",
  },

  heroCard: {
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  avatarFrame: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  avatar: {
    width: 122,
    height: 122,
    borderRadius: 61,
  },

  subtitle: {
    marginTop: 14,
    fontWeight: "900",
    fontSize: 24,
    color: "#111827",
    textAlign: "center",
  },

  titlePill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },

  titlePillText: {
    color: "#4338CA",
    fontWeight: "900",
    fontSize: 12,
  },

  countryPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFF7ED",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  countryPillText: {
    fontWeight: "800",
    color: "#374151",
  },

  perkText: {
    marginTop: 10,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "700",
  },

  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "800",
    textTransform: "uppercase",
  },

  card: {
    padding: 18,
    borderRadius: 22,
    marginTop: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  cardTitle: {
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 8,
    color: "#111827",
  },

  cardText: {
    marginTop: 4,
    color: "#444",
    lineHeight: 21,
    fontWeight: "600",
  },

  spinStatusBox: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 16,
    padding: 14,
  },

  spinStatusTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4338CA",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  spinStatusText: {
    color: "#4B5563",
    lineHeight: 20,
    fontWeight: "700",
    fontSize: 13,
  },

  primaryButton: {
    marginTop: 16,
    backgroundColor: "#6C63FF",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },

  primaryButtonDisabled: {
    backgroundColor: "#C7C6FF",
    shadowOpacity: 0,
    elevation: 0,
  },

  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
  },

  navSection: {
    marginTop: 18,
    gap: 12,
  },

  navButton: {
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  navText: {
    fontWeight: "900",
    fontSize: 16,
    color: "#111827",
  },

  label: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  value: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 3,
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },

  logoutButton: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },

  logoutText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    position: "relative",
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 14,
    textAlign: "center",
  },

  revealFrame: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  revealAvatar: {
    width: 136,
    height: 136,
    borderRadius: 68,
  },

  revealName: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  revealPill: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  revealPillText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  revealSubtitle: {
    marginTop: 10,
    color: "#555",
    textAlign: "center",
    fontWeight: "700",
  },

  modalInfoBox: {
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "stretch",
  },

  modalInfoText: {
    textAlign: "center",
    color: "#374151",
    fontWeight: "700",
    lineHeight: 20,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  modalPrimaryButton: {
    backgroundColor: "#333",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  modalPrimaryText: {
    color: "#fff",
    fontWeight: "800",
  },

  modalSecondaryButton: {
    backgroundColor: "#eee",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  modalSecondaryText: {
    color: "#333",
    fontWeight: "800",
  },

  sparkle: {
    position: "absolute",
    fontSize: 26,
  },

  sparkleLeft: {
    left: 32,
    top: 32,
  },

  sparkleRight: {
    right: 34,
    top: 54,
  },

  sparkleTop: {
    top: 18,
  },

  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
