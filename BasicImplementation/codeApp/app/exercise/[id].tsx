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
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { XPContext } from "../context/XPContext";
import { useDailyGoals } from "../context/dailyGoalsContext";
import { useSessionSummary } from "../context/SessionSummaryContext";
import XPBar from "../Components/common/XPBar";
import lessonsData from "../data/lessons.json";
import {
  evaluateQuestion,
  EvaluationResult,
} from "../context/QuestionEvaluator";
import {
  buildLessonSession,
  LessonSessionItem,
} from "../../services/lessonSession";

type MCQ = {
  type: "mc";
  text: string;
  options: string[];
  correct: number;
  xp: number;
};

type CodeQ = {
  type: "code" | "trace" | "debug";
  text: string;
  prompt?: string;
  answer: any;
  xp: number;
  columns?: string[];
};

type Q = MCQ | CodeQ;
type SessionQ = LessonSessionItem<Q>;

type Lesson = {
  id: string;
  title: string;
  content: string;
  exercises: Q[];
  module?: string;
};

type FeedbackTone = "idle" | "correct" | "wrong";

export default function ExercisePage() {
  const params = useLocalSearchParams<{ id: string; reviewMode?: string }>();
  const id = params.id;
  const reviewMode = params.reviewMode === "1";

  const router = useRouter();

  const {
    addXP,
    completeLesson,
    hearts,
    loseHeart,
    refillHearts,
    secondsUntilNextHeart,
    recordLessonAttempt,
    recordLessonAnswerResult,
    canEarnDeckReward,
    markDeckRewardClaimed,
  } = useContext(XPContext);

  const { recordLessonComplete, recordXPEarned } = useDailyGoals();
  const { showSessionSummary } = useSessionSummary();

  const allLessons = lessonsData as Lesson[];
  const lesson = allLessons.find((l) => l.id === id);
  const lessonPool = lesson?.exercises ?? [];

  const [sessionExercises, setSessionExercises] = useState<SessionQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("idle");
  const [traceInputs, setTraceInputs] = useState<string[][]>([]);

  const [sessionXP, setSessionXP] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  const [reviewCorrectCount, setReviewCorrectCount] = useState(0);
  const [reviewWrongCount, setReviewWrongCount] = useState(0);

  const [exitModalVisible, setExitModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;
  const feedbackSlide = useRef(new Animated.Value(30)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const progressPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!lesson) {
      setSessionExercises([]);
      setIdx(0);
      return;
    }

    const generatedSession = buildLessonSession(lesson.id, lessonPool, {
      reviewMode,
    });

    setSessionExercises(generatedSession);
    setIdx(0);
    setSelected(null);
    setCodeAnswer("");
    setLocked(false);
    setFeedback(null);
    setFeedbackTone("idle");
    setTraceInputs([]);
    setSessionXP(0);
    setComboStreak(0);
    setBestCombo(0);
    setSessionCorrect(0);
    setSessionWrong(0);
    setReviewCorrectCount(0);
    setReviewWrongCount(0);
  }, [lesson?.id, reviewMode, lessonPool.length]);

  const q = sessionExercises[idx] as SessionQ | undefined;

  const totalQuestions = sessionExercises.length;
  const progressPercent =
    totalQuestions > 0 ? ((idx + 1) / totalQuestions) * 100 : 0;

  const sessionQuestionXP = useMemo(() => {
    return sessionExercises
      .slice(0, idx)
      .reduce((sum, item) => sum + (item.xp ?? 0), 0);
  }, [sessionExercises, idx]);

  useEffect(() => {
    setSelected(null);
    setCodeAnswer("");
    setLocked(false);
    setFeedback(null);
    setFeedbackTone("idle");

    shakeAnim.setValue(0);
    scaleAnim.setValue(1);
    fadeAnim.setValue(1);
    feedbackSlide.setValue(30);
    feedbackOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(progressPulse, {
        toValue: 1.02,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(progressPulse, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    if (q && q.type === "trace") {
      const expected: string[][] = q.answer ?? [];
      const rows = expected.length;
      const cols = expected[0]?.length ?? 1;
      const empty: string[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ""),
      );
      setTraceInputs(empty);
    } else {
      setTraceInputs([]);
    }
  }, [
    idx,
    lesson?.id,
    q,
    fadeAnim,
    scaleAnim,
    shakeAnim,
    feedbackSlide,
    feedbackOpacity,
    progressPulse,
  ]);

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missingWrap}>
          <Text style={styles.missingTitle}>Lesson not found</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (sessionExercises.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.missingWrap}>
          <Text style={styles.missingTitle}>No exercises available</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (hearts === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noHeartsWrap}>
          <Text style={styles.noHeartsTitle}>💔 No Hearts Left</Text>
          <Text style={styles.noHeartsText}>
            Wait for hearts to regenerate or refill to continue this lesson run.
          </Text>

          <View style={styles.noHeartsStats}>
            <Text style={styles.noHeartsStat}>Current hearts: {hearts}</Text>
            {secondsUntilNextHeart !== null && (
              <Text style={styles.noHeartsStat}>
                Next heart in ≈ {secondsUntilNextHeart}s
              </Text>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: "#4CAF50" }]}
            onPress={async () => {
              await refillHearts(true);
            }}
          >
            <Text style={styles.primaryButtonText}>Refill Hearts (Demo)</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, { marginTop: 12 }]}
            onPress={() => router.push("/Components/screens")}
          >
            <Text style={styles.secondaryButtonText}>Back to Learn</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const animateCorrect = () => {
    Animated.parallel([
      Animated.timing(confettiScale, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.03,
        useNativeDriver: true,
        friction: 5,
      }),
      Animated.sequence([
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackSlide, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.timing(confettiScale, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  };

  const animateWrong = () => {
    Animated.parallel([
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
          duration: 65,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -6,
          duration: 65,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackSlide, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const animateQuestionTransition = (onDone: () => void) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.985,
          duration: 170,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onDone();
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.985);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
        }),
      ]).start();
    });
  };

  const finishReviewMode = async () => {
    const total = reviewCorrectCount + reviewWrongCount;
    const accuracy =
      total > 0 ? Math.round((reviewCorrectCount / total) * 100) : 0;

    let rewardXP = 0;
    let summaryUnlocks: string[] = [];

    if (canEarnDeckReward(lesson.id)) {
      if (accuracy >= 90) rewardXP = 20;
      else if (accuracy >= 75) rewardXP = 15;
      else if (accuracy >= 60) rewardXP = 10;

      if (rewardXP > 0) {
        await addXP(rewardXP);
        await recordXPEarned(rewardXP);
        await markDeckRewardClaimed(lesson.id);
        summaryUnlocks.push(`Review reward +${rewardXP} XP`);
      }
    }

    showSessionSummary(
      {
        title: `${lesson.title} Review`,
        xpEarned: rewardXP,
        accuracy,
        streakPeak: bestCombo,
        improvedArea: lesson.module ?? "Lesson review",
        weakestArea:
          reviewWrongCount > 0 ? "Questions answered incorrectly" : undefined,
        unlocked: summaryUnlocks,
      },
      {
        onClose: () => {
          router.replace("/Components/screens");
        },
      },
    );
  };

  const goNext = async () => {
    if (idx + 1 >= sessionExercises.length) {
      if (reviewMode) {
        await finishReviewMode();
        return;
      }

      const earnedXP = await completeLesson(lesson.id, 20);
      await recordLessonComplete(earnedXP);

      const totalXPForRun = earnedXP + sessionXP;
      const totalAnswered = sessionCorrect + sessionWrong;
      const accuracy =
        totalAnswered > 0
          ? Math.round((sessionCorrect / totalAnswered) * 100)
          : undefined;

      const currentLessonIndex = allLessons.findIndex(
        (l) => l.id === lesson.id,
      );
      const nextLesson = allLessons[currentLessonIndex + 1];

      showSessionSummary(
        {
          title: lesson.title,
          xpEarned: totalXPForRun,
          accuracy,
          streakPeak: bestCombo,
          improvedArea: lesson.module ?? "Lesson progress",
          weakestArea:
            sessionWrong > 0 ? "Questions answered incorrectly" : undefined,
          unlocked: [],
        },
        {
          onClose: () => {
            router.replace({
              pathname: `/lesson-complete/${lesson.id}`,
              params: {
                nextId: nextLesson?.id ?? "",
                earnedXP: String(totalXPForRun),
              },
            });
          },
        },
      );

      return;
    }

    animateQuestionTransition(() => {
      setIdx((prev) => prev + 1);
    });
  };

  const handleResult = async (result: EvaluationResult) => {
    await recordLessonAttempt(lesson.id);
    await recordLessonAnswerResult(lesson.id, result.correct);

    setFeedback(result.feedback ?? null);

    if (result.correct) {
      setFeedbackTone("correct");
      animateCorrect();

      if (reviewMode) {
        setReviewCorrectCount((prev) => prev + 1);
      } else {
        await addXP(result.xpEarned);
        await recordXPEarned(result.xpEarned);
        setSessionXP((prev) => prev + result.xpEarned);
      }

      setSessionCorrect((prev) => prev + 1);

      const nextCombo = comboStreak + 1;
      setComboStreak(nextCombo);
      setBestCombo((prev) => Math.max(prev, nextCombo));
    } else {
      setFeedbackTone("wrong");
      animateWrong();
      setReviewWrongCount((prev) => prev + 1);
      setSessionWrong((prev) => prev + 1);
      setComboStreak(0);
      await loseHeart();
    }
  };

  const onMCQPress = async (i: number) => {
    if (locked || q?.type !== "mc") return;

    setSelected(i);
    setLocked(true);

    const result: EvaluationResult = evaluateQuestion(q, i);
    await handleResult(result);

    setTimeout(async () => {
      if (result.correct || reviewMode) {
        await goNext();
        setLocked(false);
        setSelected(null);
      } else {
        setLocked(false);
      }
    }, 850);
  };

  const onSubmitCode = async () => {
    if (locked || !q) return;
    if (!["code", "debug"].includes(q.type)) return;

    setLocked(true);
    Keyboard.dismiss?.();

    const result: EvaluationResult = evaluateQuestion(q, codeAnswer);
    await handleResult(result);

    setTimeout(async () => {
      if (result.correct || reviewMode) {
        await goNext();
        setLocked(false);
        setCodeAnswer("");
      } else {
        setLocked(false);
      }
    }, 900);
  };

  const onSubmitTrace = async () => {
    if (locked || !q || q.type !== "trace") return;

    setLocked(true);
    Keyboard.dismiss?.();

    const result: EvaluationResult = evaluateQuestion(q, traceInputs);
    await handleResult(result);

    setTimeout(async () => {
      if (result.correct || reviewMode) {
        await goNext();
        setLocked(false);
        setTraceInputs([]);
      } else {
        setLocked(false);
      }
    }, 900);
  };

  const optionStyle = (i: number) => {
    if (selected === null || q?.type !== "mc") return styles.option;
    if (i === q.correct) return [styles.option, styles.correct];
    if (i === selected && selected !== q.correct) {
      return [styles.option, styles.wrong];
    }
    return [styles.option, styles.dimmedOption];
  };

  const traceHint = (question: CodeQ) => {
    if (question.type === "trace") {
      return "Fill in the trace table cells below.";
    }
    if (question.type === "debug") {
      return "Provide corrected code. Small formatting differences are accepted.";
    }
    return null;
  };

  const onExitPress = () => {
    setExitModalVisible(true);
  };

  const continueLearning = () => {
    setExitModalVisible(false);
  };

  const leaveLesson = () => {
    setExitModalVisible(false);
    router.back();
  };

  const streakLabel =
    comboStreak >= 5
      ? "Hot streak"
      : comboStreak >= 3
        ? "Combo rolling"
        : comboStreak >= 1
          ? "In rhythm"
          : "Reset";

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <View style={styles.topXpWrap}>
              <XPBar />
            </View>

            <Pressable style={styles.exitCircle} onPress={onExitPress}>
              <Text style={styles.exitCircleText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.lessonTitleWrap}>
                <Text style={styles.heroEyebrow}>
                  {reviewMode ? "Review Run" : "Lesson Run"}
                </Text>
                <Text style={styles.title}>{lesson.title}</Text>
                <Text style={styles.subtitle}>
                  {reviewMode
                    ? "Sharpen memory and chase the review reward."
                    : "Push through the lesson and finish strong."}
                </Text>
              </View>

              <Animated.View
                style={[
                  styles.progressBadge,
                  { transform: [{ scale: progressPulse }] },
                ]}
              >
                <Text style={styles.progressBadgeText}>
                  {idx + 1}/{totalQuestions}
                </Text>
              </Animated.View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>❤️ Hearts</Text>
                <Text style={styles.metricValue}>{hearts}</Text>
              </View>

              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>⚡ Session XP</Text>
                <Text style={styles.metricValue}>
                  {reviewMode ? 0 : sessionXP}
                </Text>
              </View>

              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>🔥 Combo</Text>
                <Text style={styles.metricValue}>{comboStreak}</Text>
              </View>
            </View>

            <View style={styles.streakStrip}>
              <Text style={styles.streakStripText}>{streakLabel}</Text>
              {secondsUntilNextHeart !== null && (
                <Text style={styles.streakHint}>
                  Next heart in ≈ {secondsUntilNextHeart}s
                </Text>
              )}
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
                  opacity: fadeAnim,
                },
              ]}
            >
              <View style={styles.questionTopRow}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>
                    {q?.type === "mc"
                      ? "Multiple Choice"
                      : q?.type === "code"
                        ? "Code"
                        : q?.type === "debug"
                          ? "Debug"
                          : "Trace"}
                  </Text>
                </View>

                <View style={styles.xpRewardPill}>
                  <Text style={styles.xpRewardText}>+{q?.xp ?? 0} XP</Text>
                </View>
              </View>

              <Text style={styles.question}>{q?.text}</Text>

              {q?.type === "mc" &&
                q.options.map((opt, i) => (
                  <Pressable
                    key={`${q.sessionId}-option-${i}`}
                    onPress={() => onMCQPress(i)}
                    style={({ pressed }) => [
                      optionStyle(i),
                      pressed && !locked && styles.pressedOption,
                    ]}
                  >
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text style={styles.optionText}>{opt}</Text>
                  </Pressable>
                ))}

              {(q?.type === "code" || q?.type === "debug") && (
                <>
                  {"prompt" in q && q.prompt ? (
                    <View style={styles.promptBox}>
                      <Text style={styles.codePrompt}>{q.prompt}</Text>
                    </View>
                  ) : null}

                  {traceHint(q) ? (
                    <Text style={styles.inlineHint}>{traceHint(q)}</Text>
                  ) : null}

                  <TextInput
                    style={[
                      styles.input,
                      q.type === "debug" && styles.debugInput,
                    ]}
                    value={codeAnswer}
                    onChangeText={setCodeAnswer}
                    editable={!locked}
                    placeholder={
                      q.type === "debug"
                        ? "Type the corrected code here"
                        : "Type answer here"
                    }
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={onSubmitCode}
                    returnKeyType="done"
                    multiline
                  />

                  <Pressable
                    onPress={onSubmitCode}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      pressed && styles.pressedOption,
                    ]}
                  >
                    <Text style={styles.submitText}>
                      {locked ? "Checking..." : "Submit Answer"}
                    </Text>
                  </Pressable>
                </>
              )}

              {q?.type === "trace" && q.columns && Array.isArray(q.answer) && (
                <>
                  {"prompt" in q && q.prompt ? (
                    <View style={styles.promptBox}>
                      <Text style={styles.codePrompt}>{q.prompt}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.inlineHint}>{traceHint(q)}</Text>

                  <View style={styles.traceTable}>
                    <View style={styles.traceRow}>
                      {q.columns.map((col: string, colIdx: number) => (
                        <View
                          key={`${q.sessionId}-header-${colIdx}`}
                          style={[styles.traceCell, styles.traceHeader]}
                        >
                          <Text style={styles.traceHeaderText}>{col}</Text>
                        </View>
                      ))}
                    </View>

                    {q.answer.map((row: any[], rowIdx: number) => (
                      <View
                        key={`${q.sessionId}-row-${rowIdx}`}
                        style={styles.traceRow}
                      >
                        {row.map((_: any, colIdx: number) => (
                          <TextInput
                            key={`${q.sessionId}-cell-${rowIdx}-${colIdx}`}
                            style={styles.traceCellInput}
                            value={traceInputs[rowIdx]?.[colIdx] ?? ""}
                            onChangeText={(text) => {
                              const copy = traceInputs.map((r) => r.slice());
                              if (!copy[rowIdx]) copy[rowIdx] = [];
                              copy[rowIdx][colIdx] = text;
                              setTraceInputs(copy);
                            }}
                            editable={!locked}
                            placeholder=""
                            returnKeyType="done"
                          />
                        ))}
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={onSubmitTrace}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      { marginTop: 8 },
                      pressed && styles.pressedOption,
                    ]}
                  >
                    <Text style={styles.submitText}>
                      {locked ? "Checking..." : "Submit Trace"}
                    </Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
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
              feedbackTone === "correct" && styles.feedbackCorrect,
              feedbackTone === "wrong" && styles.feedbackWrong,
              {
                opacity: feedbackOpacity,
                transform: [{ translateY: feedbackSlide }],
              },
            ]}
          >
            <View>
              <Text style={styles.feedbackLabel}>
                {feedbackTone === "correct"
                  ? "Nice work"
                  : feedbackTone === "wrong"
                    ? "Not quite"
                    : "Ready"}
              </Text>
              <Text style={styles.feedbackText}>
                {feedback ??
                  (reviewMode
                    ? "Review carefully and keep the streak alive."
                    : "Stay focused and keep the run moving.")}
              </Text>
            </View>

            <View style={styles.feedbackMeta}>
              <Text style={styles.feedbackMetaText}>
                {reviewMode
                  ? "Review"
                  : `${sessionQuestionXP + (q?.xp ?? 0)} potential`}
              </Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>

      <Modal visible={exitModalVisible} transparent animationType="fade">
        <View style={styles.rewardOverlay}>
          <View style={styles.exitModalCard}>
            <Text style={styles.exitModalTitle}>Leave lesson?</Text>
            <Text style={styles.exitModalText}>
              You’ll exit this run now. Any unfinished progress in this lesson
              flow won’t be completed.
            </Text>

            <View style={styles.exitModalStats}>
              <View style={styles.exitModalPill}>
                <Text style={styles.exitModalPillLabel}>Progress</Text>
                <Text style={styles.exitModalPillValue}>
                  {idx + 1}/{totalQuestions}
                </Text>
              </View>

              <View style={styles.exitModalPill}>
                <Text style={styles.exitModalPillLabel}>Session XP</Text>
                <Text style={styles.exitModalPillValue}>
                  {reviewMode ? 0 : sessionXP}
                </Text>
              </View>
            </View>

            <View style={styles.exitModalButtons}>
              <Pressable
                style={[styles.exitModalButton, styles.exitStayButton]}
                onPress={continueLearning}
              >
                <Text style={styles.exitStayText}>Keep Going</Text>
              </Pressable>

              <Pressable
                style={[styles.exitModalButton, styles.exitLeaveButton]}
                onPress={leaveLesson}
              >
                <Text style={styles.exitLeaveText}>Exit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const topPad = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    paddingTop: topPad,
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  missingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  missingTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 18,
  },

  noHeartsWrap: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  noHeartsTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  noHeartsText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: "#4B5563",
    textAlign: "center",
  },

  noHeartsStats: {
    marginTop: 18,
    marginBottom: 22,
    alignItems: "center",
  },

  noHeartsStat: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 6,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    marginBottom: 12,
  },

  topXpWrap: {
    flex: 1,
  },

  exitCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  exitCircleText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },

  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  lessonTitleWrap: {
    flex: 1,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },

  progressBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  progressBadgeText: {
    color: "#4338CA",
    fontWeight: "900",
    fontSize: 12,
  },

  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  metricPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },

  metricLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },

  metricValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  streakStrip: {
    marginTop: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  streakStripText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6C63FF",
  },

  streakHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 999,
  },

  scrollArea: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 110,
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  questionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  typePill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  typePillText: {
    color: "#4338CA",
    fontWeight: "800",
    fontSize: 12,
  },

  xpRewardPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  xpRewardText: {
    color: "#92400E",
    fontWeight: "900",
    fontSize: 12,
  },

  question: {
    fontSize: 20,
    lineHeight: 29,
    marginBottom: 16,
    fontWeight: "800",
    color: "#111827",
  },

  option: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  correct: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1.5,
    borderColor: "#22C55E",
  },

  wrong: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },

  dimmedOption: {
    opacity: 0.72,
  },

  pressedOption: {
    opacity: 0.88,
  },

  optionBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  optionBadgeText: {
    fontWeight: "900",
    color: "#374151",
  },

  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: "#111827",
    fontWeight: "700",
  },

  promptBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  codePrompt: {
    fontSize: 15,
    lineHeight: 23,
    color: "#1F2937",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  inlineHint: {
    color: "#6B7280",
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
  },

  input: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
    minHeight: 52,
    maxHeight: 180,
    fontSize: 15,
    color: "#111827",
  },

  debugInput: {
    minHeight: 120,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  submitBtn: {
    paddingVertical: 14,
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  traceTable: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#fff",
  },

  traceRow: {
    flexDirection: "row",
  },

  traceCell: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  traceHeader: {
    backgroundColor: "#F3F4F6",
  },

  traceHeaderText: {
    fontWeight: "800",
    textAlign: "center",
    color: "#374151",
  },

  traceCellInput: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    minHeight: 44,
    textAlign: "center",
    backgroundColor: "#fff",
    color: "#111827",
    fontWeight: "700",
  },

  confetti: {
    position: "absolute",
    right: 22,
    top: 140,
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  confettiText: {
    fontSize: 36,
  },

  feedbackBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    backgroundColor: "#fff",
  },

  feedbackCorrect: {
    backgroundColor: "#DCFCE7",
  },

  feedbackWrong: {
    backgroundColor: "#FEE2E2",
  },

  feedbackLabel: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#374151",
  },

  feedbackText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: "#111827",
    maxWidth: "82%",
  },

  feedbackMeta: {
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },

  feedbackMetaText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#374151",
  },

  rewardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  exitModalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
  },

  exitModalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  exitModalText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: "#4B5563",
    textAlign: "center",
  },

  exitModalStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  exitModalPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  exitModalPillLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "800",
  },

  exitModalPillValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  exitModalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  exitModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  exitStayButton: {
    backgroundColor: "#6C63FF",
  },

  exitLeaveButton: {
    backgroundColor: "#F3F4F6",
  },

  exitStayText: {
    color: "#fff",
    fontWeight: "900",
  },

  exitLeaveText: {
    color: "#111827",
    fontWeight: "900",
  },

  primaryButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 180,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  secondaryButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 180,
  },

  secondaryButtonText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 15,
  },
});
