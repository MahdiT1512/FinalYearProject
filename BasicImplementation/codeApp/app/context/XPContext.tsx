import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "./AuthContext";
import { isSameUtcDay } from "../data/countries";
import { syncUserBadges } from "../../services/badges";

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

export type LessonStat = {
  attempts: number;
  correctAnswers: number;
  wrongAnswers: number;
  completed: boolean;
  lastPracticedAt: number | null;
  lastRewardClaimedAt?: number | null;
};

type LessonStatsMap = Record<string, LessonStat>;

type XPContextType = {
  xp: number;
  level: number;
  allTimeXP: number;
  weeklyXP: number;
  monthlyXP: number;

  username: string;
  country: string;
  anonymous: boolean;
  userSkillLevel: SkillLevel;

  completedLessons: string[];
  lessonStats: LessonStatsMap;
  pendingReviewCount: number;

  streakCount: number;
  lastActiveAt: number | null;

  dailyRewardLastClaimedAt: number | null;
  canClaimDailyReward: () => boolean;
  claimDailyReward: () => Promise<number>;

  hearts: number;
  maxHearts: number;
  secondsUntilNextHeart: number | null;

  loading: boolean;

  addXP: (amount: number) => Promise<void>;
  completeLesson: (lessonId: string, xpAmount?: number) => Promise<number>;
  loseHeart: () => Promise<void>;
  refillHearts: (instant?: boolean) => Promise<void>;

  recordLessonAttempt: (lessonId: string) => Promise<void>;
  recordLessonAnswerResult: (
    lessonId: string,
    wasCorrect: boolean,
  ) => Promise<void>;
  markLessonCompleted: (lessonId: string) => Promise<void>;

  canEarnDeckReward: (lessonId: string) => boolean;
  markDeckRewardClaimed: (lessonId: string) => Promise<void>;
  getLessonXPModifier: () => number;

  recordDailyActivity: () => Promise<void>;
};

export const XPContext = createContext<XPContextType>({
  xp: 0,
  level: 1,
  allTimeXP: 0,
  weeklyXP: 0,
  monthlyXP: 0,

  username: "",
  country: "",
  anonymous: false,
  userSkillLevel: "Beginner",

  completedLessons: [],
  lessonStats: {},
  pendingReviewCount: 0,

  streakCount: 0,
  lastActiveAt: null,

  dailyRewardLastClaimedAt: null,
  canClaimDailyReward: () => false,
  claimDailyReward: async () => 0,

  hearts: 5,
  maxHearts: 5,
  secondsUntilNextHeart: null,

  loading: true,

  addXP: async () => {},
  completeLesson: async () => 0,
  loseHeart: async () => {},
  refillHearts: async () => {},

  recordLessonAttempt: async () => {},
  recordLessonAnswerResult: async () => {},
  markLessonCompleted: async () => {},

  canEarnDeckReward: () => false,
  markDeckRewardClaimed: async () => {},
  getLessonXPModifier: () => 1,

  recordDailyActivity: async () => {},
});

const REGEN_INTERVAL_MS = 60 * 1000;
const DEFAULT_MAX_HEARTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

//Calculates regenerated hearts from stored count and the last updated time
//Ensures hearts are capped and also updated even if user is offline
function computeHeartState(
  baseHearts: number,
  maxHearts: number,
  heartsUpdatedAt: number,
  now: number,
) {
  if (baseHearts >= maxHearts) {
    return {
      hearts: maxHearts,
      secondsUntilNextHeart: null as number | null,
      syncedHearts: maxHearts,
      syncedUpdatedAt: heartsUpdatedAt,
      changed: false,
    };
  }

  const elapsed = Math.max(0, now - heartsUpdatedAt);
  const recovered = Math.floor(elapsed / REGEN_INTERVAL_MS);
  const newHearts = Math.min(maxHearts, baseHearts + recovered);

  const syncedUpdatedAt =
    recovered > 0
      ? heartsUpdatedAt + recovered * REGEN_INTERVAL_MS
      : heartsUpdatedAt;

  const changed =
    newHearts !== baseHearts || syncedUpdatedAt !== heartsUpdatedAt;

  if (newHearts >= maxHearts) {
    return {
      hearts: newHearts,
      secondsUntilNextHeart: null as number | null,
      syncedHearts: newHearts,
      syncedUpdatedAt,
      changed,
    };
  }

  const remainder = elapsed % REGEN_INTERVAL_MS;
  const msUntilNext = REGEN_INTERVAL_MS - remainder;

  return {
    hearts: newHearts,
    secondsUntilNextHeart: Math.ceil(msUntilNext / 1000),
    syncedHearts: newHearts,
    syncedUpdatedAt,
    changed,
  };
}

//Checks if two timestamps are a day apart, allowing for daily reward and streak tracking
function isYesterday(timestampA?: number | null, timestampB?: number | null) {
  if (!timestampA || !timestampB) return false;

  const a = new Date(timestampA);
  const b = new Date(timestampB);

  const aUTC = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUTC = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());

  return bUTC - aUTC === DAY_MS;
}

//Main context provider for user progress and experience points(XP)
export const XPProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [allTimeXP, setAllTimeXP] = useState(0);
  const [weeklyXP, setWeeklyXP] = useState(0);
  const [monthlyXP, setMonthlyXP] = useState(0);

  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [userSkillLevel, setUserSkillLevel] = useState<SkillLevel>("Beginner");

  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonStats, setLessonStats] = useState<LessonStatsMap>({});

  const [streakCount, setStreakCount] = useState(0);
  const [lastActiveAt, setLastActiveAt] = useState<number | null>(null);
  const [dailyRewardLastClaimedAt, setDailyRewardLastClaimedAt] = useState<
    number | null
  >(null);

  const [baseHearts, setBaseHearts] = useState(DEFAULT_MAX_HEARTS);
  const [maxHearts, setMaxHearts] = useState(DEFAULT_MAX_HEARTS);
  const [heartsUpdatedAt, setHeartsUpdatedAt] = useState(Date.now());

  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setXP(0);
      setLevel(1);
      setAllTimeXP(0);
      setWeeklyXP(0);
      setMonthlyXP(0);
      setUsername("");
      setCountry("");
      setAnonymous(false);
      setUserSkillLevel("Beginner");
      setCompletedLessons([]);
      setLessonStats({});
      setStreakCount(0);
      setLastActiveAt(null);
      setDailyRewardLastClaimedAt(null);
      setBaseHearts(DEFAULT_MAX_HEARTS);
      setMaxHearts(DEFAULT_MAX_HEARTS);
      setHeartsUpdatedAt(Date.now());
      return;
    }

    setLoading(true);

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = snap.data();

      const firestoreMaxHearts = data.maxHearts ?? DEFAULT_MAX_HEARTS;
      const firestoreHearts = data.hearts ?? firestoreMaxHearts;
      const firestoreHeartsUpdatedAt = data.heartsUpdatedAt ?? Date.now();

      const computed = computeHeartState(
        firestoreHearts,
        firestoreMaxHearts,
        firestoreHeartsUpdatedAt,
        Date.now(),
      );

      setXP(data.xp ?? 0);
      setLevel(data.level ?? 1);
      setAllTimeXP(data.allTimeXP ?? 0);
      setWeeklyXP(data.weeklyXP ?? 0);
      setMonthlyXP(data.monthlyXP ?? 0);

      setUsername(data.username ?? "");
      setCountry(data.country ?? "");
      setAnonymous(!!data.anonymous);
      setUserSkillLevel((data.userSkillLevel as SkillLevel) ?? "Beginner");

      setCompletedLessons(data.completedLessons ?? []);
      setLessonStats(data.lessonStats ?? {});

      setStreakCount(data.streakCount ?? 0);
      setLastActiveAt(data.lastActiveAt ?? null);
      setDailyRewardLastClaimedAt(data.dailyRewardLastClaimedAt ?? null);

      setBaseHearts(computed.syncedHearts);
      setMaxHearts(firestoreMaxHearts);
      setHeartsUpdatedAt(computed.syncedUpdatedAt);
      //If enough time has lapsed, regenerate hearts and update Firestore to keep in sync, even if user is offline
      if (computed.changed) {
        await updateDoc(userRef, {
          hearts: computed.syncedHearts,
          heartsUpdatedAt: computed.syncedUpdatedAt,
        });
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const heartState = useMemo(() => {
    return computeHeartState(baseHearts, maxHearts, heartsUpdatedAt, nowTick);
  }, [baseHearts, maxHearts, heartsUpdatedAt, nowTick]);

  //Count of completed lessons that still have an available review reward today
  const pendingReviewCount = useMemo(() => {
    return Object.values(lessonStats).filter(
      (stat) =>
        stat.completed &&
        (!stat.lastRewardClaimedAt ||
          !isSameUtcDay(stat.lastRewardClaimedAt, Date.now())),
    ).length;
  }, [lessonStats]);

  //Modifies and disinsentivises user from continuing too dar while pending reviews are available
  //encouraging them to return to previous lessons through review mode
  const getLessonXPModifier = () => {
    if (pendingReviewCount >= 10) return 0.7;
    if (pendingReviewCount >= 6) return 0.8;
    if (pendingReviewCount >= 3) return 0.9;
    return 1;
  };

  //Updates the daily activity streak and last active time
  //The streak can only be increased once per day and is reset if user misses a day
  const recordDailyActivity = async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const currentLastActiveAt = data.lastActiveAt ?? null;
      const currentStreakCount = data.streakCount ?? 0;
      const now = Date.now();

      if (currentLastActiveAt && isSameUtcDay(currentLastActiveAt, now)) {
        return;
      }

      let nextStreak = 1;

      if (currentLastActiveAt && isYesterday(currentLastActiveAt, now)) {
        nextStreak = currentStreakCount + 1;
      }

      tx.update(userRef, {
        lastActiveAt: now,
        streakCount: nextStreak,
      });
    });

    await syncUserBadges(user.uid);
  };

  //Adds experience points to the user, handling level ups and ensuring all related stats are updated in Firestore
  const addXP = async (amount: number) => {
    if (!user || amount <= 0) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();

      const currentXP = data.xp ?? 0;
      const currentLevel = data.level ?? 1;
      const currentAllTimeXP = data.allTimeXP ?? 0;
      const currentWeeklyXP = data.weeklyXP ?? 0;
      const currentMonthlyXP = data.monthlyXP ?? 0;

      let totalXP = currentXP + amount;
      let newLevel = currentLevel;

      if (totalXP >= 100) {
        const levelIncrease = Math.floor(totalXP / 100);
        newLevel += levelIncrease;
        totalXP = totalXP % 100;
      }

      tx.update(userRef, {
        xp: totalXP,
        level: newLevel,
        allTimeXP: currentAllTimeXP + amount,
        weeklyXP: currentWeeklyXP + amount,
        monthlyXP: currentMonthlyXP + amount,
      });
    });

    await recordDailyActivity();
    await syncUserBadges(user.uid);
  };

  //Completes a lesson once and applies any modifiers and saves the performance stats for it
  const completeLesson = async (lessonId: string, xpAmount: number = 10) => {
    if (!user || !lessonId) return 0;

    const userRef = doc(db, "users", user.uid);
    let earnedXP = 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const currentCompletedLessons: string[] = data.completedLessons ?? [];
      const currentLessonStats: LessonStatsMap = data.lessonStats ?? {};

      const existingStat = currentLessonStats[lessonId] ?? {
        attempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        completed: false,
        lastPracticedAt: null,
        lastRewardClaimedAt: null,
      };

      let totalXP = data.xp ?? 0;
      let newLevel = data.level ?? 1;
      let currentAllTimeXP = data.allTimeXP ?? 0;
      let currentWeeklyXP = data.weeklyXP ?? 0;
      let currentMonthlyXP = data.monthlyXP ?? 0;

      if (!currentCompletedLessons.includes(lessonId) && xpAmount > 0) {
        const currentPendingReviews = Object.values(currentLessonStats).filter(
          (stat) =>
            stat.completed &&
            (!stat.lastRewardClaimedAt ||
              !isSameUtcDay(stat.lastRewardClaimedAt, Date.now())),
        ).length;

        let modifier = 1;
        if (currentPendingReviews >= 10) modifier = 0.7;
        else if (currentPendingReviews >= 6) modifier = 0.8;
        else if (currentPendingReviews >= 3) modifier = 0.9;

        earnedXP = Math.max(5, Math.round(xpAmount * modifier));

        totalXP += earnedXP;
        currentAllTimeXP += earnedXP;
        currentWeeklyXP += earnedXP;
        currentMonthlyXP += earnedXP;

        if (totalXP >= 100) {
          const levelIncrease = Math.floor(totalXP / 100);
          newLevel += levelIncrease;
          totalXP = totalXP % 100;
        }
      }

      tx.update(userRef, {
        completedLessons: currentCompletedLessons.includes(lessonId)
          ? currentCompletedLessons
          : [...currentCompletedLessons, lessonId],
        xp: totalXP,
        level: newLevel,
        allTimeXP: currentAllTimeXP,
        weeklyXP: currentWeeklyXP,
        monthlyXP: currentMonthlyXP,
        lessonStats: {
          ...currentLessonStats,
          [lessonId]: {
            ...existingStat,
            completed: true,
            lastPracticedAt: Date.now(),
          },
        },
      });
    });

    await recordDailyActivity();
    await syncUserBadges(user.uid);
    return earnedXP;
  };

  //Records that the lesson was attempted so the Lesson Deck can track practice history
  const recordLessonAttempt = async (lessonId: string) => {
    if (!user || !lessonId) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const currentLessonStats: LessonStatsMap = data.lessonStats ?? {};
      const existingStat = currentLessonStats[lessonId] ?? {
        attempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        completed: false,
        lastPracticedAt: null,
        lastRewardClaimedAt: null,
      };

      tx.update(userRef, {
        lessonStats: {
          ...currentLessonStats,
          [lessonId]: {
            ...existingStat,
            attempts: (existingStat.attempts ?? 0) + 1,
            lastPracticedAt: Date.now(),
          },
        },
      });
    });

    await recordDailyActivity();
  };

  //Saves the performance of a lesson attempt, for later prioritisation in the Lesson Deck
  const recordLessonAnswerResult = async (
    lessonId: string,
    wasCorrect: boolean,
  ) => {
    if (!user || !lessonId) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const currentLessonStats: LessonStatsMap = data.lessonStats ?? {};
      const existingStat = currentLessonStats[lessonId] ?? {
        attempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        completed: false,
        lastPracticedAt: null,
        lastRewardClaimedAt: null,
      };

      tx.update(userRef, {
        lessonStats: {
          ...currentLessonStats,
          [lessonId]: {
            ...existingStat,
            correctAnswers:
              (existingStat.correctAnswers ?? 0) + (wasCorrect ? 1 : 0),
            wrongAnswers:
              (existingStat.wrongAnswers ?? 0) + (wasCorrect ? 0 : 1),
            lastPracticedAt: Date.now(),
          },
        },
      });
    });

    await recordDailyActivity();
  };

  const markLessonCompleted = async (lessonId: string) => {
    if (!user || !lessonId) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const currentCompletedLessons: string[] = data.completedLessons ?? [];
      const currentLessonStats: LessonStatsMap = data.lessonStats ?? {};
      const existingStat = currentLessonStats[lessonId] ?? {
        attempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        completed: false,
        lastPracticedAt: null,
        lastRewardClaimedAt: null,
      };

      tx.update(userRef, {
        completedLessons: currentCompletedLessons.includes(lessonId)
          ? currentCompletedLessons
          : [...currentCompletedLessons, lessonId],
        lessonStats: {
          ...currentLessonStats,
          [lessonId]: {
            ...existingStat,
            completed: true,
            lastPracticedAt: Date.now(),
          },
        },
      });
    });

    await recordDailyActivity();
    await syncUserBadges(user.uid);
  };

  const loseHeart = async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const currentHearts = computeHeartState(
      baseHearts,
      maxHearts,
      heartsUpdatedAt,
      Date.now(),
    ).hearts;

    const nextHearts = Math.max(0, currentHearts - 1);
    const now = Date.now();

    setBaseHearts(nextHearts);
    setHeartsUpdatedAt(now);

    await updateDoc(userRef, {
      hearts: nextHearts,
      heartsUpdatedAt: now,
    });

    await recordDailyActivity();
  };

  const refillHearts = async (instant: boolean = false) => {
    if (!user || !instant) return;

    const userRef = doc(db, "users", user.uid);
    const now = Date.now();

    setBaseHearts(maxHearts);
    setHeartsUpdatedAt(now);

    await updateDoc(userRef, {
      hearts: maxHearts,
      heartsUpdatedAt: now,
    });

    await recordDailyActivity();
  };

  const canEarnDeckReward = (lessonId: string) => {
    const stat = lessonStats[lessonId];
    if (!stat?.completed) return false;
    if (!stat.lastRewardClaimedAt) return true;
    return !isSameUtcDay(stat.lastRewardClaimedAt, Date.now());
  };

  const markDeckRewardClaimed = async (lessonId: string) => {
    if (!user || !lessonId) return;

    const userRef = doc(db, "users", user.uid);
    const currentLessonStats = lessonStats ?? {};
    const existingStat = currentLessonStats[lessonId];

    if (!existingStat) return;

    await updateDoc(userRef, {
      lessonStats: {
        ...currentLessonStats,
        [lessonId]: {
          ...existingStat,
          lastRewardClaimedAt: Date.now(),
          lastPracticedAt: Date.now(),
        },
      },
    });

    await recordDailyActivity();
    await syncUserBadges(user.uid);
  };

  const canClaimDailyReward = () => {
    if (!dailyRewardLastClaimedAt) return true;
    return !isSameUtcDay(dailyRewardLastClaimedAt, Date.now());
  };

  const claimDailyReward = async () => {
    if (!user) return 0;

    const userRef = doc(db, "users", user.uid);
    let reward = 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const lastClaimed = data.dailyRewardLastClaimedAt ?? null;
      const currentStreak = data.streakCount ?? 0;

      if (lastClaimed && isSameUtcDay(lastClaimed, Date.now())) {
        reward = 0;
        return;
      }

      reward = Math.min(50, 10 + currentStreak * 2);

      const currentXP = data.xp ?? 0;
      const currentLevel = data.level ?? 1;
      const currentAllTimeXP = data.allTimeXP ?? 0;
      const currentWeeklyXP = data.weeklyXP ?? 0;
      const currentMonthlyXP = data.monthlyXP ?? 0;

      let totalXP = currentXP + reward;
      let newLevel = currentLevel;

      if (totalXP >= 100) {
        const levelIncrease = Math.floor(totalXP / 100);
        newLevel += levelIncrease;
        totalXP = totalXP % 100;
      }

      tx.update(userRef, {
        xp: totalXP,
        level: newLevel,
        allTimeXP: currentAllTimeXP + reward,
        weeklyXP: currentWeeklyXP + reward,
        monthlyXP: currentMonthlyXP + reward,
        dailyRewardLastClaimedAt: Date.now(),
      });
    });

    await recordDailyActivity();
    await syncUserBadges(user.uid);
    return reward;
  };

  return (
    <XPContext.Provider
      value={{
        xp,
        level,
        allTimeXP,
        weeklyXP,
        monthlyXP,

        username,
        country,
        anonymous,
        userSkillLevel,

        completedLessons,
        lessonStats,
        pendingReviewCount,

        streakCount,
        lastActiveAt,

        dailyRewardLastClaimedAt,
        canClaimDailyReward,
        claimDailyReward,

        hearts: heartState.hearts,
        maxHearts,
        secondsUntilNextHeart: heartState.secondsUntilNextHeart,

        loading,

        addXP,
        completeLesson,
        loseHeart,
        refillHearts,

        recordLessonAttempt,
        recordLessonAnswerResult,
        markLessonCompleted,

        canEarnDeckReward,
        markDeckRewardClaimed,
        getLessonXPModifier,

        recordDailyActivity,
      }}
    >
      {children}
    </XPContext.Provider>
  );
};
