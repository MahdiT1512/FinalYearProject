import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type UserBadge = {
  id: string;
  unlocked: boolean;
  unlockedAt: number | null;
};


//The badge definitions that set the critera and achievement for each badge. 
//These include an icon representing a colour and a description of how to unlock the badge.
export const BADGE_DEFS = [
  {
    id: "first_lesson",
    name: "First Steps",
    description: "Complete your first lesson",
    icon: "🚀",
    accent: "#6C63FF",
  },
  {
    id: "xp_100",
    name: "Getting Started",
    description: "Reach 100 XP",
    icon: "⭐",
    accent: "#F59E0B",
  },
  {
    id: "xp_1000",
    name: "Grinder",
    description: "Reach 1000 XP",
    icon: "🔥",
    accent: "#EF4444",
  },
  {
    id: "spin_1",
    name: "Lucky",
    description: "Use your first spin",
    icon: "🎰",
    accent: "#10B981",
  },
  {
    id: "streak_3",
    name: "On Fire",
    description: "Reach a 3 day streak",
    icon: "⚡",
    accent: "#F97316",
  },
  {
    id: "streak_7",
    name: "Unstoppable",
    description: "Reach a 7 day streak",
    icon: "👑",
    accent: "#8B5CF6",
  },
  {
    id: "review_1",
    name: "Reviewer",
    description: "Claim your first lesson deck review reward",
    icon: "🛡️",
    accent: "#3B82F6",
  },
] as const;

export type BadgeDefinition = (typeof BADGE_DEFS)[number];

type BadgeSourceUser = {
  completedLessons?: string[];
  allTimeXP?: number;
  streakCount?: number;
  totalSpinsUsed?: number;
  lessonStats?: Record<
    string,
    {
      lastRewardClaimedAt?: number | null;
    }
  >;
  badges?: UserBadge[] | string[];
};

//For converting older badge system to new ones
//Kept for reference and stability as older accounts may have been created using the old badge system.
const toBadgeMap = (badges: BadgeSourceUser["badges"]) => {
  const map: Record<string, UserBadge> = {};

  if (!Array.isArray(badges)) return map;

  badges.forEach((badge) => {
    if (typeof badge === "string") {
      map[badge] = {
        id: badge,
        unlocked: true,
        unlockedAt: null,
      };
      return;
    }

    if (badge?.id) {
      map[badge.id] = {
        id: badge.id,
        unlocked: !!badge.unlocked,
        unlockedAt: badge.unlockedAt ?? null,
      };
    }
  });

  return map;
};

export const getBadgeDefinition = (badgeId: string): BadgeDefinition | undefined =>
  BADGE_DEFS.find((badge) => badge.id === badgeId);

export const getUnlockedBadgeDefinitions = (badges: UserBadge[] | string[] | undefined) => {
  const badgeMap = toBadgeMap(badges);

  return BADGE_DEFS.filter((badge) => badgeMap[badge.id]?.unlocked);
};

//Syncs up user progress against all existing badge conditions.
// To ensure that all badges that are unlocked are correctly awarded and applied to user account.
export const syncUserBadges = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return [];

  const data = snap.data() as BadgeSourceUser;
  const existing = toBadgeMap(data.badges);

  //Each of the badges functional or mathematical condition is defined below.
  const shouldUnlock = (badgeId: string) => {
    switch (badgeId) {
      case "first_lesson":
        return (data.completedLessons?.length ?? 0) >= 1;

      case "xp_100":
        return (data.allTimeXP ?? 0) >= 100;

      case "xp_1000":
        return (data.allTimeXP ?? 0) >= 1000;

      case "spin_1":
        return (data.totalSpinsUsed ?? 0) >= 1;

      case "streak_3":
        return (data.streakCount ?? 0) >= 3;

      case "streak_7":
        return (data.streakCount ?? 0) >= 7;

      case "review_1":
        return Object.values(data.lessonStats ?? {}).some(
          (stat) => !!stat?.lastRewardClaimedAt,
        );

      default:
        return false;
    }
  };

  const now = Date.now();
  let changed = false;

  for (const badge of BADGE_DEFS) {
    const already = existing[badge.id];
    const unlocked = shouldUnlock(badge.id);

    if (unlocked && !already?.unlocked) {
      existing[badge.id] = {
        id: badge.id,
        unlocked: true,
        unlockedAt: now,
      };
      changed = true;
    } else if (!already) {
      existing[badge.id] = {
        id: badge.id,
        unlocked: false,
        unlockedAt: null,
      };
      changed = true;
    }
  }

  if (changed) {
    await updateDoc(userRef, {
      badges: Object.values(existing),
    });
  }

  return Object.values(existing).filter((badge) => badge.unlocked);
};