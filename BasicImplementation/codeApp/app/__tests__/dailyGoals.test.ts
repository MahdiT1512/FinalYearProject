jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock("../../firebase/config", () => ({
  db: {},
}));

import {
  DAILY_GOALS,
  makeEmptyDailyActivity,
  getGoalProgress,
  isGoalComplete,
  canClaimGoalReward,
  areAllDailyGoalsComplete,
} from "../../services/dailyGoals";

describe("dailyGoals", () => {
  test("creates empty daily activity with zero progress", () => {
    const activity = makeEmptyDailyActivity("2025-01-01");

    expect(activity.lessonsCompleted).toBe(0);
    expect(activity.syntaxAnswered).toBe(0);
    expect(activity.xpEarned).toBe(0);
    expect(activity.claimedGoalIds).toEqual([]);
  });

  test("detects completed lesson goal", () => {
    const activity = {
      ...makeEmptyDailyActivity("2025-01-01"),
      lessonsCompleted: 1,
    };

    const goal = DAILY_GOALS.find((g) => g.id === "lesson_1")!;

    expect(isGoalComplete(goal, activity)).toBe(true);
    expect(canClaimGoalReward(goal, activity)).toBe(true);
  });

  test("does not allow already claimed goal reward", () => {
    const activity = {
      ...makeEmptyDailyActivity("2025-01-01"),
      lessonsCompleted: 1,
      claimedGoalIds: ["lesson_1"],
    };

    const goal = DAILY_GOALS.find((g) => g.id === "lesson_1")!;

    expect(isGoalComplete(goal, activity)).toBe(true);
    expect(canClaimGoalReward(goal, activity)).toBe(false);
  });

  test("detects when all daily goals are complete", () => {
    const activity = {
      ...makeEmptyDailyActivity("2025-01-01"),
      lessonsCompleted: 1,
      syntaxAnswered: 10,
      xpEarned: 50,
    };

    expect(areAllDailyGoalsComplete(activity)).toBe(true);
  });

  test("caps goal progress at the goal target", () => {
    const activity = {
      ...makeEmptyDailyActivity("2025-01-01"),
      syntaxAnswered: 25,
    };

    const goal = DAILY_GOALS.find((g) => g.id === "syntax_10")!;

    expect(getGoalProgress(goal, activity)).toBe(10);
  });
});