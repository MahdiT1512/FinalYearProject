import React, { useEffect, useContext, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { XPContext } from "../context/XPContext";

export default function LessonComplete() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { completeLesson } = useContext(XPContext);

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.card, { opacity: fade, transform: [{ scale }] }]}
      >
        <Text style={styles.title}>🎉 Lesson Complete!</Text>
        <Text style={styles.subtitle}>{id} finished</Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/Components/screens")}
        >
          <Text style={styles.buttonText}>Back to Learn</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.nextButton]}
          onPress={() => router.push("/learn/Lesson%202")}
        >
          <Text style={styles.buttonText}>Go to Next Lesson ➜</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#A0E7E5",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: { fontSize: 18, marginBottom: 25, textAlign: "center" },
  button: {
    backgroundColor: "#0077b6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  nextButton: { backgroundColor: "#023e8a" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
