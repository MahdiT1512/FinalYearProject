import React, { useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { XPContext } from "../context/XPContext"; // adjust path if needed
import XPBar from "../Components/common/XPBar";
import lessonsData from "../data/lessons.json";
import {
  evaluateQuestion,
  EvaluationResult,
} from "../context/QuestionEvaluator";

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
  answer: any; // string or string[][]
  xp: number;
};
type Q = MCQ | CodeQ;

type Lesson = {
  id: string;
  title: string;
  content: string;
  exercises: Q[];
};

export default function ExercisePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    addXP,
    completeLesson,
    hearts,
    loseHeart,
    refillHearts,
    secondsUntilNextHeart,
  } = useContext(XPContext);

  const allLessons = lessonsData as Lesson[];
  const lesson = allLessons.find((l) => l.id === id);

  const exercises = lesson?.exercises ?? [];

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // trace specific inputs: 2D array of strings
  const [traceInputs, setTraceInputs] = useState<string[][]>([]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;

  const q = exercises[idx] as Q | undefined;

  // initialize traceInputs whenever question changes & it's a trace
  useEffect(() => {
    setSelected(null);
    setCodeAnswer("");
    setLocked(false);
    setFeedback(null);
    shakeAnim.setValue(0);
    scaleAnim.setValue(1);
    fadeAnim.setValue(1);

    if (q && (q as any).type === "trace") {
      const expected: string[][] = (q as any).answer ?? [];
      const rows = expected.length;
      const cols = expected[0]?.length ?? 1;
      // initialize empty strings
      const empty: string[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ""),
      );
      setTraceInputs(empty);
    } else {
      setTraceInputs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, lesson?.id]);

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Lesson not found</Text>
      </View>
    );
  }

  // No hearts UI — show refill + info
  if (hearts === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💔 No Hearts Left</Text>
        <Text style={styles.subtitle}>
          Wait for hearts to regenerate or refill to continue exercises.
        </Text>

        <View style={{ width: "100%", alignItems: "center" }}>
          <Pressable
            style={[styles.exitBtn, { backgroundColor: "#4CAF50" }]}
            onPress={() => {
              refillHearts(true);
            }}
          >
            <Text style={styles.exitText}>Refill Hearts (Demo)</Text>
          </Pressable>

          <Pressable
            style={[styles.exitBtn, { marginTop: 12 }]}
            onPress={() => router.push("/Components/screens")}
          >
            <Text style={styles.exitText}>Back to Learn</Text>
          </Pressable>

          {secondsUntilNextHeart !== null && (
            <Text style={{ marginTop: 12, color: "#666" }}>
              Next heart in ≈ {secondsUntilNextHeart}s
            </Text>
          )}
        </View>
      </View>
    );
  }

  const animateCorrect = () => {
    Animated.parallel([
      Animated.timing(confettiScale, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, { toValue: 1.06, useNativeDriver: true }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(confettiScale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goNext = () => {
    if (idx + 1 >= exercises.length) {
      completeLesson(lesson.id, 0);
      router.push(`/lesson-complete/${lesson.id}`);
    } else {
      setIdx(idx + 1);
    }
  };

  const onMCQPress = (i: number) => {
    if (locked || (q as any)?.type !== "mc") return;
    setSelected(i);
    setLocked(true);

    const result: EvaluationResult = evaluateQuestion(q as any, i);
    setFeedback(result.feedback ?? null);

    if (result.correct) {
      animateCorrect();
      addXP(result.xpEarned);
    } else {
      animateWrong();
      loseHeart();
    }

    setTimeout(() => {
      goNext();
      setLocked(false);
      setSelected(null);
      setFeedback(null);
    }, 800);
  };

  const onSubmitCode = () => {
    if (locked || !q) return;
    if (!["code", "debug"].includes((q as any).type)) return;

    setLocked(true);
    Keyboard.dismiss?.();

    const result: EvaluationResult = evaluateQuestion(q as any, codeAnswer);
    setFeedback(result.feedback ?? null);

    if (result.correct) {
      animateCorrect();
      addXP(result.xpEarned);
      setTimeout(() => {
        goNext();
        setLocked(false);
        setCodeAnswer("");
        setFeedback(null);
      }, 900);
    } else {
      animateWrong();
      loseHeart();
      setTimeout(() => {
        setLocked(false);
      }, 800);
    }
  };

  const onSubmitTrace = () => {
    if (locked || !q) return;
    if ((q as any).type !== "trace") return;

    setLocked(true);
    Keyboard.dismiss?.();

    // call evaluator with the 2D inputs
    const result: EvaluationResult = evaluateQuestion(q as any, traceInputs);
    setFeedback(result.feedback ?? null);

    if (result.correct) {
      animateCorrect();
      addXP(result.xpEarned);
      setTimeout(() => {
        goNext();
        setLocked(false);
        setTraceInputs([]);
        setFeedback(null);
      }, 900);
    } else {
      animateWrong();
      loseHeart();
      setTimeout(() => {
        setLocked(false);
      }, 800);
    }
  };

  const optionStyle = (i: number) => {
    if (selected === null) return styles.option;
    if (i === (q as MCQ).correct) return [styles.option, styles.correct];
    if (i === selected && selected !== (q as MCQ).correct)
      return [styles.option, styles.wrong];
    return [styles.option, { opacity: 0.7 }];
  };

  const traceHint = (question: CodeQ) => {
    if ((question as any).type === "trace") {
      return "Format rows with semicolons and columns with commas (UI provided).";
    }
    if ((question as any).type === "debug") {
      return "Provide corrected code. Small formatting differences accepted.";
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.push("/Components/screens")}
      >
        <Text style={styles.backText}>✕</Text>
      </Pressable>

      <Text style={styles.title}>Exercise: {lesson.title}</Text>

      <XPBar />

      <Text style={styles.hearts}>❤️ {hearts}</Text>
      {secondsUntilNextHeart !== null && (
        <Text style={{ textAlign: "center", color: "#666", marginBottom: 8 }}>
          Next heart in ≈ {secondsUntilNextHeart}s
        </Text>
      )}

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <Text style={styles.question}>{q?.text}</Text>

        {/* MCQ */}
        {(q as any)?.type === "mc" &&
          (q as MCQ).options.map((opt, i) => (
            <Pressable
              key={i}
              onPress={() => onMCQPress(i)}
              style={({ pressed }) => [
                optionStyle(i),
                pressed && !locked && styles.pressedOption,
              ]}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </Pressable>
          ))}

        {/* Code & Debug */}
        {((q as any)?.type === "code" || (q as any)?.type === "debug") && (
          <>
            {"prompt" in (q as CodeQ) && (q as CodeQ).prompt ? (
              <Text style={styles.codePrompt}>{(q as CodeQ).prompt}</Text>
            ) : null}

            {traceHint(q as CodeQ) ? (
              <Text style={{ color: "#666", marginBottom: 6 }}>
                {traceHint(q as CodeQ)}
              </Text>
            ) : null}

            <TextInput
              style={[styles.input, { minHeight: 44 }]}
              value={codeAnswer}
              onChangeText={setCodeAnswer}
              editable={!locked}
              placeholder="type answer here"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onSubmitCode}
              returnKeyType="done"
              multiline={true}
            />
            <Pressable
              onPress={onSubmitCode}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.pressedOption,
              ]}
            >
              <Text style={styles.submitText}>Submit</Text>
            </Pressable>
          </>
        )}

        {/* Trace table UI */}
        {(q as any)?.type === "trace" &&
          (q as any).columns &&
          Array.isArray((q as any).answer) && (
            <>
              {"prompt" in (q as CodeQ) && (q as CodeQ).prompt ? (
                <Text style={styles.codePrompt}>{(q as CodeQ).prompt}</Text>
              ) : null}

              <View style={styles.traceTable}>
                {/* header */}
                <View style={styles.traceRow}>
                  {(q as any).columns.map((col: string, colIdx: number) => (
                    <View
                      key={colIdx}
                      style={[styles.traceCell, styles.traceHeader]}
                    >
                      <Text style={{ fontWeight: "700", textAlign: "center" }}>
                        {col}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* rows */}
                {(q as any).answer.map((row: any[], rowIdx: number) => (
                  <View key={rowIdx} style={styles.traceRow}>
                    {row.map((_: any, colIdx: number) => (
                      <TextInput
                        key={colIdx}
                        style={[styles.traceCellInput]}
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
                style={[styles.submitBtn, { marginTop: 8 }]}
              >
                <Text style={styles.submitText}>Submit Trace</Text>
              </Pressable>
            </>
          )}

        {feedback && <Text style={styles.feedback}>{feedback}</Text>}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.confetti,
          { transform: [{ scale: confettiScale }], opacity: confettiScale },
        ]}
      >
        <Text style={styles.confettiText}>🎉</Text>
      </Animated.View>

      <Text style={styles.hint}>
        Question {idx + 1} / {exercises.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#fff" },

  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },

  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 20 },

  hearts: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 4,
  },

  card: {
    backgroundColor: "#f9f9fb",
    padding: 14,
    borderRadius: 12,
    elevation: 2,
  },

  question: { fontSize: 18, marginBottom: 12, fontWeight: "600" },

  option: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginVertical: 6,
  },

  optionText: { fontSize: 16 },

  correct: {
    backgroundColor: "#dff7e0",
    borderWidth: 1,
    borderColor: "#3fa34d",
  },

  wrong: {
    backgroundColor: "#ffdfe0",
    borderWidth: 1,
    borderColor: "#c43a3a",
  },

  pressedOption: { opacity: 0.85 },

  codePrompt: { fontSize: 16, marginBottom: 8, color: "#333" },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    minHeight: 44,
    maxHeight: 160,
  },

  submitBtn: {
    padding: 12,
    backgroundColor: "#FFB703",
    borderRadius: 8,
    alignItems: "center",
  },

  submitText: { color: "#fff", fontWeight: "700" },

  confetti: {
    position: "absolute",
    right: 24,
    top: 90,
  },

  confettiText: { fontSize: 32 },

  backButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "#FF6B6B",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: { color: "#fff", fontSize: 20, fontWeight: "700" },

  exitBtn: {
    marginTop: 20,
    backgroundColor: "#0077b6",
    padding: 12,
    borderRadius: 10,
  },

  exitText: { color: "white", fontWeight: "600" },

  confettiText: { fontSize: 32 },

  hint: { marginTop: 10, textAlign: "center", color: "#666" },

  feedback: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },

  /* trace table styles */
  traceTable: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  traceRow: { flexDirection: "row" },
  traceCell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  traceHeader: { backgroundColor: "#f2f2f2" },
  traceCellInput: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 40,
    textAlign: "center",
  },
});
