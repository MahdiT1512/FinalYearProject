import React, { useContext, useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import lessonsData from "../../data/lessons.json";
import { XPContext, LessonStat } from "../../context/XPContext";

const { width } = Dimensions.get("window");
const DAY_MS = 24 * 60 * 60 * 1000;

type Lesson = {
  id: string;
  title: string;
  module?: string;
};

type RankedLesson = Lesson & {
  recommendationScore: number;
  reason: string;
  estimatedRewardXP: number;
  rewardAvailableToday: boolean;
};

function buildLessonRecommendation(
  stat?: LessonStat,
  rewardAvailableToday: boolean = false,
) {
  const correctAnswers = stat?.correctAnswers ?? 0;
  const wrongAnswers = stat?.wrongAnswers ?? 0;
  const lastPracticedAt = stat?.lastPracticedAt ?? null;

  let score = 0;
  let reason = "Recommended for review";

  const totalAnswered = correctAnswers + wrongAnswers;
  const accuracy = totalAnswered > 0 ? correctAnswers / totalAnswered : 1;

  score += (1 - accuracy) * 60;
  score += Math.min(wrongAnswers * 6, 30);

  if (accuracy < 0.5) reason = "You struggled here before";
  else if (accuracy < 0.8) reason = "Worth reviewing again";

  if (lastPracticedAt) {
    const daysSince = Math.floor((Date.now() - lastPracticedAt) / DAY_MS);
    score += Math.min(daysSince * 4, 40);
    if (daysSince >= 7) reason = "You haven’t reviewed this in a while";
  } else {
    score += 20;
  }

  let estimatedRewardXP = 0;

  if (rewardAvailableToday) {
    if (accuracy >= 0.9) estimatedRewardXP = 20;
    else if (accuracy >= 0.75) estimatedRewardXP = 15;
    else if (accuracy >= 0.6) estimatedRewardXP = 10;
  } else {
    reason = "Daily reward already claimed";
  }

  return {
    score,
    reason,
    estimatedRewardXP,
  };
}

function DeckCard({
  lesson,
  index,
  onPress,
}: {
  lesson: RankedLesson;
  index: number;
  onPress: () => void;
}) {
  const tilt = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(tilt, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }),
      Animated.spring(lift, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(tilt, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }),
      Animated.spring(lift, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }),
    ]).start();
  };

  const overlap = Math.max(0, Math.min(3, index));
  const cardWidth = Math.min(240, Math.round(width * 0.64));
  const stackedScale = 1 - overlap * 0.04;
  const marginLeft = index === 0 ? 0 : -36;

  const rotateZ = tilt.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", index % 2 === 0 ? "-2deg" : "2deg"],
  });

  const rotateY = tilt.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", index % 2 === 0 ? "7deg" : "-7deg"],
  });

  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [stackedScale, stackedScale + 0.03],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      {...(Platform.OS === "web"
        ? {
            onHoverIn: animateIn,
            onHoverOut: animateOut,
          }
        : {})}
      style={{ zIndex: 100 - index }}
    >
      <Animated.View
        style={[
          styles.card,
          lesson.rewardAvailableToday
            ? styles.cardAvailable
            : styles.cardClaimed,
          {
            width: cardWidth,
            marginLeft,
            transform: [
              { perspective: 900 },
              { translateY },
              { rotateZ },
              { rotateY },
              { scale },
            ],
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.rewardDot,
              lesson.rewardAvailableToday
                ? styles.rewardDotLive
                : styles.rewardDotOff,
            ]}
          />
          <Text style={styles.cardModule} numberOfLines={1}>
            {lesson.module ?? "General"}
          </Text>
        </View>

        <Text numberOfLines={2} style={styles.cardTitle}>
          {lesson.title}
        </Text>

        <View>
          <Text style={styles.cardReason} numberOfLines={2}>
            {lesson.reason}
          </Text>

          <View style={styles.rewardPill}>
            <Text style={styles.cardScore}>
              {lesson.rewardAvailableToday
                ? lesson.estimatedRewardXP > 0
                  ? `Up to ${lesson.estimatedRewardXP} XP`
                  : "Improve accuracy for XP"
                : "Claimed today"}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function LessonDeck() {
  const router = useRouter();
  const { lessonStats, canEarnDeckReward } = useContext(XPContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [activeLesson, setActiveLesson] = useState<RankedLesson | null>(null);

  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!modalVisible) return;

    modalScale.setValue(0.9);
    modalOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalVisible, modalOpacity, modalScale]);

  const deck = useMemo(() => {
    const lessons = lessonsData as Lesson[];

    const completedOnly = lessons.filter(
      (lesson) => lessonStats[lesson.id]?.completed,
    );

    const ranked: RankedLesson[] = completedOnly.map((lesson) => {
      const stat = lessonStats[lesson.id];
      const rewardAvailableToday = canEarnDeckReward(lesson.id);
      const recommendation = buildLessonRecommendation(
        stat,
        rewardAvailableToday,
      );

      return {
        ...lesson,
        recommendationScore: recommendation.score,
        reason: recommendation.reason,
        estimatedRewardXP: recommendation.estimatedRewardXP,
        rewardAvailableToday,
      };
    });

    ranked.sort((a, b) => {
      if (b.rewardAvailableToday !== a.rewardAvailableToday) {
        return Number(b.rewardAvailableToday) - Number(a.rewardAvailableToday);
      }

      return b.recommendationScore - a.recommendationScore;
    });

    return ranked.slice(0, 6);
  }, [lessonStats, canEarnDeckReward]);

  if (!deck.length) return null;

  const onPressCard = (lesson: RankedLesson) => {
    setActiveLesson(lesson);
    setModalVisible(true);
  };

  const onStart = () => {
    if (!activeLesson) return;

    setModalVisible(false);

    router.push({
      pathname: `/learn/${activeLesson.id}`,
      params: {
        reviewMode: "1",
      },
    });
  };

  const activeLessonStat = activeLesson
    ? lessonStats[activeLesson.id]
    : undefined;

  const accuracy =
    activeLessonStat &&
    activeLessonStat.correctAnswers + activeLessonStat.wrongAnswers > 0
      ? Math.round(
          (activeLessonStat.correctAnswers /
            (activeLessonStat.correctAnswers + activeLessonStat.wrongAnswers)) *
            100,
        )
      : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Lesson Deck</Text>
          <Text style={styles.subtitle}>Review completed lessons</Text>
        </View>

        <View style={styles.deckCountPill}>
          <Text style={styles.deckCountText}>{deck.length}</Text>
        </View>
      </View>

      <View style={styles.deckContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {deck.map((lesson, idx) => (
            <DeckCard
              key={lesson.id}
              lesson={lesson}
              index={idx}
              onPress={() => onPressCard(lesson)}
            />
          ))}
        </ScrollView>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modal,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <Text style={styles.modalTitle}>{activeLesson?.title}</Text>
            <Text style={styles.modalStat}>
              Module: {activeLesson?.module ?? "General"}
            </Text>

            <Text style={styles.modalHighlight}>Why this is recommended</Text>
            <Text style={styles.modalReason}>
              {activeLesson?.reason ?? "Recommended for review"}
            </Text>

            <View style={styles.statsBox}>
              <Text style={styles.modalStat}>
                Attempts: {activeLessonStat?.attempts ?? 0}
              </Text>
              <Text style={styles.modalStat}>
                Correct: {activeLessonStat?.correctAnswers ?? 0}
              </Text>
              <Text style={styles.modalStat}>
                Wrong: {activeLessonStat?.wrongAnswers ?? 0}
              </Text>
              <Text style={styles.modalStat}>
                Accuracy: {accuracy !== null ? `${accuracy}%` : "—"}
              </Text>
              <Text style={styles.modalStat}>
                Reward available today:{" "}
                {activeLesson?.rewardAvailableToday ? "Yes" : "No"}
              </Text>
              <Text style={styles.modalStat}>
                Max reward today:{" "}
                {activeLesson?.rewardAvailableToday
                  ? activeLesson.estimatedRewardXP
                  : 0}{" "}
                XP
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.btn, styles.startBtn]}
                onPress={onStart}
              >
                <Text style={styles.btnText}>Start Review</Text>
              </Pressable>

              <Pressable
                style={[styles.btn, styles.skipBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Close</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.closeX}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeXText}>✕</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", paddingVertical: 10 },

  headerRow: {
    marginBottom: 10,
    marginLeft: 6,
    marginRight: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  deckCountPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  deckCountText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },

  deckContainer: {
    height: 172,
    justifyContent: "center",
  },

  scrollContent: {
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 16,
  },

  card: {
    height: 146,
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
    marginVertical: 6,
  },

  cardAvailable: {
    backgroundColor: "#6C63FF",
  },

  cardClaimed: {
    backgroundColor: "#9CA3AF",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  rewardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  rewardDotLive: {
    backgroundColor: "#86EFAC",
  },

  rewardDotOff: {
    backgroundColor: "#E5E7EB",
  },

  cardModule: {
    color: "#fff",
    opacity: 0.95,
    fontSize: 12,
    fontWeight: "700",
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    lineHeight: 22,
    marginTop: 6,
  },

  cardReason: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.96,
  },

  rewardPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  cardScore: {
    color: "#fff",
    opacity: 0.98,
    fontSize: 12,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
    color: "#111827",
  },

  modalStat: {
    color: "#555",
    marginBottom: 6,
    fontSize: 14,
  },

  modalHighlight: {
    marginTop: 8,
    fontWeight: "900",
    fontSize: 15,
    color: "#111827",
  },

  modalReason: {
    color: "#333",
    marginTop: 6,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },

  statsBox: {
    width: "100%",
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },

  modalButtons: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
    justifyContent: "space-between",
    gap: 12,
  },

  btn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
  },

  startBtn: {
    backgroundColor: "#4CAF50",
  },

  skipBtn: {
    backgroundColor: "#FF6B6B",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
  },

  closeX: {
    position: "absolute",
    top: 10,
    right: 10,
  },

  closeXText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#444",
  },
});
