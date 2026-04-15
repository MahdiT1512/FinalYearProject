import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../../firebase/config";
import { useAuth } from "../context/AuthContext";
import {
  buildAvatarUrl,
  DEFAULT_AVATAR_STYLE,
  UserAvatarSkin,
} from "../../services/avatar";
import CountryFlag from "../Components/common/CountryFlag";
import { getCountryName } from "../data/countries";

type UserDoc = {
  username?: string;
  country?: string;
  userSkillLevel?: "Beginner" | "Intermediate" | "Advanced";
  avatars?: UserAvatarSkin[];
  equippedAvatarId?: string;
  equippedTitle?: string | null;
  hasCompletedOnboarding?: boolean;
  hasSeenWelcomeReward?: boolean;
  preferredStartPath?: "lessons" | "syntax" | "profile" | null;
};

export default function WelcomeOnboardingScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserDoc | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data() as UserDoc;

        if (data.hasCompletedOnboarding) {
          router.replace("/");
          return;
        }

        setProfile(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const avatarUrl = useMemo(() => {
    if (!user) return buildAvatarUrl(DEFAULT_AVATAR_STYLE, "guest", 180);

    const avatars = profile?.avatars ?? [];
    const equipped = avatars.find((a) => a.id === profile?.equippedAvatarId);

    if (equipped) {
      return buildAvatarUrl(equipped.avatarStyle, equipped.avatarSeed, 180);
    }

    return buildAvatarUrl(DEFAULT_AVATAR_STYLE, user.uid, 180);
  }, [profile, user]);

  if (loading) {
    return (
      <LinearGradient
        colors={["#A0E7E5", "#CDB4FF", "#FFAFCC"]}
        style={styles.center}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient
        colors={["#A0E7E5", "#CDB4FF", "#FFAFCC"]}
        style={styles.center}
      >
        <Text style={styles.fallbackText}>Could not load onboarding.</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#A0E7E5", "#CDB4FF", "#FFAFCC"]}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroGlow} />

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Welcome to CodeSpark</Text>
          <Text style={styles.title}>
            You’re in, {profile.username || "Coder"} 🎉
          </Text>
          <Text style={styles.subtitle}>
            Your CodeSpark account is ready. You’ve got your starter profile,
            level, and learning path — now let’s make the app feel familiar
            before you jump in.
          </Text>

          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={["#6C63FF", "#FF6B6B"]}
              style={styles.avatarRing}
            >
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            </LinearGradient>
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaCardTitle}>Your starter setup</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Skill level</Text>
              <Text style={styles.metaValue}>
                {profile.userSkillLevel || "Beginner"}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Country</Text>
              <View style={styles.countryRow}>
                <CountryFlag countryCode={profile.country} size={18} />
                <Text style={styles.metaValue}>
                  {getCountryName(profile.country)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Equipped title</Text>
              <Text style={styles.metaValue}>
                {profile.equippedTitle || "Code Rookie"}
              </Text>
            </View>
          </View>

          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>What CodeSpark gives you</Text>
            <Text style={styles.rewardText}>
              ✨ Guided lessons matched to your level
            </Text>
            <Text style={styles.rewardText}>
              📚 Review deck and syntax practice to reinforce memory
            </Text>
            <Text style={styles.rewardText}>
              🏆 XP, streaks, daily goals, badges, titles, and project unlocks
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/onboarding/get-started")}
          >
            <Text style={styles.primaryButtonText}>Show Me Around</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/User/MyProfile",
                params: {
                  returnTo: "/onboarding/welcome",
                  fromOnboarding: "1",
                },
              })
            }
          >
            <Text style={styles.secondaryButtonText}>
              View My Profile First
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 36,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  fallbackText: {
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 16,
    fontWeight: "700",
  },

  heroGlow: {
    position: "absolute",
    top: 80,
    left: 40,
    right: 40,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },

  eyebrow: {
    color: "#6C63FF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  title: {
    fontSize: 31,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },

  avatarWrap: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 18,
  },

  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#FFFFFF",
  },

  metaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },

  metaCardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },

  metaRow: {
    marginTop: 8,
  },

  metaLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },

  metaValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "800",
  },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  rewardCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 18,
  },

  rewardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#4338CA",
    marginBottom: 8,
  },

  rewardText: {
    fontSize: 14,
    color: "#4C1D95",
    lineHeight: 22,
    fontWeight: "700",
  },

  primaryButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#FFF1F2",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE4E6",
  },

  secondaryButtonText: {
    color: "#BE123C",
    fontSize: 14,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
