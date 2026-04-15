import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "./AuthContext";
import syntaxCategoriesData from "../data/keywords.json";

export type ExercisePool = "core" | "review" | "challenge";
export type ExerciseDifficulty = "easy" | "medium" | "hard";

type ExerciseMeta = {
  id: string;
  xp: number;
  pool?: ExercisePool;
  difficulty?: ExerciseDifficulty;
  tags?: string[];
};

export type MCExercise = ExerciseMeta & {
  type: "mc";
  text: string;
  options: string[];
  correct: number;
};

export type CodeExercise = ExerciseMeta & {
  type: "code";
  text: string;
  prompt?: string;
  answer: string;
};

export type TraceExercise = ExerciseMeta & {
  type: "trace";
  text: string;
  prompt?: string;
  columns: string[];
  answer: string[][];
};

export type DebugExercise = ExerciseMeta & {
  type: "debug";
  text: string;
  prompt?: string;
  answer: string;
};

export type Exercise =
  | MCExercise
  | CodeExercise
  | TraceExercise
  | DebugExercise;

type KeywordSeed = {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
};

type SyntaxCategorySeed = {
  id: string;
  title: string;
  description: string;
  unlockThreshold: number;
  accentColor?: string;
  keywords: KeywordSeed[];
};

export type KeywordStatus = "locked" | "available" | "in_progress" | "mastered";

export type CategoryStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "mastered";

export type Keyword = {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  mastery: number;
  remainingExercises: number;
  categoryId: string;
  categoryTitle: string;
  categoryIndex: number;
  keywordIndex: number;
  unlocked: boolean;
  status: KeywordStatus;
};

export type SyntaxCategory = {
  id: string;
  title: string;
  description: string;
  unlockThreshold: number;
  accentColor: string;
  unlocked: boolean;
  status: CategoryStatus;
  progress: number;
  completedKeywords: number;
  totalKeywords: number;
  availableKeywords: number;
  masteredKeywords: number;
  rewardClaimed: boolean;
  keywords: Keyword[];
};

type SyntaxProgressMap = Record<
  string,
  {
    mastery: number;
    remainingExercises: number;
  }
>;

type SyntaxCategoryRewardMap = Record<
  string,
  {
    claimedAt: number;
    xpAwarded: number;
  }
>;

type SyntaxContextType = {
  keywords: Keyword[];
  categories: SyntaxCategory[];
  syntaxCategoryRewards: SyntaxCategoryRewardMap;
  updateKeyword: (
    id: string,
    masteryInc: number,
    correct: boolean,
  ) => Promise<void>;
  claimCategoryCompletionReward: (
    categoryId: string,
    xpAwarded: number,
  ) => Promise<boolean>;
  getKeywordById: (id: string) => Keyword | undefined;
  getCategoryById: (id: string) => SyntaxCategory | undefined;
};

const DEFAULT_CATEGORY_COLOR = "#6C63FF";
const KEYWORD_UNLOCK_THRESHOLD = 60;

export const SyntaxContext = createContext<SyntaxContextType>({
  keywords: [],
  categories: [],
  syntaxCategoryRewards: {},
  updateKeyword: async () => {},
  claimCategoryCompletionReward: async () => false,
  getKeywordById: () => undefined,
  getCategoryById: () => undefined,
});

function clampMastery(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeExercise(exercise: Exercise, fallbackId: string): Exercise {
  return {
    ...exercise,
    id: exercise.id || fallbackId,
    pool: exercise.pool ?? "core",
    difficulty: exercise.difficulty ?? "easy",
    tags: Array.isArray(exercise.tags) ? exercise.tags : [],
  };
}

function getKeywordStatus(
  unlocked: boolean,
  mastery: number,
  remainingExercises: number,
): KeywordStatus {
  if (!unlocked) return "locked";
  if (mastery >= 100) return "mastered";
  if (mastery > 0 || remainingExercises < Number.MAX_SAFE_INTEGER) {
    return "in_progress";
  }
  return "available";
}

function getCategoryStatus(
  unlocked: boolean,
  progress: number,
  masteredKeywords: number,
  totalKeywords: number,
): CategoryStatus {
  if (!unlocked) return "locked";
  if (masteredKeywords === totalKeywords && totalKeywords > 0) {
    return "mastered";
  }
  if (progress > 0) return "in_progress";
  return "available";
}

export const SyntaxProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [syntaxProgress, setSyntaxProgress] = useState<SyntaxProgressMap>({});
  const [syntaxCategoryRewards, setSyntaxCategoryRewards] =
    useState<SyntaxCategoryRewardMap>({});

  const baseCategories = useMemo(() => {
    return (syntaxCategoriesData as SyntaxCategorySeed[]).map((category) => ({
      ...category,
      accentColor: category.accentColor || DEFAULT_CATEGORY_COLOR,
      keywords: category.keywords.map((keyword) => ({
        ...keyword,
        exercises: (keyword.exercises ?? []).map((exercise, exerciseIndex) =>
          normalizeExercise(
            exercise,
            `${category.id}-${keyword.id}-${exerciseIndex + 1}`,
          ),
        ),
      })),
    }));
  }, []);

  const baseKeywordLookup = useMemo(() => {
    const map = new Map<
      string,
      {
        categoryId: string;
        exerciseCount: number;
      }
    >();

    baseCategories.forEach((category) => {
      category.keywords.forEach((keyword) => {
        map.set(keyword.id, {
          categoryId: category.id,
          exerciseCount: keyword.exercises.length,
        });
      });
    });

    return map;
  }, [baseCategories]);

  useEffect(() => {
    if (!user) {
      setSyntaxProgress({});
      setSyntaxCategoryRewards({});
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setSyntaxProgress({});
        setSyntaxCategoryRewards({});
        return;
      }

      const data = snap.data();
      setSyntaxProgress(data.syntaxProgress ?? {});
      setSyntaxCategoryRewards(data.syntaxCategoryRewards ?? {});
    });

    return unsubscribe;
  }, [user]);

  const categories = useMemo<SyntaxCategory[]>(() => {
    const computedCategories: SyntaxCategory[] = [];

    baseCategories.forEach((category, categoryIndex) => {
      const previousCategory = computedCategories[categoryIndex - 1];
      const categoryUnlocked =
        categoryIndex === 0 ||
        (previousCategory?.progress ?? 0) >= category.unlockThreshold;

      const keywords: Keyword[] = category.keywords.map(
        (keyword, keywordIndex) => {
          const progress = syntaxProgress[keyword.id];
          const mastery = clampMastery(progress?.mastery ?? 0);
          const defaultRemaining = keyword.exercises.length;
          const remainingExercises = Math.max(
            0,
            progress?.remainingExercises ?? defaultRemaining,
          );

          const previousKeyword =
            keywordIndex > 0 ? category.keywords[keywordIndex - 1] : null;

          const previousKeywordMastery = previousKeyword
            ? clampMastery(syntaxProgress[previousKeyword.id]?.mastery ?? 0)
            : 0;

          const keywordUnlocked =
            categoryUnlocked &&
            (keywordIndex === 0 ||
              previousKeywordMastery >= KEYWORD_UNLOCK_THRESHOLD);

          const status = getKeywordStatus(
            keywordUnlocked,
            mastery,
            remainingExercises,
          );

          return {
            id: keyword.id,
            name: keyword.name,
            description: keyword.description,
            exercises: keyword.exercises,
            mastery,
            remainingExercises,
            categoryId: category.id,
            categoryTitle: category.title,
            categoryIndex,
            keywordIndex,
            unlocked: keywordUnlocked,
            status,
          };
        },
      );

      const totalKeywords = keywords.length;
      const totalMastery = keywords.reduce(
        (sum, keyword) => sum + keyword.mastery,
        0,
      );
      const progress =
        totalKeywords > 0 ? Math.round(totalMastery / totalKeywords) : 0;
      const masteredKeywords = keywords.filter(
        (keyword) => keyword.mastery >= 100,
      ).length;
      const completedKeywords = keywords.filter(
        (keyword) => keyword.remainingExercises <= 0 || keyword.mastery >= 100,
      ).length;
      const availableKeywords = keywords.filter(
        (keyword) => keyword.unlocked,
      ).length;

      const status = getCategoryStatus(
        categoryUnlocked,
        progress,
        masteredKeywords,
        totalKeywords,
      );

      computedCategories.push({
        id: category.id,
        title: category.title,
        description: category.description,
        unlockThreshold: category.unlockThreshold,
        accentColor: category.accentColor || DEFAULT_CATEGORY_COLOR,
        unlocked: categoryUnlocked,
        status,
        progress,
        completedKeywords,
        totalKeywords,
        availableKeywords,
        masteredKeywords,
        rewardClaimed: !!syntaxCategoryRewards[category.id],
        keywords,
      });
    });

    return computedCategories;
  }, [baseCategories, syntaxProgress, syntaxCategoryRewards]);

  const keywords = useMemo(() => {
    return categories.flatMap((category) => category.keywords);
  }, [categories]);

  const getKeywordById = (id: string) => {
    return keywords.find((keyword) => keyword.id === id);
  };

  const getCategoryById = (id: string) => {
    return categories.find((category) => category.id === id);
  };

  const updateKeyword = async (
    id: string,
    masteryInc: number,
    correct: boolean,
  ) => {
    if (!user) return;

    const baseKeyword = baseKeywordLookup.get(id);
    if (!baseKeyword) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const syntaxProgressData: SyntaxProgressMap = data.syntaxProgress ?? {};

      const existing = syntaxProgressData[id] ?? {
        mastery: 0,
        remainingExercises: baseKeyword.exerciseCount,
      };

      const next = {
        mastery: correct
          ? clampMastery(existing.mastery + masteryInc)
          : existing.mastery,
        remainingExercises: correct
          ? Math.max(existing.remainingExercises - 1, 0)
          : existing.remainingExercises,
      };

      tx.update(userRef, {
        syntaxProgress: {
          ...syntaxProgressData,
          [id]: next,
        },
      });
    });
  };

  const claimCategoryCompletionReward = async (
    categoryId: string,
    xpAwarded: number,
  ) => {
    if (!user || !categoryId || xpAwarded <= 0) return false;

    const userRef = doc(db, "users", user.uid);
    let claimed = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const rewardMap: SyntaxCategoryRewardMap =
        data.syntaxCategoryRewards ?? {};

      if (rewardMap[categoryId]) {
        claimed = false;
        return;
      }

      claimed = true;

      tx.update(userRef, {
        syntaxCategoryRewards: {
          ...rewardMap,
          [categoryId]: {
            claimedAt: Date.now(),
            xpAwarded,
          },
        },
      });
    });

    return claimed;
  };

  return (
    <SyntaxContext.Provider
      value={{
        keywords,
        categories,
        syntaxCategoryRewards,
        updateKeyword,
        claimCategoryCompletionReward,
        getKeywordById,
        getCategoryById,
      }}
    >
      {children}
    </SyntaxContext.Provider>
  );
};
