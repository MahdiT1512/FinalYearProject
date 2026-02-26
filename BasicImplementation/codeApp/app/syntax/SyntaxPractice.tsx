import React, { useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { XPContext } from "../context/XPContext";
import { SyntaxContext, Keyword, Exercise } from "../context/SyntaxContext";
import XPBar from "../Components/common/XPBar";

export default function SyntaxPractice() {
  const { addXP, xp: globalXP } = useContext(XPContext);
  const { keywords, updateKeyword } = useContext(SyntaxContext);
  const router = useRouter();
  const { keywordId } = useLocalSearchParams<{ keywordId?: string }>();

  // --- Local state for navigation ---
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [locked, setLocked] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const confettiScale = useRef(new Animated.Value(0)).current;

  // --- Initialize current keyword ---
  useEffect(() => {
    if (!keywordId) return;
    const kIdx = keywords.findIndex((k) => k.id === keywordId);
    if (kIdx !== -1) {
      setCurrentKeywordIndex(kIdx);
      setExerciseIndex(0);
    }
  }, [keywordId, keywords]);

  const keyword: Keyword | undefined = keywords[currentKeywordIndex];
  const exercises: Exercise[] = keyword?.exercises ?? [];
  const exercise: Exercise | undefined = exercises[exerciseIndex];

  if (!keyword) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Keyword not found</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push("/Components/screens/syntax")}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  // --- Animation helpers ---
  const animateCorrect = () => {
    Animated.parallel([
      Animated.timing(confettiScale, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, { toValue: 1.06, useNativeDriver: true }),
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

  // --- Answer handling ---
  const handleMCQPress = (i: number) => {
    if (locked || exercise?.type !== "mc") return;
    setSelectedOption(i);
    setLocked(true);

    const correct = i === (exercise as any).correct;
    if (correct) {
      animateCorrect();
      addXP(exercise.xp);
      setSessionXP((s) => s + exercise.xp);
      updateKeyword(keyword.id, exercise.xp, true);
      setTimeout(() => handleNext(), 700);
    } else {
      animateWrong();
      updateKeyword(keyword.id, 0, false);
      setTimeout(() => setLocked(false), 700);
    }
  };

  const handleCodeSubmit = () => {
    if (locked || exercise?.type !== "code") return;
    setLocked(true);
    Keyboard.dismiss();

    const expected = (exercise as any).answer.trim().toLowerCase();
    const provided = codeAnswer.trim().toLowerCase();

    if (provided === expected) {
      animateCorrect();
      addXP(exercise.xp);
      setSessionXP((s) => s + exercise.xp);
      updateKeyword(keyword.id, exercise.xp, true);
      setTimeout(() => {
        setCodeAnswer("");
        handleNext();
      }, 800);
    } else {
      animateWrong();
      updateKeyword(keyword.id, 0, false);
      setTimeout(() => setLocked(false), 700);
    }
  };

  // --- Navigation ---
  const findNextKeywordWithWork = (startIdx: number) => {
    for (let i = startIdx + 1; i < keywords.length; i++) {
      if ((keywords[i].remainingExercises ?? 0) > 0) return i;
    }
    for (let i = 0; i <= startIdx; i++) {
      if ((keywords[i].remainingExercises ?? 0) > 0) return i;
    }
    return -1;
  };

  const handleNext = () => {
    setSelectedOption(null);
    setLocked(false);

    if (exerciseIndex + 1 < exercises.length) {
      setExerciseIndex(exerciseIndex + 1);
    } else {
      const nextKeywordIdx = findNextKeywordWithWork(currentKeywordIndex);
      if (nextKeywordIdx !== -1 && nextKeywordIdx !== currentKeywordIndex) {
        setCurrentKeywordIndex(nextKeywordIdx);
        setExerciseIndex(0);
      } else {
        router.push("/Components/screens/syntax");
      }
    }
  };

  // --- Option styles ---
  const optionStyle = (i: number) => {
    if (selectedOption === null) return styles.option;
    if (i === (exercise as any).correct) return [styles.option, styles.correct];
    if (i === selectedOption && selectedOption !== (exercise as any).correct)
      return [styles.option, styles.wrong];
    return [styles.option, { opacity: 0.7 }];
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.push("/Components/screens/syntax")}
      >
        <Text style={styles.backText}>✕</Text>
      </Pressable>

      <Text style={styles.title}>Practice: {keyword.name}</Text>
      <XPBar />

      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.question}>{exercise?.text}</Text>

        {exercise?.type === "mc" &&
          (exercise as any).options.map((opt: string, i: number) => (
            <Pressable
              key={i}
              onPress={() => handleMCQPress(i)}
              style={({ pressed }) => [
                optionStyle(i),
                pressed && !locked && styles.pressedOption,
              ]}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </Pressable>
          ))}

        {exercise?.type === "code" && (
          <>
            <Text style={styles.codePrompt}>{(exercise as any).prompt}</Text>
            <TextInput
              style={styles.input}
              value={codeAnswer}
              onChangeText={setCodeAnswer}
              editable={!locked}
              placeholder="type answer here"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleCodeSubmit}
              returnKeyType="done"
            />
            <Pressable onPress={handleCodeSubmit} style={styles.submitBtn}>
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
        Question {exerciseIndex + 1} / {exercises.length}
      </Text>
      <Text style={styles.smallText}>
        Session XP: {sessionXP} | Total XP: {globalXP}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 14 },
  title: { fontSize: 22, fontWeight: "700", marginVertical: 12 },
  card: {
    backgroundColor: "#f9f9fb",
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    flexShrink: 2,
    height: "200%",
    maxWidth: "100%",
  },
  question: { fontSize: 18, marginBottom: 12, fontWeight: "600" },
  option: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginVertical: 6,
  },
  correct: {
    backgroundColor: "#dff7e0",
    borderWidth: 1,
    borderColor: "#3fa34d",
  },
  wrong: { backgroundColor: "#ffdfe0", borderWidth: 1, borderColor: "#c43a3a" },
  pressedOption: { opacity: 0.85 },
  optionText: { fontSize: 16 },
  codePrompt: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
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
    alignItems: "center",
    justifyContent: "center",
  },
  confettiText: { fontSize: 32, textAlign: "center" },
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
  hint: { marginTop: 10, textAlign: "center", color: "#666" },
  smallText: { textAlign: "center", color: "#333", marginTop: 4 },
});
