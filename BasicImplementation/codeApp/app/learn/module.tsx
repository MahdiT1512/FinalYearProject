import React, { useContext, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import lessonsData from "../data/lessons.json";
import { XPContext } from "../context/XPContext";
import XPBar from "../Components/common/XPBar";
import ProfileButton from "../Components/common/ProfileButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH - 28, 420);
const NODE_SIZE = 82;

type Lesson = {
  id: string;
  title: string;
  module?: string;
};

export default function ModuleScreen() {
  const { module } = useLocalSearchParams<{ module?: string }>();
  const router = useRouter();

  const { completedLessons, pendingReviewCount, getLessonXPModifier } =
    useContext(XPContext);

  const lessons = (lessonsData as Lesson[]).filter(
    (l) => (l.module || "General") === module,
  );

  const topPadding =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 16) : 0;

  const xpModifier = getLessonXPModifier();

  const progress = useMemo(() => {
    const completedCount = lessons.filter((lesson) =>
      completedLessons.includes(lesson.id),
    ).length;

    return {
      completedCount,
      totalCount: lessons.length,
      percent:
        lessons.length > 0
          ? Math.round((completedCount / lessons.length) * 100)
          : 0,
    };
  }, [lessons, completedLessons]);

  const firstIncompleteIndex = useMemo(() => {
    const index = lessons.findIndex(
      (lesson) => !completedLessons.includes(lesson.id),
    );
    return index === -1 ? lessons.length - 1 : index;
  }, [lessons, completedLessons]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.78)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.78,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [pulseAnim, glowAnim]);

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safe, { paddingTop: topPadding }]}>
        <View style={styles.container}>
          <View style={styles.infoRow}>
            <View style={styles.xpWrap}>
              <XPBar />
            </View>

            <View style={styles.profileWrap}>
              <ProfileButton />
            </View>
          </View>

          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push("/Components/screens")}
                accessibilityLabel="Back to Learn"
              >
                <Text style={styles.backText}>←</Text>
              </Pressable>

              <View style={styles.moduleTitleWrap}>
                <Text numberOfLines={1} style={styles.title}>
                  {module ?? "Module"}
                </Text>
                <Text style={styles.moduleMeta}>
                  {progress.completedCount}/{progress.totalCount} lessons
                  complete
                </Text>
              </View>

              <View style={styles.backButtonPlaceholder} />
            </View>

            <View style={styles.headerChipsRow}>
              <View style={styles.infoChip}>
                <Text style={styles.infoChipLabel}>Reviews waiting</Text>
                <Text style={styles.infoChipValue}>{pendingReviewCount}</Text>
              </View>

              <View style={styles.infoChip}>
                <Text style={styles.infoChipLabel}>New lesson XP</Text>
                <Text style={styles.infoChipValue}>
                  {Math.round(xpModifier * 100)}%
                </Text>
              </View>

              <View style={styles.infoChip}>
                <Text style={styles.infoChipLabel}>Unit progress</Text>
                <Text style={styles.infoChipValue}>{progress.percent}%</Text>
              </View>
            </View>

            <View style={styles.unitProgressWrap}>
              <View style={styles.unitProgressTrack}>
                <View
                  style={[
                    styles.unitProgressFill,
                    { width: `${progress.percent}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {pendingReviewCount >= 3 ? (
            <View style={styles.reviewBanner}>
              <Text style={styles.reviewBannerText}>
                Lesson deck waiting: {pendingReviewCount} review
                {pendingReviewCount === 1 ? "" : "s"}.
              </Text>
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.path}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.pathLane}>
              {lessons.map((lesson, index) => {
                const previousLesson = lessons[index - 1];
                const unlocked =
                  index === 0 || completedLessons.includes(previousLesson?.id);
                const completed = completedLessons.includes(lesson.id);
                const current = index === firstIncompleteIndex && !completed;

                const isLeft = index % 2 === 0;
                const nodePositionStyle = isLeft
                  ? styles.nodeLeft
                  : styles.nodeRight;
                const labelPositionStyle = isLeft
                  ? styles.labelLeft
                  : styles.labelRight;

                const nodeContent = completed
                  ? "✓"
                  : !unlocked
                    ? "🔒"
                    : String(index + 1);

                const animatedStyle =
                  current && unlocked
                    ? {
                        transform: [{ scale: pulseAnim }],
                        opacity: glowAnim,
                      }
                    : null;

                return (
                  <View key={lesson.id} style={styles.lessonWrap}>
                    <Animated.View
                      style={[
                        styles.nodeWrap,
                        nodePositionStyle,
                        animatedStyle,
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.node,
                          completed && styles.completedNode,
                          !unlocked && styles.lockedNode,
                          current && unlocked && styles.currentNode,
                        ]}
                        disabled={!unlocked}
                        onPress={() => router.push(`/learn/${lesson.id}`)}
                      >
                        <Text style={styles.nodeText}>{nodeContent}</Text>
                      </Pressable>
                    </Animated.View>

                    <View
                      style={[
                        styles.lessonLabelWrap,
                        labelPositionStyle,
                        current && unlocked && styles.currentLabelWrap,
                      ]}
                    >
                      <Text
                        style={[
                          styles.lessonLabel,
                          !unlocked && styles.lessonLabelLocked,
                        ]}
                        numberOfLines={2}
                      >
                        {lesson.title}
                      </Text>

                      <Text style={styles.lessonStateText}>
                        {completed
                          ? "Completed"
                          : !unlocked
                            ? "Locked"
                            : current
                              ? "Current lesson"
                              : "Unlocked"}
                      </Text>
                    </View>

                    {index < lessons.length - 1 && (
                      <View
                        style={[
                          styles.connector,
                          isLeft ? styles.connectorRight : styles.connectorLeft,
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  container: {
    flex: 1,
    padding: 14,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },

  xpWrap: {
    flex: 1,
  },

  profileWrap: {
    width: 48,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 12,
  },

  headerCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPlaceholder: {
    width: 42,
    height: 42,
  },

  backText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  moduleTitleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },

  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  moduleMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  headerChipsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  infoChip: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },

  infoChipLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
  },

  infoChipValue: {
    marginTop: 4,
    fontSize: 17,
    color: "#111827",
    fontWeight: "900",
  },

  unitProgressWrap: {
    marginTop: 14,
  },

  unitProgressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  unitProgressFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 999,
  },

  reviewBanner: {
    backgroundColor: "#FFF4D6",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  reviewBannerText: {
    color: "#8A5B00",
    fontWeight: "800",
    textAlign: "center",
    fontSize: 13,
  },

  path: {
    paddingBottom: 120,
    paddingTop: 10,
    alignItems: "center",
  },

  pathLane: {
    width: CONTENT_WIDTH,
    alignSelf: "center",
  },

  lessonWrap: {
    minHeight: 150,
    position: "relative",
    marginBottom: 8,
  },

  nodeWrap: {
    position: "relative",
    width: NODE_SIZE,
  },

  nodeLeft: {
    marginLeft: 0,
  },

  nodeRight: {
    marginLeft: CONTENT_WIDTH - NODE_SIZE,
  },

  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: "#A0E7E5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  completedNode: {
    backgroundColor: "#4CAF50",
  },

  currentNode: {
    backgroundColor: "#6C63FF",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },

  lockedNode: {
    backgroundColor: "#D1D5DB",
    opacity: 0.9,
  },

  nodeText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0C2733",
  },

  lessonLabelWrap: {
    position: "absolute",
    top: 94,
    width: 170,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },

  labelLeft: {
    left: 0,
  },

  labelRight: {
    right: 0,
  },

  currentLabelWrap: {
    borderWidth: 2,
    borderColor: "#6C63FF",
  },

  lessonLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    textAlign: "center",
  },

  lessonLabelLocked: {
    color: "#9CA3AF",
  },

  lessonStateText: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "800",
    textAlign: "center",
  },

  connector: {
    position: "absolute",
    top: 34,
    width: 64,
    height: 52,
    borderBottomWidth: 3,
    borderColor: "rgba(255,255,255,0.78)",
  },

  connectorRight: {
    left: 72,
    borderRightWidth: 3,
    borderBottomRightRadius: 22,
  },

  connectorLeft: {
    right: 72,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 22,
  },
});
