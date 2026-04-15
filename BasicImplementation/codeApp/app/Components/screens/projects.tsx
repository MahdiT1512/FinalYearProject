import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { XPContext } from "../../context/XPContext";
import { ProjectsContext, Project } from "../../context/ProjectContext";
import XPBar from "../../Components/common/XPBar";
import ProfileButton from "../../Components/common/ProfileButton";

const difficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case "Advanced":
      return "#F04438";
    case "Intermediate":
      return "#F79009";
    default:
      return "#12B76A";
  }
};

const formatMinutes = (minutes?: number) => {
  if (!minutes) return "Flexible";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
};

type FilterMode = "all" | "open" | "completed" | "locked";

export default function ProjectsScreen() {
  const router = useRouter();

  const { userSkillLevel, completedLessons } = useContext(XPContext);
  const {
    projects,
    isAccessible,
    getProjectLockReason,
    getRecommendedProjects,
    getProjectsByCategory,
    getProjectProgress,
  } = useContext(ProjectsContext);

  const [filter, setFilter] = useState<FilterMode>("all");

  const recommendedProjects = useMemo(
    () => getRecommendedProjects(3),
    [getRecommendedProjects],
  );

  const stats = useMemo(() => {
    const completed = projects.filter((p) => p.completed).length;
    const unlocked = projects.filter((p) =>
      isAccessible(p, userSkillLevel, completedLessons.length),
    ).length;
    const locked = projects.length - unlocked;

    return { completed, unlocked, locked };
  }, [projects, isAccessible, userSkillLevel, completedLessons.length]);

  const beginnerGateRemaining = Math.max(0, 3 - completedLessons.length);

  const sections = useMemo(() => {
    const grouped = getProjectsByCategory();

    return Object.entries(grouped)
      .map(([title, data]) => {
        const filtered = data.filter((project) => {
          const accessible = isAccessible(
            project,
            userSkillLevel,
            completedLessons.length,
          );

          if (filter === "open") return accessible && !project.completed;
          if (filter === "completed") return !!project.completed;
          if (filter === "locked") return !accessible;
          return true;
        });

        return { title, data: filtered };
      })
      .filter((section) => section.data.length > 0);
  }, [
    getProjectsByCategory,
    isAccessible,
    userSkillLevel,
    completedLessons.length,
    filter,
  ]);

  const renderProjectCard = (item: Project, compact: boolean = false) => {
    const accessible = isAccessible(
      item,
      userSkillLevel,
      completedLessons.length,
    );
    const lockReason = getProjectLockReason(
      item,
      userSkillLevel,
      completedLessons.length,
    );
    const progress = getProjectProgress(item.id);
    const totalStages = item.stages?.length ?? 0;
    const stageProgress =
      totalStages > 0
        ? Math.round((progress.completedStages.length / totalStages) * 100)
        : 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          compact ? styles.recommendedCard : styles.card,
          !accessible && styles.lockedCard,
          item.completed && styles.completedCard,
        ]}
        activeOpacity={0.92}
        disabled={!accessible}
        onPress={() =>
          router.push({
            pathname: "/projects/[projectId]",
            params: { projectId: item.id },
          })
        }
      >
        <View style={styles.cardTopRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>

          <View
            style={[
              styles.statusPill,
              item.completed
                ? styles.donePill
                : accessible
                  ? styles.openPill
                  : styles.lockedPill,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.completed
                  ? styles.doneText
                  : accessible
                    ? styles.openText
                    : styles.lockedText,
              ]}
            >
              {item.completed ? "Completed" : accessible ? "Open" : "Locked"}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>XP</Text>
            <Text style={styles.metaValue}>{item.xp}</Text>
          </View>

          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>
              {formatMinutes(item.estimatedMinutes)}
            </Text>
          </View>

          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Difficulty</Text>
            <Text
              style={[
                styles.metaValue,
                { color: difficultyColor(item.difficulty) },
              ]}
            >
              {item.difficulty ?? "Beginner"}
            </Text>
          </View>
        </View>

        {!!item.skills?.length && (
          <View style={styles.tagRow}>
            {item.skills.slice(0, compact ? 3 : 5).map((skill) => (
              <View key={skill} style={styles.tag}>
                <Text style={styles.tagText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {totalStages > 0 && accessible && !item.completed && (
          <>
            <View style={styles.progressMetaRow}>
              <Text style={styles.progressMetaText}>Project progress</Text>
              <Text style={styles.progressMetaText}>{stageProgress}%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${stageProgress}%` }]}
              />
            </View>
          </>
        )}

        {!accessible && lockReason ? (
          <Text style={styles.lockReason}>🔒 {lockReason}</Text>
        ) : item.completed ? (
          <Text style={styles.completionMessage}>
            ✅ Finished — reward claimed.
          </Text>
        ) : (
          <Text style={styles.openMessage}>
            🚀 Open the brief, build it outside the app, then mark it complete.
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.infoRow}>
            <View style={styles.xpWrap}>
              <XPBar />
            </View>

            <View style={styles.profileWrap}>
              <ProfileButton />
            </View>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <>
                <View style={styles.heroCard}>
                  <Text style={styles.heroEyebrow}>Projects</Text>
                  <Text style={styles.heroTitle}>
                    Build real things with Python.
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Projects are where your lessons turn into something more
                    serious: mini apps, utilities, games, automation scripts,
                    and practical coding challenges.
                  </Text>

                  <View style={styles.heroStatsRow}>
                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>
                        {stats.completed}
                      </Text>
                      <Text style={styles.heroStatLabel}>Completed</Text>
                    </View>

                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>
                        {stats.unlocked}
                      </Text>
                      <Text style={styles.heroStatLabel}>Unlocked</Text>
                    </View>

                    <View style={styles.heroStatPill}>
                      <Text style={styles.heroStatNumber}>{stats.locked}</Text>
                      <Text style={styles.heroStatLabel}>Locked</Text>
                    </View>
                  </View>

                  <View style={styles.secondaryBanner}>
                    <Text style={styles.secondaryBannerTitle}>
                      Skill level: {userSkillLevel}
                    </Text>
                    <Text style={styles.secondaryBannerText}>
                      {userSkillLevel === "Beginner"
                        ? beginnerGateRemaining > 0
                          ? `Complete ${beginnerGateRemaining} more lesson${beginnerGateRemaining === 1 ? "" : "s"} to unlock the full Projects track.`
                          : "You have unlocked the full Projects track."
                        : "Your skill level already gives access to higher-tier projects."}
                    </Text>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recommended for you</Text>
                  <Text style={styles.sectionSubtitle}>
                    Best next wins based on access and progress
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recommendedRow}
                >
                  {recommendedProjects.map((project) =>
                    renderProjectCard(project, true),
                  )}
                </ScrollView>

                <View style={styles.filtersRow}>
                  {(["all", "open", "completed", "locked"] as FilterMode[]).map(
                    (mode) => (
                      <Pressable
                        key={mode}
                        style={[
                          styles.filterChip,
                          filter === mode && styles.filterChipActive,
                        ]}
                        onPress={() => setFilter(mode)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            filter === mode && styles.filterChipTextActive,
                          ]}
                        >
                          {mode === "all"
                            ? "All"
                            : mode === "open"
                              ? "Open"
                              : mode === "completed"
                                ? "Completed"
                                : "Locked"}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Project Library</Text>
                  <Text style={styles.sectionSubtitle}>
                    Browse by category and build at your own pace
                  </Text>
                </View>
              </>
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{section.title}</Text>
                <Text style={styles.categoryCount}>
                  {section.data.length} project
                  {section.data.length === 1 ? "" : "s"}
                </Text>
              </View>
            )}
            renderItem={({ item }) => renderProjectCard(item)}
          />
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
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  listContent: {
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
    color: "#6b7280",
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
    color: "#4b5563",
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
    color: "#6b7280",
    fontWeight: "700",
  },

  secondaryBanner: {
    marginTop: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 12,
  },

  secondaryBannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#312E81",
  },

  secondaryBannerText: {
    marginTop: 6,
    fontSize: 12,
    color: "#4338CA",
    lineHeight: 18,
    fontWeight: "600",
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 13,
  },

  recommendedRow: {
    paddingBottom: 10,
    paddingRight: 6,
  },

  recommendedCard: {
    width: 290,
    marginRight: 12,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  lockedCard: {
    backgroundColor: "#F3F4F6",
    opacity: 0.9,
  },

  completedCard: {
    backgroundColor: "#ECFDF3",
  },

  categoryHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  categoryCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  titleWrap: {
    flex: 1,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  desc: {
    fontSize: 13,
    color: "#555",
    marginTop: 6,
    lineHeight: 18,
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  openPill: {
    backgroundColor: "#E0F2FE",
  },

  donePill: {
    backgroundColor: "#DCFCE7",
  },

  lockedPill: {
    backgroundColor: "#E5E7EB",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  openText: {
    color: "#0369A1",
  },

  doneText: {
    color: "#166534",
  },

  lockedText: {
    color: "#6B7280",
  },

  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  metaChip: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },

  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },

  metaValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },

  tag: {
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 6,
    marginTop: 6,
  },

  tagText: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "700",
  },

  progressMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },

  progressTrack: {
    marginTop: 8,
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

  lockReason: {
    marginTop: 12,
    color: "#B42318",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 18,
  },

  completionMessage: {
    marginTop: 12,
    color: "#15803D",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 18,
  },

  openMessage: {
    marginTop: 12,
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 18,
  },

  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
    marginTop: 4,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    marginBottom: 8,
  },

  filterChipActive: {
    backgroundColor: "#6C63FF",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4B5563",
  },

  filterChipTextActive: {
    color: "#fff",
  },
});
