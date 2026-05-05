import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  AvatarRarity,
  UserAvatarSkin,
  getUnlockedRarities,
  makeSpinAvatarSkin,
  RARITY_META,
} from "./avatar";
import { syncUserBadges } from "./badges";

export const DAILY_FREE_SPINS = 3;
export const EXTRA_SPIN_COST_XP = 50;

export const getUTCDateKey = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type UserDoc = {
  xp?: number;
  allTimeXP?: number;
  freeSpinsRemaining?: number;
  spinResetDateKey?: string;
  avatars?: UserAvatarSkin[];
  equippedAvatarId?: string;
  totalSpinsUsed?: number;
  unlockedTitles?: string[];
};

export type SpinResult = {
  skin: UserAvatarSkin;
  usedFreeSpin: boolean;
  xpSpent: number;
  freeSpinsRemaining: number;
  titleUnlocked: string | null;
};

//Resets free spins if it's a new day based on the spinResetDateKey and the current date.
const resetIfNewDay = (data: UserDoc) => {
  const today = getUTCDateKey();
  if ((data.spinResetDateKey ?? "") !== today) {
    return {
      ...data,
      freeSpinsRemaining: DAILY_FREE_SPINS,
      spinResetDateKey: today,
    };
  }
  return data;
};

//Synchronises the user's free spin count at the start of each day
export const syncDailySpinReset = async (uid: string) => {
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;

    const raw = snap.data() as UserDoc;
    const data = resetIfNewDay(raw);

    if (raw.spinResetDateKey !== data.spinResetDateKey) {
      tx.update(userRef, {
        freeSpinsRemaining: DAILY_FREE_SPINS,
        spinResetDateKey: data.spinResetDateKey,
      });
    }
  });
};

//Handles the full logic for spinning for an avatar 
//This includes deciding if its a free or XP based spin and then awarding and storing 
//the generated avatar.
export const spinAvatar = async (uid: string): Promise<SpinResult> => {
  const userRef = doc(db, "users", uid);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);

    if (!snap.exists()) {
      throw new Error("User document not found.");
    }

    const raw = snap.data() as UserDoc;
    const data = resetIfNewDay(raw);

    const xp = data.xp ?? 0;
    const allTimeXP = data.allTimeXP ?? 0;
    const avatars = data.avatars ?? [];
    const totalSpinsUsed = data.totalSpinsUsed ?? 0;
    const unlockedTitles = data.unlockedTitles ?? [];

    let freeSpinsRemaining = data.freeSpinsRemaining ?? DAILY_FREE_SPINS;
    let usedFreeSpin = false;
    let xpSpent = 0;

    if (freeSpinsRemaining > 0) {
      freeSpinsRemaining -= 1;
      usedFreeSpin = true;
    } else {
      if (xp < EXTRA_SPIN_COST_XP) {
        throw new Error(
          `Not enough XP for an extra spin. You need ${EXTRA_SPIN_COST_XP} XP.`,
        );
      }
      xpSpent = EXTRA_SPIN_COST_XP;
    }

    const skin = makeSpinAvatarSkin(uid, allTimeXP);
    const nextXP = xpSpent > 0 ? xp - xpSpent : xp;
    const nextAvatars = [...avatars, skin];

    const titleUnlocked =
      skin.rewardTitle && !unlockedTitles.includes(skin.rewardTitle)
        ? skin.rewardTitle
        : null;

    const nextUnlockedTitles = titleUnlocked
      ? [...unlockedTitles, titleUnlocked]
      : unlockedTitles;

    tx.update(userRef, {
      xp: nextXP,
      freeSpinsRemaining,
      spinResetDateKey: getUTCDateKey(),
      avatars: nextAvatars,
      unlockedTitles: nextUnlockedTitles,
      totalSpinsUsed: totalSpinsUsed + 1,
    });

    return {
      skin,
      usedFreeSpin,
      xpSpent,
      freeSpinsRemaining,
      titleUnlocked,
    };
  });

  await syncUserBadges(uid);
  return result;
};

//Calculates the remaining time until new UTC daily reset
export const getTimeUntilNextReset = () => {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);

  const diff = next.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
};

export const getSpinInfoText = (
  freeSpinsRemaining: number,
  xp: number,
  allTimeXP: number,
) => {
  const unlocked = getUnlockedRarities(allTimeXP);
  const topRarity = unlocked[unlocked.length - 1] as AvatarRarity;

  return {
    canFreeSpin: freeSpinsRemaining > 0,
    canExtraSpin: xp >= EXTRA_SPIN_COST_XP,
    topRarity,
    rarityLabel: RARITY_META[topRarity].label,
  };
};