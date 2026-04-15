import React, { useContext, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { XPContext } from "../../context/XPContext";
import {
  SyntaxContext,
  SyntaxCategory,
  Keyword,
} from "../../context/SyntaxContext";
import XPBar from "../../Components/common/XPBar";
import ProfileButton from "../../Components/common/ProfileButton";

function CategoryProgressBar({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [animatedWidth, progress]);

  return (
    <View style={styles.categoryProgressTrack}>
      <Animated.View
        style={[
          styles.categoryProgressFill,
          {
            backgroundColor: color,
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

function KeywordMasteryBar({
  mastery,
  color,
}: {
  mastery: number;
  color: string;
}) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: mastery,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [animatedWidth, mastery]);

  return (
    <View style={styles.keywordBarTrack}>
      <Animated.View
        style={[
          styles.keywordBarFill,
          {
            backgroundColor: color,
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

function CategoryActionButton({
  title,
  subtitle,
  onPress,
  accentColor,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  accentColor: string;
  disabled?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      style={styles.actionPressable}
    >
      <Animated.View
        style={[
          styles.categoryActionCard,
          disabled && styles.categoryActionCardDisabled,
          {
            borderColor: accentColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.categoryActionTitle,
            disabled && styles.categoryActionTitleDisabled,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.categoryActionSubtitle,
            disabled && styles.categoryActionSubtitleDisabled,
          ]}
        >
          {subtitle}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function KeywordCard({
  keyword,
  accentColor,
  onPress,
}: {
  keyword: Keyword;
  accentColor: string;
  onPress: () => void;
}) {
  const locked = !keyword.unlocked;
  const mastered = keyword.mastery >= 100;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.keywordCard,
        locked && styles.keywordCardLocked,
        mastered && styles.keywordCardMastered,
        pressed && !locked && styles.keywordCardPressed,
      ]}
      disabled={locked}
      onPress={onPress}
    >
      <View style={styles.keywordHeaderRow}>
        <Text
          style={[styles.keywordName, locked && styles.keywordNameLocked]}
          numberOfLines={1}
        >
          {locked ? "🔒 Locked" : keyword.name}
        </Text>

        <View
          style={[
            styles.keywordStatePill,
            mastered
              ? styles.keywordStatePillMastered
              : locked
                ? styles.keywordStatePillLocked
                : styles.keywordStatePillActive,
          ]}
        >
          <Text
            style={[
              styles.keywordStateText,
              mastered
                ? styles.keywordStateTextMastered
                : locked
                  ? styles.keywordStateTextLocked
                  : styles.keywordStateTextActive,
            ]}
          >
            {mastered ? "Mastered" : locked ? "Locked" : "Practice"}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.keywordDescription,
          locked && styles.keywordDescriptionLocked,
        ]}
        numberOfLines={2}
      >
        {locked
          ? "Complete earlier syntax to unlock this keyword."
          : keyword.description}
      </Text>

      <View style={styles.keywordProgressMetaRow}>
        <Text
          style={[
            styles.keywordProgressLabel,
            locked && styles.keywordProgressLabelLocked,
          ]}
        >
          Mastery
        </Text>
        <Text
          style={[
            styles.keywordProgressValue,
            locked && styles.keywordProgressLabelLocked,
          ]}
        >
          {keyword.mastery}%
        </Text>
      </View>

      <KeywordMasteryBar
        mastery={locked ? 0 : keyword.mastery}
        color={accentColor}
      />

      <View style={styles.keywordFooterRow}>
        <Text
          style={[
            styles.keywordFooterText,
            locked && styles.keywordProgressLabelLocked,
          ]}
        >
          {locked
            ? "Unavailable"
            : keyword.remainingExercises > 0
              ? `${keyword.remainingExercises} exercises left`
              : mastered
                ? "Fully complete"
                : "Ready for review"}
        </Text>

        {!locked && (
          <Text style={styles.keywordFooterCTA}>
            {mastered ? "Review →" : "Start →"}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function getBestCategoryStartKeyword(
  category: SyntaxCategory,
  mode: "category" | "continue" | "weakest",
) {
  const unlockedKeywords = category.keywords.filter(
    (keyword) => keyword.unlocked,
  );

  if (unlockedKeywords.length === 0) return null;

  if (mode === "continue") {
    const unfinished = unlockedKeywords.filter(
      (keyword) => keyword.remainingExercises > 0 || keyword.mastery < 100,
    );

    if (unfinished.length > 0) {
      return [...unfinished].sort((a, b) => {
        if (a.keywordIndex !== b.keywordIndex)
          return a.keywordIndex - b.keywordIndex;
        return a.mastery - b.mastery;
      })[0];
    }
  }

  if (mode === "weakest") {
    return [...unlockedKeywords].sort((a, b) => {
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      return b.remainingExercises - a.remainingExercises;
    })[0];
  }

  return [...unlockedKeywords].sort(
    (a, b) => a.keywordIndex - b.keywordIndex,
  )[0];
}

function CategorySection({
  category,
  onPracticeKeyword,
  onPracticeCategory,
}: {
  category: SyntaxCategory;
  onPracticeKeyword: (keywordId: string) => void;
  onPracticeCategory: (
    categoryId: string,
    mode: "category" | "continue" | "weakest",
  ) => void;
}) {
  const locked = !category.unlocked;
  const continueKeyword = getBestCategoryStartKeyword(category, "continue");
  const weakestKeyword = getBestCategoryStartKeyword(category, "weakest");
  const learnKeyword = getBestCategoryStartKeyword(category, "category");

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{category.title}</Text>
          <Text style={styles.sectionDescription}>{category.description}</Text>
        </View>

        <View
          style={[
            styles.sectionStatusPill,
            locked
              ? styles.sectionStatusLocked
              : category.progress >= 100
                ? styles.sectionStatusMastered
                : styles.sectionStatusActive,
          ]}
        >
          <Text
            style={[
              styles.sectionStatusText,
              locked
                ? styles.sectionStatusTextLocked
                : category.progress >= 100
                  ? styles.sectionStatusTextMastered
                  : styles.sectionStatusTextActive,
            ]}
          >
            {locked ? "Locked" : category.progress >= 100 ? "Mastered" : "Open"}
          </Text>
        </View>
      </View>

      <View style={styles.sectionMetaRow}>
        <Text style={styles.sectionMetaText}>
          {category.masteredKeywords}/{category.totalKeywords} mastered
        </Text>
        <Text style={styles.sectionMetaText}>{category.progress}%</Text>
      </View>

      <CategoryProgressBar
        progress={locked ? 0 : category.progress}
        color={category.accentColor}
      />

      {locked ? (
        <Text style={styles.lockHint}>
          🔒 Reach 60% in the previous category to unlock this one.
        </Text>
      ) : (
        <Text style={styles.unlockHint}>
          {category.availableKeywords} keyword
          {category.availableKeywords === 1 ? "" : "s"} available right now.
        </Text>
      )}

      <View style={styles.categoryActionsRow}>
        <CategoryActionButton
          title="Practice Category"
          subtitle={
            learnKeyword
              ? `Start with ${learnKeyword.name}`
              : "No keyword available"
          }
          accentColor={category.accentColor}
          disabled={locked || !learnKeyword}
          onPress={() => onPracticeCategory(category.id, "category")}
        />

        <CategoryActionButton
          title="Continue"
          subtitle={
            continueKeyword
              ? `Pick up ${continueKeyword.name}`
              : "Nothing active yet"
          }
          accentColor={category.accentColor}
          disabled={locked || !continueKeyword}
          onPress={() => onPracticeCategory(category.id, "continue")}
        />

        <CategoryActionButton
          title="Review Weakest"
          subtitle={
            weakestKeyword
              ? `Target ${weakestKeyword.name}`
              : "No keyword available"
          }
          accentColor={category.accentColor}
          disabled={locked || !weakestKeyword}
          onPress={() => onPracticeCategory(category.id, "weakest")}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.keywordScroller}
      >
        {category.keywords.map((keyword) => (
          <KeywordCard
            key={keyword.id}
            keyword={keyword}
            accentColor={category.accentColor}
            onPress={() => onPracticeKeyword(keyword.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function SyntaxScreen() {
  const router = useRouter();
  const { level, streakCount } = useContext(XPContext);
  const { categories } = useContext(SyntaxContext);

  const syntaxSummary = useMemo(() => {
    const totalKeywords = categories.reduce(
      (sum, category) => sum + category.totalKeywords,
      0,
    );
    const unlockedCategories = categories.filter(
      (category) => category.unlocked,
    ).length;
    const masteredKeywords = categories.reduce(
      (sum, category) => sum + category.masteredKeywords,
      0,
    );
    const averageProgress =
      categories.length > 0
        ? Math.round(
            categories.reduce((sum, category) => sum + category.progress, 0) /
              categories.length,
          )
        : 0;

    return {
      totalKeywords,
      unlockedCategories,
      masteredKeywords,
      averageProgress,
    };
  }, [categories]);

  const handlePracticeKeyword = (keywordId: string) => {
    router.push({
      pathname: "/syntax/SyntaxPractice",
      params: {
        keywordId,
        exerciseIndex: "0",
      },
    });
  };

  const handlePracticeCategory = (
    categoryId: string,
    mode: "category" | "continue" | "weakest",
  ) => {
    router.push({
      pathname: "/syntax/SyntaxPractice",
      params: {
        categoryId,
        mode,
      },
    });
  };

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoRow}>
            <View style={styles.xpWrap}>
              <XPBar />
            </View>

            <View style={styles.profileWrap}>
              <ProfileButton />
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Syntax Path</Text>
            <Text style={styles.heroTitle}>
              Build Python fluency one skill at a time.
            </Text>
            <Text style={styles.heroSubtitle}>
              Unlock categories, raise mastery, and keep your syntax knowledge
              moving forward like a real progression system.
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatNumber}>
                  {syntaxSummary.averageProgress}%
                </Text>
                <Text style={styles.heroStatLabel}>Overall</Text>
              </View>

              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatNumber}>
                  {syntaxSummary.masteredKeywords}
                </Text>
                <Text style={styles.heroStatLabel}>Mastered</Text>
              </View>

              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatNumber}>
                  {syntaxSummary.unlockedCategories}/{categories.length}
                </Text>
                <Text style={styles.heroStatLabel}>Categories</Text>
              </View>
            </View>

            <View style={styles.secondaryStatsRow}>
              <View style={styles.secondaryCard}>
                <Text style={styles.secondaryLabel}>⭐ Level</Text>
                <Text style={styles.secondaryValue}>{level}</Text>
              </View>

              <View style={styles.secondaryCard}>
                <Text style={styles.secondaryLabel}>🔥 Streak</Text>
                <Text style={styles.secondaryValue}>{streakCount} days</Text>
              </View>

              <View style={styles.secondaryCard}>
                <Text style={styles.secondaryLabel}>⌨️ Keywords</Text>
                <Text style={styles.secondaryValue}>
                  {syntaxSummary.totalKeywords}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.pageTitle}>Syntax Categories</Text>
            <Text style={styles.pageSubtitle}>
              Progress through Python syntax in a guided order.
            </Text>
          </View>

          {categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              onPracticeKeyword={handlePracticeKeyword}
              onPracticeCategory={handlePracticeCategory}
            />
          ))}
        </ScrollView>
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
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  content: {
    paddingBottom: 36,
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

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
  },

  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  heroStatPill: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },

  heroStatNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  heroStatLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
  },

  secondaryStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  secondaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
  },

  secondaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  secondaryValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  sectionHeader: {
    marginBottom: 10,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  pageSubtitle: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 13,
  },

  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  sectionDescription: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 18,
  },

  sectionStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  sectionStatusLocked: {
    backgroundColor: "#F3F4F6",
  },

  sectionStatusActive: {
    backgroundColor: "#EEF2FF",
  },

  sectionStatusMastered: {
    backgroundColor: "#DCFCE7",
  },

  sectionStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  sectionStatusTextLocked: {
    color: "#6B7280",
  },

  sectionStatusTextActive: {
    color: "#4338CA",
  },

  sectionStatusTextMastered: {
    color: "#166534",
  },

  sectionMetaRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  categoryProgressTrack: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  categoryProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  lockHint: {
    marginTop: 10,
    color: "#B42318",
    fontWeight: "800",
    fontSize: 12,
  },

  unlockHint: {
    marginTop: 10,
    color: "#198754",
    fontWeight: "800",
    fontSize: 12,
  },

  categoryActionsRow: {
    marginTop: 14,
    gap: 10,
  },

  actionPressable: {
    width: "100%",
  },

  categoryActionCard: {
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  categoryActionCardDisabled: {
    opacity: 0.5,
    borderColor: "#D1D5DB",
  },

  categoryActionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  categoryActionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  categoryActionTitleDisabled: {
    color: "#6B7280",
  },

  categoryActionSubtitleDisabled: {
    color: "#9CA3AF",
  },

  keywordScroller: {
    paddingTop: 14,
    paddingRight: 6,
  },

  keywordCard: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  keywordCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  keywordCardLocked: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },

  keywordCardMastered: {
    borderColor: "#86EFAC",
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },

  keywordHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  keywordName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  keywordNameLocked: {
    color: "#6B7280",
  },

  keywordStatePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  keywordStatePillActive: {
    backgroundColor: "#EEF2FF",
  },

  keywordStatePillMastered: {
    backgroundColor: "#DCFCE7",
  },

  keywordStatePillLocked: {
    backgroundColor: "#E5E7EB",
  },

  keywordStateText: {
    fontSize: 10,
    fontWeight: "800",
  },

  keywordStateTextActive: {
    color: "#4338CA",
  },

  keywordStateTextMastered: {
    color: "#166534",
  },

  keywordStateTextLocked: {
    color: "#6B7280",
  },

  keywordDescription: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
    minHeight: 38,
  },

  keywordDescriptionLocked: {
    color: "#9CA3AF",
  },

  keywordProgressMetaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  keywordProgressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  keywordProgressLabelLocked: {
    color: "#9CA3AF",
  },

  keywordProgressValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },

  keywordBarTrack: {
    marginTop: 8,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  keywordBarFill: {
    height: "100%",
    borderRadius: 999,
  },

  keywordFooterRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  keywordFooterText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  keywordFooterCTA: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "900",
  },
});
