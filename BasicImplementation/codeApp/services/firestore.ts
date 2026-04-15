import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  buildAvatarUrl,
  makeDefaultAvatarSkin,
  UserAvatarSkin,
} from "./avatar";
import { DAILY_FREE_SPINS, EXTRA_SPIN_COST_XP, getUTCDateKey } from "./spin";
import { getCountryName, normalizeCountryCode } from "../app/data/countries";

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

type CreateUserDocArgs = {
  email: string;
  username: string;
  country: string;
  userSkillLevel: SkillLevel;
};

export const createUserDoc = async (
  uid: string,
  data: CreateUserDocArgs,
) => {
  const defaultAvatar = makeDefaultAvatarSkin(uid);
  const normalizedCountry = normalizeCountryCode(data.country);

  await setDoc(doc(db, "users", uid), {
    uid,
    email: data.email,
    username: data.username.trim(),
    country: normalizedCountry,
    countryName: getCountryName(normalizedCountry),
    userSkillLevel: data.userSkillLevel,

    anonymous: false,

    hasCompletedOnboarding: false,
    hasSeenWelcomeReward: false,
    starterTitleUnlocked: true,

    xp: 0,
    level: 1,
    hearts: 5,
    maxHearts: 5,
    heartsUpdatedAt: Date.now(),

    completedLessons: [],
    lessonStats: {},

    badges: [],

    streakCount: 0,
    lastActiveAt: null,

    dailyRewardLastClaimedAt: null,

    weeklyXP: 0,
    monthlyXP: 0,
    allTimeXP: 0,

    avatars: [defaultAvatar],
    equippedAvatarId: defaultAvatar.id,
    equippedRarity: defaultAvatar.rarity,
    equippedTitle: defaultAvatar.rewardTitle || "Code Rookie",

    unlockedTitles: defaultAvatar.rewardTitle
      ? [defaultAvatar.rewardTitle]
      : ["Code Rookie"],

    photoURL: buildAvatarUrl(
      defaultAvatar.avatarStyle,
      defaultAvatar.avatarSeed,
      128,
    ),

    freeSpinsRemaining: DAILY_FREE_SPINS,
    spinResetDateKey: getUTCDateKey(),
    spinCostXP: EXTRA_SPIN_COST_XP,
    totalSpinsUsed: 0,

    createdAt: Date.now(),
  });
};

export const addAvatarToUser = async (uid: string, avatar: UserAvatarSkin) => {
  await updateDoc(doc(db, "users", uid), {
    avatars: arrayUnion(avatar),
  });
};

export const equipAvatar = async (uid: string, avatarId: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return;

  const data = snap.data() as {
    avatars?: UserAvatarSkin[];
  };

  const selected = data.avatars?.find((a) => a.id === avatarId);
  if (!selected) return;

  await updateDoc(userRef, {
    equippedAvatarId: avatarId,
    equippedRarity: selected.rarity,
    equippedTitle: selected.rewardTitle,
    photoURL: buildAvatarUrl(selected.avatarStyle, selected.avatarSeed, 128),
  });
};

export const resetUserAvatars = async (uid: string) => {
  const defaultAvatar = makeDefaultAvatarSkin(uid);

  await setDoc(
    doc(db, "users", uid),
    {
      avatars: [defaultAvatar],
      equippedAvatarId: defaultAvatar.id,
      equippedRarity: defaultAvatar.rarity,
      equippedTitle: defaultAvatar.rewardTitle || "Code Rookie",
      unlockedTitles: defaultAvatar.rewardTitle
        ? [defaultAvatar.rewardTitle]
        : ["Code Rookie"],
      photoURL: buildAvatarUrl(
        defaultAvatar.avatarStyle,
        defaultAvatar.avatarSeed,
        128,
      ),
    },
    { merge: true },
  );
};