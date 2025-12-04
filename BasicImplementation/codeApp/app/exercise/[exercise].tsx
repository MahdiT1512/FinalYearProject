import React, { useRef, useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { XPContext } from "../context/XPContext";

type MCQ = { type: "mc"; text: string; options: string[]; correct: number };
type CodeQ = { type: "code"; text: string; prompt: string; answer: string };
type Q = MCQ | CodeQ;

const QUESTIONS: Q[] = [
  { type: "mc", text: "What is a variable?", options: ["A container for storing data", "A loop", "A function", "A debugging tool"], correct: 0 },
  { type: "mc", text: "Which symbol is used for assignment in Python?", options: ["=", "==", ":=", "=>"], correct: 0 },
  { type: "code", text: "Fill in the blank so this prints 10 (type x for now):", prompt: "print( ___ )  # fill variable name that contains 10", answer: "x" },
];

export default function ExercisePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addXP, completeLesson } = useContext(XPContext);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [locked, setLocked] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;

  const q = QUESTIONS[idx];

  useEffect(() => {
    setSelected(null);
    setCodeAnswer("");
    setLocked(false);
    shakeAnim.setValue(0);
    scaleAnim.setValue(1);
    fadeAnim.setValue(1);
  }, [idx]);

  const animateCorrect = () => {
    Animated.parallel([
      Animated.timing(confettiScale, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.out(Easing.back(1)) }),
      Animated.spring(scaleAnim, { toValue: 1.06, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(confettiScale, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    });
  };

  const animateWrong = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (idx + 1 >= QUESTIONS.length) {
      completeLesson(id as string); 
      router.push(`../lesson-complete/${id}`);
    } else {
      setIdx(idx + 1);
    }
  };

  const onMCQPress = (i: number) => {
    if (locked) return;
    setSelected(i);
    setLocked(true);

    const correctIndex = (q as MCQ).correct;

    if (i === correctIndex) {
      animateCorrect();
      addXP(10);

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
    if (locked) return;
    setLocked(true);
    Keyboard.dismiss?.();

    const expected = ((q as CodeQ).answer || "").trim().toLowerCase();
    const provided = codeAnswer.trim().toLowerCase();

    if (provided === expected) {
      animateCorrect();
      addXP(15);
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
    if (i === selected && selected !== (q as MCQ).correct) return [styles.option, styles.wrong];
    return [styles.option, { opacity: 0.7 }];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise: {id}</Text>

      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }], opacity: fadeAnim },
        ]}
      >
        <Text style={styles.question}>{q.text}</Text>

        {q.type === "mc" &&
          (q as MCQ).options.map((opt, i) => (
            <Pressable
              key={i}
              onPress={() => onMCQPress(i)}
              style={({ pressed }) => [optionStyle(i), pressed && !locked && styles.pressedOption]}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </Pressable>
          ))}

        {q.type === "code" && (
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
              style={({ pressed }) => [styles.submitBtn, pressed && styles.pressedOption]}
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
          {
            transform: [{ scale: confettiScale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }],
            opacity: confettiScale.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.9, 0] }),
          },
        ]}
      >
        <Text style={styles.confettiText}>🎉</Text>
      </Animated.View>

      <View style={{ height: 20 }} />
      <Text style={styles.hint}>Question {idx + 1} / {QUESTIONS.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "#f9f9fb", padding: 14, borderRadius: 12, elevation: 2 },
  question: { fontSize: 18, marginBottom: 12, fontWeight: "600" },
  option: { padding: 12, backgroundColor: "#eee", borderRadius: 10, marginVertical: 6 },
  optionText: { fontSize: 16 },
  correct: { backgroundColor: "#dff7e0", borderWidth: 1, borderColor: "#3fa34d" },
  wrong: { backgroundColor: "#ffdfe0", borderWidth: 1, borderColor: "#c43a3a" },
  pressedOption: { opacity: 0.85 },
  codePrompt: { fontSize: 16, marginBottom: 8, color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 8, marginBottom: 10, backgroundColor: "#fff" },
  submitBtn: { padding: 12, backgroundColor: "#FFB703", borderRadius: 8, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" },
  confetti: { position: "absolute", right: 24, top: 90, width: 60, height: 60, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  confettiText: { fontSize: 32, textAlign: "center" },
  hint: { marginTop: 10, textAlign: "center", color: "#666" },
});