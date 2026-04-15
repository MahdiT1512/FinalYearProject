// context/ProjectContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import projectsData from "../data/projects.json";
import { db } from "../../firebase/config";
import { XPContext } from "./XPContext";
import { useAuth } from "./AuthContext";

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";
export type ProjectDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type ProjectCategory =
  | "CLI Apps"
  | "Logic Builders"
  | "Automation"
  | "Data Practice"
  | "Games"
  | "Utilities";

export type ProjectStage = {
  id: string;
  label: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  xp: number;
  requiredSkillLevel?: SkillLevel[];
  completed?: boolean;

  category?: ProjectCategory;
  difficulty?: ProjectDifficulty;
  estimatedMinutes?: number;
  skills?: string[];
  goals?: string[];
  steps?: string[];
  deliverables?: string[];
  starterTips?: string[];
  stages?: ProjectStage[];
  awardTitle?: string | null;
};

export type ProjectProgress = {
  completedStages: string[];
  reflection: string;
  startedAt?: number | null;
  completedAt?: number | null;
};

type ProjectsContextType = {
  projects: Project[];
  getProjectById: (id: string) => Project | undefined;
  getProjectProgress: (id: string) => ProjectProgress;
  getRecommendedProjects: (limit?: number) => Project[];
  getProjectsByCategory: () => Record<string, Project[]>;
  isAccessible: (
    project: Project,
    skillLevelOverride?: SkillLevel,
    completedLessonsCountOverride?: number,
  ) => boolean;
  getProjectLockReason: (
    project: Project,
    skillLevelOverride?: SkillLevel,
    completedLessonsCountOverride?: number,
  ) => string | null;
  toggleProjectStage: (
    projectId: string,
    stageId: string,
    completed: boolean,
  ) => Promise<void>;
  saveProjectReflection: (
    projectId: string,
    reflection: string,
  ) => Promise<void>;
  markProjectDone: (id: string) => Promise<{
    xpEarned: number;
    unlockedTitle?: string | null;
  }>;
  resetAllProjects: () => Promise<void>;
};

export const ProjectsContext = createContext<ProjectsContextType>({
  projects: [],
  getProjectById: () => undefined,
  getProjectProgress: () => ({
    completedStages: [],
    reflection: "",
    startedAt: null,
    completedAt: null,
  }),
  getRecommendedProjects: () => [],
  getProjectsByCategory: () => ({}),
  isAccessible: () => false,
  getProjectLockReason: () => null,
  toggleProjectStage: async () => {},
  saveProjectReflection: async () => {},
  markProjectDone: async () => ({
    xpEarned: 0,
    unlockedTitle: null,
  }),
  resetAllProjects: async () => {},
});

type FirestoreProjectProgressMap = Record<string, ProjectProgress>;

const defaultProgress = (): ProjectProgress => ({
  completedStages: [],
  reflection: "",
  startedAt: null,
  completedAt: null,
});

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { userSkillLevel, completedLessons } = useContext(XPContext);

  const [projects, setProjects] = useState<Project[]>(
    (projectsData as Project[]).map((p) => ({
      ...p,
      completed: false,
    })),
  );

  const [projectProgressMap, setProjectProgressMap] =
    useState<FirestoreProjectProgressMap>({});

  useEffect(() => {
    if (!user) {
      setProjects(
        (projectsData as Project[]).map((p) => ({
          ...p,
          completed: false,
        })),
      );
      setProjectProgressMap({});
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setProjects(
          (projectsData as Project[]).map((p) => ({
            ...p,
            completed: false,
          })),
        );
        setProjectProgressMap({});
        return;
      }

      const data = snap.data();
      const completedProjects: string[] = data.completedProjects ?? [];
      const projectProgress: FirestoreProjectProgressMap =
        data.projectProgress ?? {};

      setProjectProgressMap(projectProgress);

      setProjects(
        (projectsData as Project[]).map((p) => ({
          ...p,
          completed: completedProjects.includes(p.id),
        })),
      );
    });

    return unsubscribe;
  }, [user]);

  const getProjectById = (id: string) => projects.find((p) => p.id === id);

  const getProjectProgress = (id: string): ProjectProgress => {
    return projectProgressMap[id] ?? defaultProgress();
  };

  const isAccessible = (
    project: Project,
    skillLevelOverride?: SkillLevel,
    completedLessonsCountOverride?: number,
  ) => {
    const activeSkillLevel = skillLevelOverride ?? userSkillLevel;
    const lessonCount =
      completedLessonsCountOverride ?? completedLessons.length;

    if (
      project.requiredSkillLevel &&
      !project.requiredSkillLevel.includes(activeSkillLevel)
    ) {
      return false;
    }

    if (project.id === "proj-0") return true;

    if (activeSkillLevel === "Beginner" && lessonCount < 3) {
      return false;
    }

    return true;
  };

  const getProjectLockReason = (
    project: Project,
    skillLevelOverride?: SkillLevel,
    completedLessonsCountOverride?: number,
  ): string | null => {
    const activeSkillLevel = skillLevelOverride ?? userSkillLevel;
    const lessonCount =
      completedLessonsCountOverride ?? completedLessons.length;

    if (
      project.requiredSkillLevel &&
      !project.requiredSkillLevel.includes(activeSkillLevel)
    ) {
      return `Requires skill level: ${project.requiredSkillLevel.join(", ")}`;
    }

    if (
      project.id !== "proj-0" &&
      activeSkillLevel === "Beginner" &&
      lessonCount < 3
    ) {
      const remaining = 3 - lessonCount;
      return `Complete ${remaining} more lesson${
        remaining === 1 ? "" : "s"
      } in Learn to unlock this project`;
    }

    return null;
  };

  const getRecommendedProjects = (limit: number = 3) => {
    const ranked = [...projects].sort((a, b) => {
      const aAccessible = isAccessible(a) ? 1 : 0;
      const bAccessible = isAccessible(b) ? 1 : 0;

      if (bAccessible !== aAccessible) return bAccessible - aAccessible;
      if (Number(!!a.completed) !== Number(!!b.completed)) {
        return Number(!!a.completed) - Number(!!b.completed);
      }

      const aProgress = getProjectProgress(a.id);
      const bProgress = getProjectProgress(b.id);

      const aStageCount = a.stages?.length ?? 0;
      const bStageCount = b.stages?.length ?? 0;

      const aRatio =
        aStageCount > 0 ? aProgress.completedStages.length / aStageCount : 0;
      const bRatio =
        bStageCount > 0 ? bProgress.completedStages.length / bStageCount : 0;

      if (bRatio !== aRatio) return bRatio - aRatio;

      return (a.estimatedMinutes ?? 999) - (b.estimatedMinutes ?? 999);
    });

    return ranked.slice(0, limit);
  };

  const getProjectsByCategory = () => {
    const grouped: Record<string, Project[]> = {};

    for (const project of projects) {
      const category = project.category ?? "Other";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(project);
    }

    return grouped;
  };

  const toggleProjectStage = async (
    projectId: string,
    stageId: string,
    completed: boolean,
  ) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const projectProgress: FirestoreProjectProgressMap =
        data.projectProgress ?? {};
      const existing = projectProgress[projectId] ?? defaultProgress();

      const nextStages = completed
        ? Array.from(new Set([...(existing.completedStages ?? []), stageId]))
        : (existing.completedStages ?? []).filter((id) => id !== stageId);

      tx.update(userRef, {
        projectProgress: {
          ...projectProgress,
          [projectId]: {
            ...existing,
            completedStages: nextStages,
            startedAt: existing.startedAt ?? Date.now(),
          },
        },
      });
    });
  };

  const saveProjectReflection = async (
    projectId: string,
    reflection: string,
  ) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const projectProgress: FirestoreProjectProgressMap =
        data.projectProgress ?? {};
      const existing = projectProgress[projectId] ?? defaultProgress();

      tx.update(userRef, {
        projectProgress: {
          ...projectProgress,
          [projectId]: {
            ...existing,
            reflection,
            startedAt: existing.startedAt ?? Date.now(),
          },
        },
      });
    });
  };

  const markProjectDone = async (id: string) => {
    if (!user) {
      return {
        xpEarned: 0,
        unlockedTitle: null,
      };
    }

    const project = projects.find((p) => p.id === id);
    if (!project) {
      return {
        xpEarned: 0,
        unlockedTitle: null,
      };
    }

    const userRef = doc(db, "users", user.uid);
    let xpEarned = 0;
    let unlockedTitle: string | null = null;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const completedProjects: string[] = data.completedProjects ?? [];
      const projectProgress: FirestoreProjectProgressMap =
        data.projectProgress ?? {};
      const earnedProjectTitles: string[] = data.earnedProjectTitles ?? [];
      const unlockedTitles: string[] = data.unlockedTitles ?? [];

      if (completedProjects.includes(id)) {
        xpEarned = 0;
        unlockedTitle = null;
        return;
      }

      const existingProgress = projectProgress[id] ?? defaultProgress();

      const currentXP = data.xp ?? 0;
      const currentLevel = data.level ?? 1;
      const currentAllTimeXP = data.allTimeXP ?? 0;
      const currentWeeklyXP = data.weeklyXP ?? 0;
      const currentMonthlyXP = data.monthlyXP ?? 0;

      let totalXP = currentXP + project.xp;
      let newLevel = currentLevel;

      if (totalXP >= 100) {
        const levelIncrease = Math.floor(totalXP / 100);
        newLevel += levelIncrease;
        totalXP = totalXP % 100;
      }

      const nextEarnedProjectTitles =
        project.awardTitle && !earnedProjectTitles.includes(project.awardTitle)
          ? [...earnedProjectTitles, project.awardTitle]
          : earnedProjectTitles;

      const nextUnlockedTitles =
        project.awardTitle && !unlockedTitles.includes(project.awardTitle)
          ? [...unlockedTitles, project.awardTitle]
          : unlockedTitles;

      xpEarned = project.xp;
      unlockedTitle =
        project.awardTitle && !unlockedTitles.includes(project.awardTitle)
          ? project.awardTitle
          : null;

      tx.update(userRef, {
        completedProjects: [...completedProjects, id],
        projectProgress: {
          ...projectProgress,
          [id]: {
            ...existingProgress,
            startedAt: existingProgress.startedAt ?? Date.now(),
            completedAt: Date.now(),
          },
        },
        earnedProjectTitles: nextEarnedProjectTitles,
        unlockedTitles: nextUnlockedTitles,
        xp: totalXP,
        level: newLevel,
        allTimeXP: currentAllTimeXP + project.xp,
        weeklyXP: currentWeeklyXP + project.xp,
        monthlyXP: currentMonthlyXP + project.xp,
      });
    });

    return {
      xpEarned,
      unlockedTitle,
    };
  };

  const resetAllProjects = async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;

      tx.update(userRef, {
        completedProjects: [],
        projectProgress: {},
        earnedProjectTitles: [],
      });
    });
  };

  const value = useMemo(
    () => ({
      projects,
      getProjectById,
      getProjectProgress,
      getRecommendedProjects,
      getProjectsByCategory,
      isAccessible,
      getProjectLockReason,
      toggleProjectStage,
      saveProjectReflection,
      markProjectDone,
      resetAllProjects,
    }),
    [projects, projectProgressMap, userSkillLevel, completedLessons],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};
