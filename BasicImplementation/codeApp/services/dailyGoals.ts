import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase/config";

export type DailyActivity = {
  dateKey: string;
  lessonsCompleted: number;
  syntaxAnswered: number;
  syntaxCorrect: number;
  projectsCompleted: number;
  xpEarned: number;
  claimedGoalIds: string[];
  allGoalsRewardClaimed: boolean;
};

export type DailyGoalDef = {
  id: "lesson_1" | "syntax_10" | "xp_50";
  label: string;
  target: number;
  progressKey: keyof Omit<
    DailyActivity,
    "dateKey" | "syntaxCorrect" | "claimedGoalIds" | "allGoalsRewardClaimed"
  >;
  rewardXP: number;
};

//A constant of the daily goals that users can complete each day for rewards.
export const DAILY_GOALS: DailyGoalDef[] = [
  {
    id: "lesson_1",
    label: "Complete 1 lesson",
    target: 1,
    progressKey: "lessonsCompleted",
    rewardXP: 15,
  },
  {
    id: "syntax_10",
    label: "Answer 10 syntax questions",
    target: 10,
    progressKey: "syntaxAnswered",
    rewardXP: 20,
  },
  {
    id: "xp_50",
    label: "Earn 50 XP",
    target: 50,
    progressKey: "xpEarned",
    rewardXP: 25,
  },
];

export const ALL_GOALS_REWARD_XP = 30;


//Daily goals use a date key to track the days.
//This allows daily goal progress to reset each day based on UTC.
export const getUTCDateKey = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const makeEmptyDailyActivity = (
  dateKey = getUTCDateKey(),
): DailyActivity => ({
  dateKey,
  lessonsCompleted: 0,
  syntaxAnswered: 0,
  syntaxCorrect: 0,
  projectsCompleted: 0,
  xpEarned: 0,
  claimedGoalIds: [],
  allGoalsRewardClaimed: false,
});

//Ensures that any missing or older daily activity data is cleaned and replaced with 
//the new activity object for today
export const normalizeDailyActivity = (raw: any): DailyActivity => {
  const today = getUTCDateKey();

  if (!raw || raw.dateKey !== today) {
    return makeEmptyDailyActivity(today);
  }

  return {
    dateKey: raw.dateKey,
    lessonsCompleted: raw.lessonsCompleted ?? 0,
    syntaxAnswered: raw.syntaxAnswered ?? 0,
    syntaxCorrect: raw.syntaxCorrect ?? 0,
    projectsCompleted: raw.projectsCompleted ?? 0,
    xpEarned: raw.xpEarned ?? 0,
    claimedGoalIds: Array.isArray(raw.claimedGoalIds) ? raw.claimedGoalIds : [],
    allGoalsRewardClaimed: !!raw.allGoalsRewardClaimed,
  };
};

//This function allows the daily goal progress to be capped out at 100% so if the user does exceed it, 
// it doesn't display or break the UI.
export const getGoalProgress = (
  goal: DailyGoalDef,
  activity: DailyActivity,
): number => {
  const raw = Number(activity[goal.progressKey] ?? 0);
  return Math.min(raw, goal.target);
};

export const isGoalComplete = (
  goal: DailyGoalDef,
  activity: DailyActivity,
): boolean => {
  return getGoalProgress(goal, activity) >= goal.target;
};

export const isGoalClaimed = (
  goalId: string,
  activity: DailyActivity,
): boolean => {
  return activity.claimedGoalIds.includes(goalId);
};

export const canClaimGoalReward = (
  goal: DailyGoalDef,
  activity: DailyActivity,
): boolean => {
  return isGoalComplete(goal, activity) && !isGoalClaimed(goal.id, activity);
};

export const getCompletedGoalIds = (activity: DailyActivity): string[] => {
  return DAILY_GOALS.filter((goal) => isGoalComplete(goal, activity)).map(
    (goal) => goal.id,
  );
};

export const areAllDailyGoalsComplete = (activity: DailyActivity): boolean => {
  return DAILY_GOALS.every((goal) => isGoalComplete(goal, activity));
};

export const canClaimAllGoalsReward = (activity: DailyActivity): boolean => {
  return (
    areAllDailyGoalsComplete(activity) && !activity.allGoalsRewardClaimed
  );
};

export type RecordDailyProgressArgs = {
  lessonsCompleted?: number;
  syntaxAnswered?: number;
  syntaxCorrect?: number;
  projectsCompleted?: number;
  xpEarned?: number;
};

//Applies the XP reward to all relevant user XP totals, and then ensures spillover can also occur when a daily reward is claimed.
const addXPToUserTotals = (data: any, rewardXP: number) => {
  const currentXP = data.xp ?? 0;
  const currentLevel = data.level ?? 1;
  const currentAllTimeXP = data.allTimeXP ?? 0;
  const currentWeeklyXP = data.weeklyXP ?? 0;
  const currentMonthlyXP = data.monthlyXP ?? 0;

  let nextXP = currentXP + rewardXP;
  let nextLevel = currentLevel;

  if (nextXP >= 100) {
    const levelIncrease = Math.floor(nextXP / 100);
    nextLevel += levelIncrease;
    nextXP = nextXP % 100;
  }

  return {
    xp: nextXP,
    level: nextLevel,
    allTimeXP: currentAllTimeXP + rewardXP,
    weeklyXP: currentWeeklyXP + rewardXP,
    monthlyXP: currentMonthlyXP + rewardXP,
  };
};

//Uses transactions to ensure concurrent updates do not overwrite one another and 
//that all updates are based on the most recent available data
export const recordDailyProgress = async (
  uid: string,
  update: RecordDailyProgressArgs,
) => {
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const current = normalizeDailyActivity(data.dailyActivity);

    const next: DailyActivity = {
      ...current,
      lessonsCompleted:
        current.lessonsCompleted + (update.lessonsCompleted ?? 0),
      syntaxAnswered: current.syntaxAnswered + (update.syntaxAnswered ?? 0),
      syntaxCorrect: current.syntaxCorrect + (update.syntaxCorrect ?? 0),
      projectsCompleted:
        current.projectsCompleted + (update.projectsCompleted ?? 0),
      xpEarned: current.xpEarned + (update.xpEarned ?? 0),
    };

    tx.update(userRef, {
      dailyActivity: next,
    });
  });
};


//Claims a single rward if the goal has been completed and has not already been claimed
export const claimDailyGoalReward = async (
  uid: string,
  goalId: DailyGoalDef["id"],
): Promise<number> => {
  const userRef = doc(db, "users", uid);
  let rewardedXP = 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const activity = normalizeDailyActivity(data.dailyActivity);
    const goal = DAILY_GOALS.find((item) => item.id === goalId);

    if (!goal) return;
    if (!canClaimGoalReward(goal, activity)) return;

    rewardedXP = goal.rewardXP;
    const xpUpdate = addXPToUserTotals(data, rewardedXP);

    tx.update(userRef, {
      ...xpUpdate,
      dailyActivity: {
        ...activity,
        claimedGoalIds: [...activity.claimedGoalIds, goal.id],
      },
    });
  });

  return rewardedXP;
};


//Claims the bonus all daily goal reward which is available only when all goals are completed
//and when it has not already been claimed.
export const claimAllDailyGoalsReward = async (
  uid: string,
): Promise<number> => {
  const userRef = doc(db, "users", uid);
  let rewardedXP = 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const activity = normalizeDailyActivity(data.dailyActivity);

    if (!canClaimAllGoalsReward(activity)) return;

    rewardedXP = ALL_GOALS_REWARD_XP;
    const xpUpdate = addXPToUserTotals(data, rewardedXP);

    tx.update(userRef, {
      ...xpUpdate,
      dailyActivity: {
        ...activity,
        allGoalsRewardClaimed: true,
      },
    });
  });

  return rewardedXP;
};

export const getUserDailyActivity = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return makeEmptyDailyActivity();
  return normalizeDailyActivity(snap.data().dailyActivity);
};