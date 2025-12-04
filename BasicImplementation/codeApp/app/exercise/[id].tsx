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
import { XPContext } from "../context/XPContext";
import XPBar from "../Components/common/XPBar";
import lessonsData from "../data/lessons.json";

type MCQ = {
  type: "mc";
  text: string;
  options: string[];
  correct: number;
  xp: number;
};
type CodeQ = {
  type: "code";
  text: string;
  prompt: string;
  answer: string;
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
  const { addXP, completeLesson } = useContext(XPContext);

  const lesson = (lessonsData as Lesson[]).find((l) => l.id === id);

  const exercises = lesson?.exercises ?? [];

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [locked, setLocked] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;

  const q = exercises[idx];

  useEffect(() => {
    setSelected(null);
    setCodeAnswer("");
    setLocked(false);
    shakeAnim.setValue(0);
    scaleAnim.setValue(1);
    fadeAnim.setValue(1);
  }, [idx]);

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Lesson not found</Text>
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
    if (locked || q?.type !== "mc") return;
    setSelected(i);
    setLocked(true);

    if (i === (q as MCQ).correct) {
      animateCorrect();
      addXP((q as MCQ).xp);

      setTimeout(() => {
        goNext();
        setLocked(false);
        setSelected(null);
      }, 700);
    } else {
      animateWrong();
      setTimeout(() => {
        setLocked(false);
        setSelected(null);
      }, 700);
    }
  };

  const onSubmitCode = () => {
    if (locked || q?.type !== "code") return;
    setLocked(true);
    Keyboard.dismiss?.();

    const expected = (q as CodeQ).answer.trim().toLowerCase();
    const provided = codeAnswer.trim().toLowerCase();

    if (provided === expected) {
      animateCorrect();
      addXP((q as CodeQ).xp);

      setTimeout(() => {
        goNext();
        setLocked(false);
        setCodeAnswer("");
      }, 800);
    } else {
      animateWrong();
      setTimeout(() => setLocked(false), 700);
    }
  };

  const optionStyle = (i: number) => {
    if (selected === null) return styles.option;
    if (i === (q as MCQ).correct) return [styles.option, styles.correct];
    if (i === selected && selected !== (q as MCQ).correct)
      return [styles.option, styles.wrong];
    return [styles.option, { opacity: 0.7 }];
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

        {q?.type === "mc" &&
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

        {q?.type === "code" && (
          <>
            <Text style={styles.codePrompt}>{(q as CodeQ).prompt}</Text>
            <TextInput
              style={styles.input}
              value={codeAnswer}
              onChangeText={setCodeAnswer}
              editable={!locked}
              placeholder="type answer here"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onSubmitCode}
              returnKeyType="done"
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
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
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
  wrong: { backgroundColor: "#ffdfe0", borderWidth: 1, borderColor: "#c43a3a" },
  pressedOption: { opacity: 0.85 },
  codePrompt: { fontSize: 16, marginBottom: 8, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
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
    width: 60,
    height: 60,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
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

  confettiText: { fontSize: 32, textAlign: "center" },
  hint: { marginTop: 10, textAlign: "center", color: "#666" },
});
