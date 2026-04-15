import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "./AuthContext";
import {
  ALL_GOALS_REWARD_XP,
  areAllDailyGoalsComplete,
  canClaimAllGoalsReward as canClaimAllDailyGoalsRewardService,
  canClaimGoalReward as canClaimDailyGoalRewardService,
  claimAllDailyGoalsReward,
  claimDailyGoalReward,
  DAILY_GOALS,
  DailyActivity,
  getGoalProgress,
  getUTCDateKey,
  isGoalClaimed,
  isGoalComplete,
  makeEmptyDailyActivity,
  normalizeDailyActivity,
  recordDailyProgress,
} from "../../services/dailyGoals";
import { useUnlocks } from "./UnlocksContext";

type DailyGoalView = {
  id: string;
  label: string;
  target: number;
  progress: number;
  complete: boolean;
  claimed: boolean;
  claimable: boolean;
  rewardXP: number;
};

type DailyGoalsContextType = {
  activity: DailyActivity;
  goals: DailyGoalView[];
  completeCount: number;
  allComplete: boolean;
  allGoalsRewardXP: number;
  allGoalsRewardClaimed: boolean;
  canClaimAllGoalsReward: boolean;
  claimGoalReward: (goalId: DailyGoalView["id"]) => Promise<number>;
  claimAllGoalsReward: () => Promise<number>;
  recordLessonComplete: (xpEarned?: number) => Promise<void>;
  recordSyntaxAnswered: (correct: boolean, xpEarned?: number) => Promise<void>;
  recordProjectComplete: (xpEarned?: number) => Promise<void>;
  recordXPEarned: (xpEarned: number) => Promise<void>;
};

const DailyGoalsContext = createContext<DailyGoalsContextType | undefined>(
  undefined,
);

export const DailyGoalsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { pushUnlock } = useUnlocks();

  const [activity, setActivity] = useState<DailyActivity>(
    makeEmptyDailyActivity(),
  );
  const [seenDailyCompleteKey, setSeenDailyCompleteKey] = useState("");
  const [seenAllGoalsClaimKey, setSeenAllGoalsClaimKey] = useState("");

  useEffect(() => {
    if (!user) {
      setActivity(makeEmptyDailyActivity());
      setSeenDailyCompleteKey("");
      setSeenAllGoalsClaimKey("");
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) {
        setActivity(makeEmptyDailyActivity());
        return;
      }

      const nextActivity = normalizeDailyActivity(snap.data().dailyActivity);
      setActivity(nextActivity);
    });

    return unsub;
  }, [user]);

  useEffect(() => {
    const todayKey = getUTCDateKey();

    if (
      areAllDailyGoalsComplete(activity) &&
      seenDailyCompleteKey !== todayKey
    ) {
      setSeenDailyCompleteKey(todayKey);

      pushUnlock({
        id: `daily-goals-complete-${todayKey}`,
        type: "achievement",
        title: "Daily Goals Complete",
        subtitle: "You cleared all daily goals for today.",
        accent: "#10B981",
        emoji: "✅",
      });
    }
  }, [activity, seenDailyCompleteKey, pushUnlock]);

  useEffect(() => {
    const todayKey = getUTCDateKey();

    if (activity.allGoalsRewardClaimed && seenAllGoalsClaimKey !== todayKey) {
      setSeenAllGoalsClaimKey(todayKey);

      pushUnlock({
        id: `daily-goals-bonus-${todayKey}`,
        type: "achievement",
        title: "Daily Bonus Claimed",
        subtitle: `You claimed the all-goals bonus of ${ALL_GOALS_REWARD_XP} XP.`,
        accent: "#F59E0B",
        emoji: "🎁",
      });
    }
  }, [activity.allGoalsRewardClaimed, seenAllGoalsClaimKey, pushUnlock]);

  const goals = useMemo(() => {
    return DAILY_GOALS.map((goal) => ({
      id: goal.id,
      label: goal.label,
      target: goal.target,
      progress: getGoalProgress(goal, activity),
      complete: isGoalComplete(goal, activity),
      claimed: isGoalClaimed(goal.id, activity),
      claimable: canClaimDailyGoalRewardService(goal, activity),
      rewardXP: goal.rewardXP,
    }));
  }, [activity]);

  const completeCount = goals.filter((goal) => goal.complete).length;
  const allComplete = completeCount === goals.length;
  const canClaimAllGoalsReward = canClaimAllDailyGoalsRewardService(activity);

  const claimGoalRewardForUser = async (goalId: DailyGoalView["id"]) => {
    if (!user) return 0;
    return claimDailyGoalReward(user.uid, goalId);
  };

  const claimAllGoalsRewardForUser = async () => {
    if (!user) return 0;
    return claimAllDailyGoalsReward(user.uid);
  };

  const recordLessonComplete = async (xpEarned = 0) => {
    if (!user) return;

    await recordDailyProgress(user.uid, {
      lessonsCompleted: 1,
      xpEarned,
    });
  };

  const recordSyntaxAnswered = async (correct: boolean, xpEarned = 0) => {
    if (!user) return;

    await recordDailyProgress(user.uid, {
      syntaxAnswered: 1,
      syntaxCorrect: correct ? 1 : 0,
      xpEarned,
    });
  };

  const recordProjectComplete = async (xpEarned = 0) => {
    if (!user) return;

    await recordDailyProgress(user.uid, {
      projectsCompleted: 1,
      xpEarned,
    });
  };

  const recordXPEarned = async (xpEarned: number) => {
    if (!user || xpEarned <= 0) return;

    await recordDailyProgress(user.uid, {
      xpEarned,
    });
  };

  const value = useMemo(
    () => ({
      activity,
      goals,
      completeCount,
      allComplete,
      allGoalsRewardXP: ALL_GOALS_REWARD_XP,
      allGoalsRewardClaimed: activity.allGoalsRewardClaimed,
      canClaimAllGoalsReward,
      claimGoalReward: claimGoalRewardForUser,
      claimAllGoalsReward: claimAllGoalsRewardForUser,
      recordLessonComplete,
      recordSyntaxAnswered,
      recordProjectComplete,
      recordXPEarned,
    }),
    [activity, goals, completeCount, allComplete, canClaimAllGoalsReward],
  );

  return (
    <DailyGoalsContext.Provider value={value}>
      {children}
    </DailyGoalsContext.Provider>
  );
};

export const useDailyGoals = () => {
  const context = useContext(DailyGoalsContext);

  if (!context) {
    throw new Error("useDailyGoals must be used within DailyGoalsProvider");
  }

  return context;
};
