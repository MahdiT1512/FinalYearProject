import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  LayoutChangeEvent,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { XPContext } from "../context/XPContext";
import {
  SyntaxContext,
  Keyword,
  Exercise,
  SyntaxCategory,
} from "../context/SyntaxContext";
import { useDailyGoals } from "../context/dailyGoalsContext";
import { useSessionSummary } from "../context/SessionSummaryContext";
import { useUnlocks } from "../context/UnlocksContext";
import XPBar from "../Components/common/XPBar";
import {
  evaluateQuestion,
  EvaluationResult,
} from "../context/QuestionEvaluator";

type FeedbackTone = "idle" | "correct" | "wrong";
type PracticeMode = "category" | "continue" | "weakest";

const COMBO_INTERVAL = 3;
const COMBO_BONUS_XP = 5;
const CATEGORY_COMPLETION_XP = 40;
const MIN_SESSION_QUESTIONS = 3;
const MAX_SESSION_QUESTIONS = 7;

type SessionPlanItem = {
  sessionId: string;
  sessionOrder: number;
  keywordId: string;
  keywordName: string;
  keywordIndex: number;
  categoryId: string;
  categoryTitle: string;
  exercise: Exercise;
};

//REDUNDANT AS TRACE TABLE EXERCISES FOR SYNTAX WAS CUT.
//It is only still here because it was originally planned couldn't be implemented so it breaks code later
function isTraceExercise(
  exercise: Exercise,
): exercise is Extract<Exercise, { type: "trace" }> {
  return exercise.type === "trace";
}

function isCodeLikeExercise(
  exercise: Exercise,
): exercise is Extract<Exercise, { type: "code" | "debug" }> {
  return exercise.type === "code" || exercise.type === "debug";
}

function getTraceHint(exercise: Exercise) {
  if (exercise.type === "trace") {
    return "Fill in every cell in the trace table.";
  }

  if (exercise.type === "debug") {
    return "Fix the code. Small formatting differences are accepted.";
  }

  return null;
}

//Limits syntax exercises to just a few exercises in the range
function clampSessionLength(poolSize: number) {
  if (poolSize <= 0) return 0;
  if (poolSize <= MIN_SESSION_QUESTIONS) return poolSize;
  return Math.min(MAX_SESSION_QUESTIONS, poolSize);
}

//Creates a hash used for seeded randomisation
function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

function createSeededRandom(seedString: string) {
  let seed = hashString(seedString) || 123456789;

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

//Shuffles syntax exercises using the random generator
function shuffleArray<T>(items: T[], seedString: string): T[] {
  const result = [...items];
  const random = createSeededRandom(seedString);

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function pickSessionCount(poolSize: number, seedString: string) {
  const cappedMax = clampSessionLength(poolSize);
  if (cappedMax <= MIN_SESSION_QUESTIONS) return cappedMax;

  const random = createSeededRandom(`${seedString}-count`);
  const span = cappedMax - MIN_SESSION_QUESTIONS + 1;
  return MIN_SESSION_QUESTIONS + Math.floor(random() * span);
}

//Scores exercises so the different practice modes will prioritise different keywords(weakest will give the lowest mastery)
function getKeywordExercisePriority(
  keyword: Keyword,
  exercise: Exercise,
  mode: PracticeMode,
) {
  const poolRank =
    exercise.pool === "review" ? 0 : exercise.pool === "core" ? 1 : 2;

  if (mode === "weakest") {
    return [
      keyword.mastery,
      -keyword.remainingExercises,
      poolRank,
      keyword.keywordIndex,
    ];
  }

  if (mode === "continue") {
    const keywordDone =
      keyword.remainingExercises <= 0 && keyword.mastery >= 100 ? 1 : 0;

    return [keywordDone, keyword.keywordIndex, keyword.mastery, poolRank];
  }

  return [keyword.keywordIndex, poolRank, keyword.mastery];
}

function comparePriority(a: number[], b: number[]) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function buildItemsFromKeyword(
  keyword: Keyword,
  mode: PracticeMode,
): SessionPlanItem[] {
  const sortedExercises = [...keyword.exercises].sort((a, b) => {
    const pa = getKeywordExercisePriority(keyword, a, mode);
    const pb = getKeywordExercisePriority(keyword, b, mode);
    return comparePriority(pa, pb);
  });

  return sortedExercises.map((exercise, index) => ({
    sessionId: `${keyword.id}-${exercise.id}-${index}`,
    sessionOrder: index,
    keywordId: keyword.id,
    keywordName: keyword.name,
    keywordIndex: keyword.keywordIndex,
    categoryId: keyword.categoryId,
    categoryTitle: keyword.categoryTitle,
    exercise,
  }));
}

function buildPracticeSessionPlan(args: {
  keywordId?: string;
  categoryId?: string;
  mode: PracticeMode;
  keywords: Keyword[];
  categories: SyntaxCategory[];
  getKeywordById: (id: string) => Keyword | undefined;
  seedString: string;
}): SessionPlanItem[] {
  const {
    keywordId,
    categoryId,
    mode,
    keywords,
    categories,
    getKeywordById,
    seedString,
  } = args;

  let pool: SessionPlanItem[] = [];

  if (keywordId) {
    const keyword =
      getKeywordById(keywordId) ?? keywords.find((item) => item.unlocked);

    if (!keyword) return [];

    pool = buildItemsFromKeyword(keyword, mode);
  } else if (categoryId) {
    const category = categories.find((item) => item.id === categoryId);

    if (!category || !category.unlocked) return [];

    let categoryKeywords = category.keywords.filter((item) => item.unlocked);

    if (mode === "weakest") {
      categoryKeywords = [...categoryKeywords].sort((a, b) => {
        if (a.mastery !== b.mastery) return a.mastery - b.mastery;
        return b.remainingExercises - a.remainingExercises;
      });
    } else if (mode === "continue") {
      categoryKeywords = [...categoryKeywords].sort((a, b) => {
        const aDone = a.remainingExercises <= 0 && a.mastery >= 100 ? 1 : 0;
        const bDone = b.remainingExercises <= 0 && b.mastery >= 100 ? 1 : 0;

        if (aDone !== bDone) return aDone - bDone;
        if (a.keywordIndex !== b.keywordIndex) {
          return a.keywordIndex - b.keywordIndex;
        }
        return a.mastery - b.mastery;
      });
    } else {
      categoryKeywords = [...categoryKeywords].sort(
        (a, b) => a.keywordIndex - b.keywordIndex,
      );
    }

    pool = categoryKeywords.flatMap((keyword) =>
      buildItemsFromKeyword(keyword, mode),
    );
  } else {
    const fallbackKeyword = keywords.find((item) => item.unlocked);
    if (!fallbackKeyword) return [];
    pool = buildItemsFromKeyword(fallbackKeyword, mode);
  }

  if (pool.length === 0) return [];

  const shuffled = shuffleArray(pool, `${seedString}-shuffle`);
  const count = pickSessionCount(shuffled.length, `${seedString}-size`);

  return shuffled.slice(0, count).map((item, index) => ({
    ...item,
    sessionOrder: index,
    sessionId: `${item.sessionId}-session-${index}`,
  }));
}

//The basis for the syntax practice or exercise screens, orignally based off of ExercisePage but modified heavily to fit syntax feature
export default function SyntaxPractice() {
  const router = useRouter();
  const {
    keywordId,
    exerciseIndex: exerciseIndexParam,
    categoryId,
    mode,
  } = useLocalSearchParams<{
    keywordId?: string;
    exerciseIndex?: string;
    categoryId?: string;
    mode?: PracticeMode;
  }>();

  const { addXP } = useContext(XPContext);
  const {
    keywords,
    categories,
    updateKeyword,
    claimCategoryCompletionReward,
    getKeywordById,
  } = useContext(SyntaxContext);

  const { recordSyntaxAnswered, recordXPEarned } = useDailyGoals();
  const { showSessionSummary } = useSessionSummary();
  const { pushUnlock } = useUnlocks();

  const [sessionPlan, setSessionPlan] = useState<SessionPlanItem[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [traceInputs, setTraceInputs] = useState<string[][]>([]);

  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("idle");

  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastEarnedXP, setLastEarnedXP] = useState(0);
  const [lastComboBonus, setLastComboBonus] = useState(0);
  const [sessionUnlocks, setSessionUnlocks] = useState<string[]>([]);
  const [sessionStartedKeywordName, setSessionStartedKeywordName] =
    useState<string>("");

  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [questionCardY, setQuestionCardY] = useState(0);
  const [answerSectionY, setAnswerSectionY] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;
  const feedbackTranslateY = useRef(new Animated.Value(80)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView | null>(null);

  const didBuildPlanRef = useRef(false);
  const planRouteKeyRef = useRef("");

  const selectedMode: PracticeMode =
    mode === "continue" || mode === "weakest" || mode === "category"
      ? mode
      : "category";

  const routePlanKey = `${keywordId ?? ""}|${categoryId ?? ""}|${selectedMode}|${
    exerciseIndexParam ?? "0"
  }`;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (planRouteKeyRef.current !== routePlanKey) {
      didBuildPlanRef.current = false;
      planRouteKeyRef.current = routePlanKey;
      setSessionPlan([]);
      setSessionIndex(0);
      setSessionXP(0);
      setSessionCorrect(0);
      setSessionWrong(0);
      setStreak(0);
      setBestStreak(0);
      setLastEarnedXP(0);
      setLastComboBonus(0);
      setSessionUnlocks([]);
      setFeedback(null);
      setFeedbackTone("idle");
      setSelectedOption(null);
      setCodeAnswer("");
      setTraceInputs([]);
      setLocked(false);
    }
  }, [routePlanKey]);

  useEffect(() => {
    if (didBuildPlanRef.current) return;
    if (keywords.length === 0 || categories.length === 0) return;

    const seed = `${routePlanKey}-fixed-session`;
    const plan = buildPracticeSessionPlan({
      keywordId,
      categoryId,
      mode: selectedMode,
      keywords,
      categories,
      getKeywordById,
      seedString: seed,
    });

    if (plan.length === 0) return;

    didBuildPlanRef.current = true;
    setSessionPlan(plan);

    const requestedIndex = Number(exerciseIndexParam ?? 0);
    const safeIndex =
      Number.isFinite(requestedIndex) && requestedIndex >= 0
        ? Math.min(requestedIndex, Math.max(0, plan.length - 1))
        : 0;

    setSessionIndex(safeIndex);
    setSessionStartedKeywordName(plan[0].keywordName);
  }, [
    keywordId,
    categoryId,
    selectedMode,
    exerciseIndexParam,
    keywords,
    categories,
    getKeywordById,
    routePlanKey,
  ]);

  const currentItem = sessionPlan[sessionIndex];

  const exercise = currentItem?.exercise;
  const keyword = currentItem
    ? keywords.find((item) => item.id === currentItem.keywordId)
    : undefined;
  const category = currentItem
    ? categories.find((item) => item.id === currentItem.categoryId)
    : undefined;

  const sessionProgressPercent =
    sessionPlan.length > 0
      ? Math.round(((sessionIndex + 1) / sessionPlan.length) * 100)
      : 0;

  const sessionAccuracy = useMemo(() => {
    const total = sessionCorrect + sessionWrong;
    if (total === 0) return 100;
    return Math.round((sessionCorrect / total) * 100);
  }, [sessionCorrect, sessionWrong]);

  const categoryOrderedKeywords = useMemo(() => {
    if (!category) return [];
    return category.keywords;
  }, [category]);

  const currentKeywordPosition = useMemo(() => {
    if (!keyword) return -1;
    return categoryOrderedKeywords.findIndex((item) => item.id === keyword.id);
  }, [categoryOrderedKeywords, keyword]);

  useEffect(() => {
    setSelectedOption(null);
    setCodeAnswer("");
    setLocked(false);
    setFeedback(null);
    setFeedbackTone("idle");
    setLastEarnedXP(0);
    setLastComboBonus(0);

    feedbackOpacity.setValue(0);
    feedbackTranslateY.setValue(80);
    shakeAnim.setValue(0);
    scaleAnim.setValue(1);

    if (exercise && isTraceExercise(exercise)) {
      const expected = exercise.answer ?? [];
      const rows = expected.length;
      const cols = expected[0]?.length ?? exercise.columns?.length ?? 1;

      const empty = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ""),
      );

      setTraceInputs(empty);
    } else {
      setTraceInputs([]);
    }
  }, [
    sessionIndex,
    exercise,
    feedbackOpacity,
    feedbackTranslateY,
    shakeAnim,
    scaleAnim,
  ]);

  if (!keyword || !exercise || !category || !currentItem) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Practice session not ready</Text>
        <Pressable style={styles.fallbackButton} onPress={() => router.back()}>
          <Text style={styles.fallbackButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const addSessionUnlock = (label: string) => {
    setSessionUnlocks((prev) =>
      prev.includes(label) ? prev : [...prev, label],
    );
  };

  //Animations for syntax exercise screens
  const animateFeedbackIn = () => {
    Animated.parallel([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(feedbackTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start();
  };

  const animateCorrect = () => {
    Animated.parallel([
      Animated.timing(confettiScale, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.03,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(confettiScale, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const finishSession = () => {
    const weakestArea =
      sessionWrong > 0 ? `${keyword.name} practice` : undefined;

    const improvedArea =
      sessionUnlocks.length > 0
        ? sessionUnlocks[0]
        : `${category.title} progress`;

    showSessionSummary(
      {
        title: sessionStartedKeywordName || keyword.name,
        xpEarned: sessionXP,
        accuracy: sessionAccuracy,
        streakPeak: bestStreak,
        weakestArea,
        improvedArea,
        unlocked: sessionUnlocks,
      },
      {
        onClose: () => {
          router.back();
        },
      },
    );
  };

  const goNext = () => {
    setSelectedOption(null);
    setCodeAnswer("");
    setTraceInputs([]);
    setLocked(false);

    if (sessionIndex + 1 < sessionPlan.length) {
      setSessionIndex((prev) => prev + 1);
      return;
    }

    finishSession();
  };

  //Checks if new categories unlock after a correctly answered question
  const processMilestones = async (baseXpEarned: number) => {
    if (!category || !keyword) return;

    const predictedKeywordMastery = Math.min(
      keyword.mastery + baseXpEarned,
      100,
    );

    const predictedCategoryMasteryTotal = category.keywords.reduce(
      (sum, item) => {
        if (item.id === keyword.id) {
          return sum + predictedKeywordMastery;
        }

        return sum + item.mastery;
      },
      0,
    );

    const predictedCategoryProgress =
      category.totalKeywords > 0
        ? Math.round(predictedCategoryMasteryTotal / category.totalKeywords)
        : 0;

    const categoryWasCompleted = category.progress >= 100;
    const categoryWillComplete = predictedCategoryProgress >= 100;

    const nextCategory =
      categories.find(
        (item) =>
          item.id !== category.id &&
          item.keywords[0]?.categoryIndex ===
            category.keywords[0]?.categoryIndex + 1,
      ) ?? categories[category.keywords[0]?.categoryIndex + 1];

    const unlocksNextCategory =
      !!nextCategory &&
      !nextCategory.unlocked &&
      predictedCategoryProgress >= nextCategory.unlockThreshold;

    if (
      !category.rewardClaimed &&
      !categoryWasCompleted &&
      categoryWillComplete
    ) {
      const rewardClaimedNow = await claimCategoryCompletionReward(
        category.id,
        CATEGORY_COMPLETION_XP,
      );

      if (rewardClaimedNow) {
        await addXP(CATEGORY_COMPLETION_XP);
        await recordXPEarned(CATEGORY_COMPLETION_XP);
        setSessionXP((prev) => prev + CATEGORY_COMPLETION_XP);

        pushUnlock({
          id: `syntax-category-complete-${category.id}`,
          type: "achievement",
          title: `${category.title} Complete`,
          subtitle: `You earned ${CATEGORY_COMPLETION_XP} bonus XP for mastering this category.`,
          accent: category.accentColor,
          emoji: "🏆",
        });

        addSessionUnlock(`${category.title} complete`);
      }
    }

    if (unlocksNextCategory && nextCategory) {
      pushUnlock({
        id: `syntax-category-unlocked-${nextCategory.id}`,
        type: "achievement",
        title: "New Syntax Category Unlocked",
        subtitle: `${nextCategory.title} is now open.`,
        accent: nextCategory.accentColor,
        emoji: "🔓",
      });

      addSessionUnlock(`Unlocked ${nextCategory.title}`);
    }
  };

  const applyCorrectResult = async (result: EvaluationResult) => {
    const nextStreak = streak + 1;
    const comboBonus = nextStreak % COMBO_INTERVAL === 0 ? COMBO_BONUS_XP : 0;
    const earnedXP = result.xpEarned + comboBonus;

    animateCorrect();

    setStreak(nextStreak);
    setBestStreak((prev) => Math.max(prev, nextStreak));
    setSessionCorrect((prev) => prev + 1);
    setSessionXP((prev) => prev + earnedXP);
    setLastEarnedXP(result.xpEarned);
    setLastComboBonus(comboBonus);

    await addXP(earnedXP);
    await recordSyntaxAnswered(true, earnedXP);
    await updateKeyword(keyword.id, result.xpEarned, true);
    await processMilestones(result.xpEarned);

    setFeedback(
      comboBonus > 0
        ? `${result.feedback ?? "✅ Correct!"}  +${result.xpEarned} XP • Combo +${comboBonus}`
        : `${result.feedback ?? "✅ Correct!"}  +${result.xpEarned} XP`,
    );
    setFeedbackTone("correct");
    animateFeedbackIn();

    setTimeout(() => {
      goNext();
    }, 950);
  };

  const applyWrongResult = async (result: EvaluationResult) => {
    animateWrong();

    setSessionWrong((prev) => prev + 1);
    setStreak(0);
    setLastEarnedXP(0);
    setLastComboBonus(0);

    await recordSyntaxAnswered(false, 0);
    await updateKeyword(keyword.id, 0, false);

    setFeedback(result.feedback ?? "❌ Not quite — try again.");
    setFeedbackTone("wrong");
    animateFeedbackIn();

    setTimeout(() => {
      setLocked(false);
    }, 900);
  };

  const handleEvaluation = async (result: EvaluationResult) => {
    setLocked(true);
    Keyboard.dismiss();

    if (result.correct) {
      await applyCorrectResult(result);
    } else {
      await applyWrongResult(result);
    }
  };

  const handleMCQPress = async (optionIndex: number) => {
    if (locked || exercise.type !== "mc") return;

    setSelectedOption(optionIndex);

    const result = evaluateQuestion(exercise, optionIndex);
    await handleEvaluation(result);
  };

  const handleCodeSubmit = async () => {
    if (locked || !isCodeLikeExercise(exercise)) return;

    const result = evaluateQuestion(exercise, codeAnswer);
    await handleEvaluation(result);
  };

  const handleTraceSubmit = async () => {
    if (locked || !isTraceExercise(exercise)) return;

    const result = evaluateQuestion(exercise, traceInputs);
    await handleEvaluation(result);
  };

  const optionStyle = (optionIndex: number) => {
    if (selectedOption === null || exercise.type !== "mc") {
      return styles.option;
    }

    if (optionIndex === exercise.correct) {
      return [styles.option, styles.correct];
    }

    if (optionIndex === selectedOption && selectedOption !== exercise.correct) {
      return [styles.option, styles.wrong];
    }

    return [styles.option, styles.dimmedOption];
  };

  const scrollToAnswerArea = () => {
    setTimeout(
      () => {
        if (!scrollRef.current) return;

        scrollRef.current.scrollTo({
          y: Math.max(questionCardY + answerSectionY - 24, 0),
          animated: true,
        });
      },
      Platform.OS === "android" ? 450 : 120,
    );
  };

  const handleAnswerAreaLayout = (event: LayoutChangeEvent) => {
    setAnswerSectionY(event.nativeEvent.layout.y);
  };
  return (
    <>
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: keyboardVisible ? keyboardHeight + 260 : 160,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={styles.backButton}
              onPress={() => setExitModalVisible(true)}
            >
              <Text style={styles.backText}>✕</Text>
            </Pressable>

            <View style={styles.topRow}>
              <XPBar />
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Syntax Practice</Text>
              <Text style={styles.title}>{keyword.name}</Text>
              <Text style={styles.subtitle}>{keyword.description}</Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaLabel}>Category</Text>
                  <Text style={styles.metaValue}>{category.title}</Text>
                </View>

                <View style={styles.metaPill}>
                  <Text style={styles.metaLabel}>Mastery</Text>
                  <Text style={styles.metaValue}>{keyword.mastery}%</Text>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Streak</Text>
                  <Text style={styles.heroStatValue}>🔥 {streak}</Text>
                </View>

                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Session XP</Text>
                  <Text style={styles.heroStatValue}>⭐ {sessionXP}</Text>
                </View>

                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Accuracy</Text>
                  <Text style={styles.heroStatValue}>{sessionAccuracy}%</Text>
                </View>
              </View>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressTitle}>Session Progress</Text>
                <Text style={styles.progressValue}>
                  {sessionIndex + 1}/{sessionPlan.length}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${sessionProgressPercent}%` },
                  ]}
                />
              </View>

              <View style={styles.progressFooterRow}>
                <Text style={styles.progressHint}>
                  {currentKeywordPosition + 1}/{categoryOrderedKeywords.length}{" "}
                  in {category.title}
                </Text>
                <Text style={styles.progressHint}>
                  {Math.max(0, sessionPlan.length - (sessionIndex + 1))} left
                </Text>
              </View>
            </View>

            <Animated.View
              onLayout={(event) => {
                setQuestionCardY(event.nativeEvent.layout.y);
              }}
              style={[
                styles.card,
                {
                  transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              <Text style={styles.questionText}>{exercise.text}</Text>

              {exercise.type === "mc" &&
                exercise.options.map((option, index) => (
                  <Pressable
                    key={`${currentItem.sessionId}-option-${index}`}
                    onPress={() => handleMCQPress(index)}
                    disabled={locked}
                    style={({ pressed }) => [
                      optionStyle(index),
                      pressed && !locked && styles.pressedOption,
                    ]}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </Pressable>
                ))}

              {isCodeLikeExercise(exercise) && (
                <View onLayout={handleAnswerAreaLayout}>
                  {exercise.prompt ? (
                    <View style={styles.promptBox}>
                      <Text style={styles.promptText}>{exercise.prompt}</Text>
                    </View>
                  ) : null}

                  {getTraceHint(exercise) ? (
                    <Text style={styles.helperText}>
                      {getTraceHint(exercise)}
                    </Text>
                  ) : null}

                  <TextInput
                    style={styles.input}
                    value={codeAnswer}
                    onChangeText={setCodeAnswer}
                    editable={!locked}
                    placeholder="Type your answer here"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleCodeSubmit}
                    returnKeyType="done"
                    multiline
                    onFocus={scrollToAnswerArea}
                  />

                  <Pressable
                    onPress={handleCodeSubmit}
                    disabled={locked}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      pressed && !locked && styles.pressedOption,
                    ]}
                  >
                    <Text style={styles.submitText}>Submit</Text>
                  </Pressable>
                </View>
              )}

              {isTraceExercise(exercise) && (
                <>
                  {exercise.prompt ? (
                    <View style={styles.promptBox}>
                      <Text style={styles.promptText}>{exercise.prompt}</Text>
                    </View>
                  ) : null}

                  {getTraceHint(exercise) ? (
                    <Text style={styles.helperText}>
                      {getTraceHint(exercise)}
                    </Text>
                  ) : null}

                  <View style={styles.traceTable}>
                    <View style={styles.traceRow}>
                      {exercise.columns.map((column, columnIndex) => (
                        <View
                          key={`${currentItem.sessionId}-header-${columnIndex}`}
                          style={[styles.traceCell, styles.traceHeader]}
                        >
                          <Text style={styles.traceHeaderText}>{column}</Text>
                        </View>
                      ))}
                    </View>

                    {exercise.answer.map((row, rowIndex) => (
                      <View
                        key={`${currentItem.sessionId}-row-${rowIndex}`}
                        style={styles.traceRow}
                      >
                        {row.map((_, columnIndex) => (
                          <TextInput
                            key={`${currentItem.sessionId}-cell-${rowIndex}-${columnIndex}`}
                            style={styles.traceCellInput}
                            value={traceInputs[rowIndex]?.[columnIndex] ?? ""}
                            onChangeText={(text) => {
                              setTraceInputs((prev) => {
                                const next = prev.map((item) => [...item]);

                                if (!next[rowIndex]) {
                                  next[rowIndex] = [];
                                }

                                next[rowIndex][columnIndex] = text;
                                return next;
                              });
                            }}
                            editable={!locked}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                          />
                        ))}
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={handleTraceSubmit}
                    disabled={locked}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      pressed && !locked && styles.pressedOption,
                    ]}
                  >
                    <Text style={styles.submitText}>Submit Trace</Text>
                  </Pressable>
                </>
              )}
            </Animated.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.confetti,
              { transform: [{ scale: confettiScale }], opacity: confettiScale },
            ]}
          >
            <Text style={styles.confettiText}>🎉</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.feedbackBar,
              feedbackTone === "correct"
                ? styles.feedbackBarCorrect
                : feedbackTone === "wrong"
                  ? styles.feedbackBarWrong
                  : styles.feedbackBarIdle,
              {
                opacity: feedbackOpacity,
                transform: [{ translateY: feedbackTranslateY }],
              },
            ]}
          >
            <View style={styles.feedbackTextWrap}>
              <Text style={styles.feedbackTitle}>
                {feedbackTone === "correct"
                  ? "Correct"
                  : feedbackTone === "wrong"
                    ? "Try again"
                    : "Ready"}
              </Text>
              <Text style={styles.feedbackText}>
                {feedback ?? "Answer to see feedback."}
              </Text>
            </View>

            {feedbackTone === "correct" ? (
              <View style={styles.feedbackRewardWrap}>
                <Text style={styles.feedbackRewardText}>
                  +{lastEarnedXP + lastComboBonus} XP
                </Text>
                {lastComboBonus > 0 ? (
                  <Text style={styles.comboText}>Combo +{lastComboBonus}</Text>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={exitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave practice?</Text>
            <Text style={styles.modalMessage}>
              Your session streak and session XP from this session will be lost.
              Earned XP already added to your account stays.
            </Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setExitModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Stay</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setExitModalVisible(false);
                  router.back();
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>Leave</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },

  scrollContent: {
    padding: 14,
    paddingBottom: 160,
  },

  topRow: {
    marginTop: 8,
    marginBottom: 12,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  title: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },

  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  metaPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  metaLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },

  metaValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  heroStatCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
  },

  heroStatLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },

  heroStatValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  progressValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#6C63FF",
  },

  progressFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },

  progressHint: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  questionText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
    lineHeight: 28,
  },

  option: {
    padding: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
  },

  correct: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },

  wrong: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },

  dimmedOption: {
    opacity: 0.72,
  },

  pressedOption: {
    opacity: 0.88,
  },

  optionText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },

  promptBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  promptText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },

  helperText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    minHeight: 52,
    maxHeight: 180,
    marginBottom: 10,
    fontSize: 15,
    color: "#111827",
  },

  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFB703",
    alignItems: "center",
    marginTop: 4,
  },

  submitText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  traceTable: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },

  traceRow: {
    flexDirection: "row",
  },

  traceCell: {
    flex: 1,
    minHeight: 42,
    padding: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  traceHeader: {
    backgroundColor: "#F3F4F6",
  },

  traceHeaderText: {
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    fontSize: 12,
  },

  traceCellInput: {
    flex: 1,
    minHeight: 42,
    padding: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    textAlign: "center",
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },

  bottomSpacer: {
    height: 12,
  },

  confetti: {
    position: "absolute",
    right: 24,
    top: 90,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  confettiText: {
    fontSize: 34,
    textAlign: "center",
  },

  feedbackBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  feedbackBarIdle: {
    backgroundColor: "#FFFFFF",
  },

  feedbackBarCorrect: {
    backgroundColor: "#ECFDF3",
  },

  feedbackBarWrong: {
    backgroundColor: "#FEF2F2",
  },

  feedbackTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  feedbackTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  feedbackText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
    fontWeight: "600",
  },

  feedbackRewardWrap: {
    alignItems: "flex-end",
  },

  feedbackRewardText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#166534",
  },

  comboText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "#4338CA",
  },

  backButton: {
    position: "absolute",
    top: 20,
    right: 16,
    zIndex: 10,
    backgroundColor: "#FF6B6B",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  modalMessage: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    textAlign: "center",
  },

  modalButtonRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },

  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },

  modalButtonPrimary: {
    backgroundColor: "#6C63FF",
  },

  modalButtonSecondary: {
    backgroundColor: "#EEF2FF",
  },

  modalButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  modalButtonSecondaryText: {
    color: "#4338CA",
    fontWeight: "900",
  },

  fallbackContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  fallbackTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  fallbackButton: {
    marginTop: 18,
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  fallbackButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
