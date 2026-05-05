import React, { useContext, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ProjectsContext } from "../context/ProjectContext";
import { XPContext } from "../context/XPContext";
import { useDailyGoals } from "../context/dailyGoalsContext";
import { useSessionSummary } from "../context/SessionSummaryContext";
import XPBar from "../Components/common/XPBar";

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

//This screen is the basis of all project brief and detail screens, allowing for users
//to mark milestones and make reflections on their projects
export default function ProjectDetail() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();

  const { userSkillLevel, completedLessons } = useContext(XPContext);
  const { recordProjectComplete } = useDailyGoals();
  const { showSessionSummary } = useSessionSummary();

  const {
    getProjectById,
    getProjectProgress,
    markProjectDone,
    isAccessible,
    getProjectLockReason,
    toggleProjectStage,
    saveProjectReflection,
  } = useContext(ProjectsContext);

  const project = getProjectById(projectId);
  const progress = project ? getProjectProgress(project.id) : null;
  const [reflection, setReflection] = useState(progress?.reflection ?? "");
  const [savingReflection, setSavingReflection] = useState(false);
  const [finishingProject, setFinishingProject] = useState(false);

  useEffect(() => {
    setReflection(progress?.reflection ?? "");
  }, [progress?.reflection]);

  //Ensures that the user can access the selected project
  const accessible = project
    ? isAccessible(project, userSkillLevel, completedLessons.length)
    : false;

  const lockReason = project
    ? getProjectLockReason(project, userSkillLevel, completedLessons.length)
    : null;

  const difficultyBadgeColor = useMemo(
    () => difficultyColor(project?.difficulty),
    [project?.difficulty],
  );

  const totalStages = project?.stages?.length ?? 0;
  const completedStageCount = progress?.completedStages.length ?? 0;
  const stageProgress =
    totalStages > 0 ? Math.round((completedStageCount / totalStages) * 100) : 0;

  //Ensures that all project stages or milestones have been ticked off before user can get
  //the XP reward for marking as complete
  const canMarkComplete =
    !!project &&
    accessible &&
    !project.completed &&
    (totalStages === 0 || completedStageCount === totalStages);

  if (!project || !progress) {
    return (
      <SafeAreaView style={styles.missingWrap}>
        <Text style={styles.missingText}>Project not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallbackBtn}>
          <Text style={styles.backFallbackText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  //Saves the user's notes without marking the project as completed
  const handleSaveReflection = async () => {
    try {
      setSavingReflection(true);
      await saveProjectReflection(project.id, reflection.trim());
      Alert.alert("Saved", "Your project notes were saved.");
    } finally {
      setSavingReflection(false);
    }
  };

  //Marks the project as complete if no error is experienced
  const handleCompleteProject = async () => {
    if (!canMarkComplete || !project) return;

    try {
      setFinishingProject(true);

      await markProjectDone(project.id);
      await recordProjectComplete(project.xp);

      showSessionSummary(
        {
          title: project.name,
          xpEarned: project.xp,
          accuracy: totalStages > 0 ? stageProgress : 100,
          streakPeak: totalStages > 0 ? completedStageCount : 1,
          improvedArea: "Project work",
          weakestArea: reflection.trim() ? undefined : "Reflection notes",
          unlocked: project.awardTitle ? [project.awardTitle] : [],
        },
        {
          onClose: () => {
            router.back();
          },
        },
      );
    } catch {
      Alert.alert(
        "Project failed",
        "Could not complete this project right now.",
      );
    } finally {
      setFinishingProject(false);
    }
  };

  return (
    <LinearGradient colors={["#A0E7E5", "#FFAEBC"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Pressable style={styles.close} onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <XPBar />

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Project Brief</Text>
            <Text style={styles.title}>{project.name}</Text>
            <Text style={styles.description}>{project.description}</Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>XP Reward</Text>
                <Text style={styles.metaValue}>{project.xp}</Text>
              </View>

              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>Estimated Time</Text>
                <Text style={styles.metaValue}>
                  {formatMinutes(project.estimatedMinutes)}
                </Text>
              </View>

              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>Difficulty</Text>
                <Text
                  style={[styles.metaValue, { color: difficultyBadgeColor }]}
                >
                  {project.difficulty ?? "Beginner"}
                </Text>
              </View>
            </View>

            {!!project.awardTitle && (
              <View style={styles.titleRewardPill}>
                <Text style={styles.titleRewardText}>
                  🏷️ Title reward: {project.awardTitle}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.statusBanner,
                project.completed
                  ? styles.statusBannerDone
                  : accessible
                    ? styles.statusBannerOpen
                    : styles.statusBannerLocked,
              ]}
            >
              <Text
                style={[
                  styles.statusBannerText,
                  project.completed
                    ? styles.statusBannerDoneText
                    : accessible
                      ? styles.statusBannerOpenText
                      : styles.statusBannerLockedText,
                ]}
              >
                {project.completed
                  ? "✅ Already completed"
                  : accessible
                    ? "🚀 Ready to build"
                    : `🔒 ${lockReason ?? "Locked"}`}
              </Text>
            </View>
          </View>

          {!!project.skills?.length && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Skills & Concepts</Text>
              <View style={styles.tagRow}>
                {project.skills.map((skill) => (
                  <View key={skill} style={styles.tag}>
                    <Text style={styles.tagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!project.goals?.length && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Goals</Text>
              {project.goals.map((goal, index) => (
                <Text key={`${project.id}-goal-${index}`} style={styles.bullet}>
                  • {goal}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructions}>
              {project.instructions || "No instructions available yet."}
            </Text>
          </View>

          {!!project.steps?.length && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recommended First Steps</Text>
              {project.steps.map((step, index) => (
                <View
                  key={`${project.id}-step-${index}`}
                  style={styles.stepRow}
                >
                  <View style={styles.stepNumberWrap}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {!!project.deliverables?.length && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Deliverables</Text>
              {project.deliverables.map((item, index) => (
                <Text
                  key={`${project.id}-deliverable-${index}`}
                  style={styles.bullet}
                >
                  • {item}
                </Text>
              ))}
            </View>
          )}

          {!!project.starterTips?.length && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Starter Tips</Text>
              {project.starterTips.map((tip, index) => (
                <Text key={`${project.id}-tip-${index}`} style={styles.tipText}>
                  💡 {tip}
                </Text>
              ))}
            </View>
          )}

          {!!project.stages?.length && (
            <View style={styles.card}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.sectionTitle}>Milestones</Text>
                <Text style={styles.progressHeaderText}>{stageProgress}%</Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${stageProgress}%` }]}
                />
              </View>

              {project.stages.map((stage) => {
                const done = progress.completedStages.includes(stage.id);

                return (
                  <Pressable
                    key={stage.id}
                    style={[styles.stageRow, done && styles.stageRowDone]}
                    disabled={!accessible || project.completed}
                    onPress={() =>
                      toggleProjectStage(project.id, stage.id, !done)
                    }
                  >
                    <View
                      style={[styles.stageCheck, done && styles.stageCheckDone]}
                    >
                      <Text style={styles.stageCheckText}>
                        {done ? "✓" : ""}
                      </Text>
                    </View>

                    <Text
                      style={[styles.stageLabel, done && styles.stageLabelDone]}
                    >
                      {stage.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Build Notes</Text>
            <Text style={styles.notesHint}>
              Reflect on what you've built so far! What did you find difficult
              and what skills do you think you've gained!
            </Text>

            <TextInput
              style={styles.notesInput}
              multiline
              value={reflection}
              onChangeText={setReflection}
              placeholder="Example: I used input(), conditionals, and a function to calculate totals..."
              textAlignVertical="top"
              editable={accessible && !project.completed}
            />

            {!project.completed && accessible && (
              <Pressable
                style={styles.notesButton}
                onPress={handleSaveReflection}
              >
                <Text style={styles.notesButtonText}>
                  {savingReflection ? "Saving..." : "Save Notes"}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.footerCard}>
            {!project.completed && accessible && (
              <>
                <Text style={styles.footerTitle}>Finish outside the app</Text>
                <Text style={styles.footerText}>
                  Build this project in a suitable code environment such as a
                  code editor on a PC like a laptop or desktop. Hit the
                  milestones above to mark project as complete and earn your XP
                  reward!
                </Text>

                <Pressable
                  style={[
                    styles.completeBtn,
                    (!canMarkComplete || finishingProject) &&
                      styles.completeBtnDisabled,
                  ]}
                  disabled={!canMarkComplete || finishingProject}
                  onPress={handleCompleteProject}
                >
                  <Text style={styles.completeText}>
                    {finishingProject
                      ? "Completing..."
                      : canMarkComplete
                        ? `Mark Project Complete (+${project.xp} XP)`
                        : "Complete all milestones first"}
                  </Text>
                </Pressable>
              </>
            )}

            {project.completed && (
              <>
                <Text style={styles.footerTitle}>Project completed</Text>
                <Text style={styles.completedText}>
                  ✅ This challenge is already done. Nice work.
                </Text>
              </>
            )}

            {!accessible && (
              <>
                <Text style={styles.footerTitle}>Locked for now</Text>
                <Text style={styles.lockText}>
                  {lockReason ?? "You have not unlocked this project yet."}
                </Text>
              </>
            )}
          </View>
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
    padding: 18,
  },

  missingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },

  missingText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  backFallbackBtn: {
    marginTop: 16,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backFallbackText: {
    color: "#fff",
    fontWeight: "800",
  },

  close: {
    alignSelf: "flex-end",
    backgroundColor: "#FF6B6B",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  closeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    marginTop: 6,
  },

  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
  },

  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
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
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  titleRewardPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  titleRewardText: {
    color: "#4338CA",
    fontSize: 12,
    fontWeight: "800",
  },

  statusBanner: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
  },

  statusBannerOpen: {
    backgroundColor: "#E0F2FE",
  },

  statusBannerDone: {
    backgroundColor: "#DCFCE7",
  },

  statusBannerLocked: {
    backgroundColor: "#FEE4E2",
  },

  statusBannerText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },

  statusBannerOpenText: {
    color: "#075985",
  },

  statusBannerDoneText: {
    color: "#166534",
  },

  statusBannerLockedText: {
    color: "#B42318",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  footerCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },

  instructions: {
    fontSize: 15,
    lineHeight: 23,
    color: "#444",
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  tag: {
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },

  tagText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 12,
  },

  bullet: {
    fontSize: 15,
    lineHeight: 23,
    color: "#444",
    marginBottom: 8,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  stepNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },

  stepNumber: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    color: "#444",
  },

  tipText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#444",
    marginBottom: 10,
  },

  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6C63FF",
  },

  progressTrack: {
    marginBottom: 14,
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

  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  stageRowDone: {
    opacity: 0.95,
  },

  stageCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#fff",
  },

  stageCheckDone: {
    backgroundColor: "#12B76A",
    borderColor: "#12B76A",
  },

  stageCheckText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  stageLabel: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontWeight: "700",
  },

  stageLabelDone: {
    color: "#15803D",
  },

  notesHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
    marginBottom: 10,
  },

  notesInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 14,
    fontSize: 14,
    color: "#111827",
  },

  notesButton: {
    marginTop: 12,
    backgroundColor: "#6C63FF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  notesButtonText: {
    color: "#fff",
    fontWeight: "800",
  },

  footerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  footerText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
  },

  completeBtn: {
    marginTop: 18,
    backgroundColor: "#FFB703",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  completeBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },

  completeText: {
    fontWeight: "900",
    color: "#111827",
  },

  completedText: {
    marginTop: 8,
    color: "#15803D",
    fontWeight: "800",
    fontSize: 14,
  },

  lockText: {
    marginTop: 8,
    color: "#B42318",
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 20,
  },
});
