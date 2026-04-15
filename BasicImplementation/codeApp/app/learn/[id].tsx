import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Markdown from "react-native-markdown-display";
import lessonsData from "../data/lessons.json";
import XPBar from "../Components/common/XPBar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Exercise = {
  type: "mc" | "code" | "trace" | "debug";
  text: string;
  options?: string[];
  correct?: number;
  prompt?: string;
  answer?: string | string[] | string[][];
  xp: number;
};

type LessonSlide = {
  id: string;
  type: "intro" | "concept" | "example" | "tip" | "recap" | "summary";
  title: string;
  body: string;
};

type Lesson = {
  id: string;
  title: string;
  content: string;
  exercises: Exercise[];
  module?: string;
  slides?: LessonSlide[];
};

type BuiltLessonSlide = LessonSlide & {
  source: "structured" | "generated";
};

function buildGeneratedSlides(lesson: Lesson): BuiltLessonSlide[] {
  const raw = lesson.content?.trim() ?? "";

  const sectionRegex = /(?=^##\s.+$|^###\s.+$)/gm;
  const chunks = raw
    .split(sectionRegex)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const slides: BuiltLessonSlide[] = [
    {
      id: `${lesson.id}-intro`,
      type: "intro",
      title: lesson.title,
      body: `### ${lesson.module ?? "Lesson"}\n\nThis lesson has **${lesson.exercises.length} exercise${lesson.exercises.length === 1 ? "" : "s"}** waiting at the end.\n\nMove through each page to unlock the exercise.`,
      source: "generated",
    },
  ];

  if (chunks.length === 0) {
    slides.push({
      id: `${lesson.id}-content-0`,
      type: "concept",
      title: "Lesson",
      body: raw || "No lesson content available.",
      source: "generated",
    });
  } else {
    chunks.forEach((chunk, index) => {
      const firstHeadingMatch = chunk.match(/^#{2,3}\s+(.+)$/m);
      const extractedTitle =
        firstHeadingMatch?.[1]?.trim() || `Part ${index + 1}`;

      slides.push({
        id: `${lesson.id}-content-${index}`,
        type: index % 3 === 0 ? "concept" : index % 3 === 1 ? "example" : "tip",
        title: extractedTitle,
        body: chunk,
        source: "generated",
      });
    });
  }

  const totalQuestionXP = lesson.exercises.reduce(
    (sum, item) => sum + item.xp,
    0,
  );

  slides.push({
    id: `${lesson.id}-summary`,
    type: "summary",
    title: "Ready to Practice?",
    body: `## Lesson Recap\n\n- **Questions:** ${lesson.exercises.length}\n- **Question XP available:** ${totalQuestionXP}\n- **Completion reward:** extra XP at the end\n\nTake the exercise to lock the lesson in.`,
    source: "generated",
  });

  return slides;
}

function buildSlides(lesson: Lesson): BuiltLessonSlide[] {
  if (Array.isArray(lesson.slides) && lesson.slides.length > 0) {
    return lesson.slides.map((slide) => ({
      ...slide,
      source: "structured",
    }));
  }

  return buildGeneratedSlides(lesson);
}

function slideAccent(type: BuiltLessonSlide["type"]) {
  switch (type) {
    case "intro":
      return { bg: "#FFF7ED", pillBg: "#FFEDD5", pillText: "#C2410C" };
    case "concept":
      return { bg: "#FFFFFF", pillBg: "#EEF2FF", pillText: "#4338CA" };
    case "example":
      return { bg: "#F0FDF4", pillBg: "#DCFCE7", pillText: "#166534" };
    case "tip":
      return { bg: "#FFFCEB", pillBg: "#FEF3C7", pillText: "#92400E" };
    case "recap":
      return { bg: "#F0F9FF", pillBg: "#DBEAFE", pillText: "#1D4ED8" };
    case "summary":
      return { bg: "#F5F3FF", pillBg: "#EDE9FE", pillText: "#6D28D9" };
    default:
      return { bg: "#FFFFFF", pillBg: "#EEF2FF", pillText: "#4338CA" };
  }
}

export default function LessonPage() {
  const { id, reviewMode } = useLocalSearchParams<{
    id: string;
    reviewMode?: string;
  }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<BuiltLessonSlide>>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const lesson = (lessonsData as Lesson[]).find((l) => l.id === id);

  const slides = useMemo(() => {
    if (!lesson) return [];
    return buildSlides(lesson);
  }, [lesson]);

  const [currentPage, setCurrentPage] = useState(0);
  const [furthestPageSeen, setFurthestPageSeen] = useState(0);

  useEffect(() => {
    if (!slides.length) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.012,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim, slides.length]);

  const topPadding =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 16) : 0;

  if (!lesson) {
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: topPadding }]}>
        <View style={styles.missingContainer}>
          <Text style={styles.missingText}>Lesson not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lastPageIndex = slides.length - 1;
  const isLastPage = currentPage === lastPageIndex;
  const exerciseUnlocked = furthestPageSeen >= lastPageIndex;
  const progressPercent =
    slides.length > 0
      ? Math.round(((currentPage + 1) / slides.length) * 100)
      : 0;

  const startExercise = () => {
    router.push({
      pathname: `/exercise/${lesson.id}`,
      params: reviewMode ? { reviewMode } : {},
    });
  };

  const goToPage = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, lastPageIndex));
    flatListRef.current?.scrollToIndex({
      index: safeIndex,
      animated: true,
      viewPosition: 0,
    });
    setCurrentPage(safeIndex);
    setFurthestPageSeen((prev) => Math.max(prev, safeIndex));
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextPage = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(nextPage);
    setFurthestPageSeen((prev) => Math.max(prev, nextPage));
  };

  const totalQuestionXP = lesson.exercises.reduce(
    (sum, item) => sum + item.xp,
    0,
  );

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topPadding }]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarXp}>
            <XPBar />
          </View>

          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              {reviewMode === "1" && (
                <View style={styles.reviewPill}>
                  <Text style={styles.reviewPillText}>Review Mode</Text>
                </View>
              )}

              <Text style={styles.eyebrow}>Guided Lesson</Text>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonModule}>
                {lesson.module ?? "General"}
              </Text>
            </View>
          </View>

          <View style={styles.lessonMetaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Pages</Text>
              <Text style={styles.metaValue}>{slides.length}</Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Exercises</Text>
              <Text style={styles.metaValue}>{lesson.exercises.length}</Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Question XP</Text>
              <Text style={styles.metaValue}>{totalQuestionXP}</Text>
            </View>
          </View>

          <View style={styles.progressShell}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentPage + 1} / {slides.length} pages
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          bounces={false}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item, index }) => {
            const accent = slideAccent(item.type);
            const isSummary = item.type === "summary";

            return (
              <View style={styles.pageOuter}>
                <View style={styles.pageWrap}>
                  <Animated.View
                    style={[
                      styles.pageCard,
                      { backgroundColor: accent.bg },
                      index === currentPage
                        ? { transform: [{ scale: pulseAnim }] }
                        : null,
                    ]}
                  >
                    <View style={styles.pageTopRow}>
                      <Text style={styles.pageCounter}>
                        Page {index + 1} / {slides.length}
                      </Text>

                      <View
                        style={[
                          styles.typePill,
                          { backgroundColor: accent.pillBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typePillText,
                            { color: accent.pillText },
                          ]}
                        >
                          {item.type === "intro"
                            ? "Intro"
                            : item.type === "concept"
                              ? "Concept"
                              : item.type === "example"
                                ? "Example"
                                : item.type === "tip"
                                  ? "Tip"
                                  : item.type === "recap"
                                    ? "Recap"
                                    : "Finish"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.pageTitle}>{item.title}</Text>

                    <View style={styles.markdownWrap}>
                      <Markdown style={markdownStyles}>{item.body}</Markdown>
                    </View>

                    {isSummary && (
                      <View style={styles.summaryFooter}>
                        <Pressable
                          style={[
                            styles.startButton,
                            !exerciseUnlocked && styles.startButtonLocked,
                          ]}
                          onPress={startExercise}
                          disabled={!exerciseUnlocked}
                        >
                          <Text style={styles.startButtonText}>
                            {reviewMode === "1"
                              ? "Start Review"
                              : "Start Exercise"}
                          </Text>
                        </Pressable>

                        {!exerciseUnlocked && (
                          <Text style={styles.unlockHint}>
                            Reach the final page to unlock the exercise.
                          </Text>
                        )}

                        {exerciseUnlocked && (
                          <Text style={styles.unlockReady}>
                            ✅ Exercise unlocked
                          </Text>
                        )}
                      </View>
                    )}
                  </Animated.View>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.bottomBar}>
          <View style={styles.dotsRow}>
            {slides.map((_, index) => {
              const active = index === currentPage;
              const seen = index <= furthestPageSeen;

              return (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.dot,
                    seen && styles.dotSeen,
                    active && styles.dotActive,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.navRow}>
            <Pressable
              style={[
                styles.navButton,
                currentPage === 0 && styles.navButtonDisabled,
              ]}
              disabled={currentPage === 0}
              onPress={() => goToPage(currentPage - 1)}
            >
              <Text
                style={[
                  styles.navButtonText,
                  currentPage === 0 && styles.navButtonTextDisabled,
                ]}
              >
                Back
              </Text>
            </Pressable>

            {!isLastPage ? (
              <Pressable
                style={styles.navButtonPrimary}
                onPress={() => goToPage(currentPage + 1)}
              >
                <Text style={styles.navButtonPrimaryText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.navButtonPrimary,
                  !exerciseUnlocked && styles.navButtonPrimaryLocked,
                ]}
                disabled={!exerciseUnlocked}
                onPress={startExercise}
              >
                <Text style={styles.navButtonPrimaryText}>
                  {reviewMode === "1" ? "Start Review" : "Start Exercise"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: { fontSize: 16, lineHeight: 26, color: "#333" },
  heading1: {
    fontSize: 28,
    fontWeight: "bold" as const,
    marginBottom: 14,
    color: "#FF6B6B",
  },
  heading2: {
    fontSize: 22,
    fontWeight: "700" as const,
    marginVertical: 10,
    color: "#4ECDC4",
  },
  heading3: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginVertical: 6,
    color: "#1A535C",
  },
  code_block: {
    backgroundColor: "#FFE6E6",
    padding: 14,
    borderRadius: 12,
    fontFamily: "monospace",
    marginVertical: 10,
  },
  bullet_list: { marginVertical: 8, marginLeft: 20 },
  list_item: { fontSize: 16, lineHeight: 24, marginVertical: 4, color: "#555" },
  strong: { color: "#FF6B6B", fontWeight: "bold" as const },
  em: { fontStyle: "italic" as const, color: "#4ECDC4" },
  link: { color: "#1A535C", textDecorationLine: "underline" as const },
  blockquote: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFA500",
    marginVertical: 10,
    borderRadius: 8,
  },
  inline_code: {
    backgroundColor: "#FFE6E6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 15,
    color: "blue",
  },
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F0F8FF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F0F8FF",
    paddingTop: 12,
  },

  missingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  missingText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  topBarXp: {
    flex: 1,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  closeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },

  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  lessonTitle: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },

  lessonModule: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },

  lessonMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  metaPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
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

  progressShell: {
    marginTop: 16,
  },

  progressTrack: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 999,
  },

  progressText: {
    marginTop: 8,
    textAlign: "right",
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  reviewPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },

  reviewPillText: {
    color: "#4338CA",
    fontWeight: "800",
    fontSize: 12,
  },

  pageOuter: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  pageWrap: {
    flex: 1,
  },

  pageCard: {
    flex: 1,
    borderRadius: 22,
    padding: 20,
    minHeight: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  pageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  pageCounter: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  typePillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },

  markdownWrap: {
    flex: 1,
  },

  summaryFooter: {
    marginTop: 16,
  },

  startButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  startButtonLocked: {
    backgroundColor: "#D1D5DB",
  },

  startButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  unlockHint: {
    marginTop: 10,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 12,
  },

  unlockReady: {
    marginTop: 10,
    color: "#15803D",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 12,
  },

  bottomBar: {
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 5,
  },

  dotSeen: {
    backgroundColor: "#A5B4FC",
  },

  dotActive: {
    width: 20,
    backgroundColor: "#6C63FF",
  },

  navRow: {
    flexDirection: "row",
    gap: 10,
  },

  navButton: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  navButtonDisabled: {
    opacity: 0.45,
  },

  navButtonText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 15,
  },

  navButtonTextDisabled: {
    color: "#6B7280",
  },

  navButtonPrimary: {
    flex: 1,
    backgroundColor: "#6C63FF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  navButtonPrimaryLocked: {
    backgroundColor: "#C7D2FE",
  },

  navButtonPrimaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});
